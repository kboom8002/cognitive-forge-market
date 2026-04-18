# SDD-09: PoK Royalty System
## cognitive-forge-market

**버전:** 1.0 | **날짜:** 2026-04-17  
**파일 위치:** `src/app/api/pok-distribute/route.ts`

---

## 1. PoK란?

**PoK (Proof of Knowledge)**: Learner가 Pack을 실행(과금)할 때마다  
Builder·기여자·Author·Platform에게 자동 분배되는 **지식 지분 배당 시스템**.

---

## 2. 배당 비율

```typescript
const POK_RATIOS = {
  BUILDER: 0.40,       // 원작자 40%
  CONTRIBUTOR: 0.30,   // Fork PR 기여자 30% (collectively)
  AUTHOR: 0.20,        // Author-Tenant (원작 출판사/저자) 20%
  PLATFORM: 0.10       // 플랫폼 운영비 10%
} as const;
```

### 시각 예시 (1회 실행 = 200원 과금 시)

```
Learner 200원 결제
    ↓
PoK 배당 엔진
    ├── Builder A (원작자)     → 80원  (40%)
    ├── PR 기여자 B·C          → 60원  (30%, Fork Tree 가중 분배)
    ├── Author-Tenant (출판사) → 40원  (20%)
    └── Platform               → 20원  (10%)
```

---

## 3. API 스펙

### Request
```
POST /api/pok-distribute
Content-Type: application/json
x-internal-secret: {INTERNAL_API_SECRET}   ← 필수 인증 헤더
```

```typescript
interface PoKDistributeRequest {
  runId: string;      // run_logs의 run_id
  packId: string;     // agent_packs의 pack_id
  chargeAmount: number;  // 원 단위 (예: 200)
}
```

### Response
```typescript
interface PoKDistributeResponse {
  success: boolean;
  distributed: {
    recipient_id: string;
    role: PoKRole;
    amount_won: number;
  }[];
  total_distributed: number;
}
```

---

## 4. CONTRIBUTOR 분배 알고리즘 (Fork Tree 기반)

Fork Tree가 깊어질수록 초기 기여자가 더 높은 가중치를 받습니다.

```typescript
// src/lib/pok.ts

export async function calculateContributorShares(
  packId: string,
  contributorPool: number  // 전체 30% 해당 금액
): Promise<{ recipient_id: string; amount_won: number }[]> {
  
  // lineage_commit_tree 역추적
  const { data: pack } = await supabase
    .from('agent_packs')
    .select('lineage_commit_tree, builder_id')
    .eq('pack_id', packId)
    .single();

  const commitTree = pack?.lineage_commit_tree ?? [];

  if (commitTree.length === 0) {
    // Fork가 없으면 Builder가 CONTRIBUTOR 몫까지 수취
    return [{ recipient_id: pack!.builder_id, amount_won: contributorPool }];
  }

  // Fork Tree에서 각 기여 팩의 quality_delta 수집
  const { data: forks } = await supabase
    .from('fork_tree')
    .select('contributor_id, quality_delta, child_pack_id')
    .in('child_pack_id', commitTree);

  if (!forks || forks.length === 0) {
    return [{ recipient_id: pack!.builder_id, amount_won: contributorPool }];
  }

  // quality_delta 가중 분배
  const totalDelta = forks.reduce((sum, f) => sum + (f.quality_delta ?? 1), 0);
  return forks.map(fork => ({
    recipient_id: fork.contributor_id,
    amount_won: Math.floor(contributorPool * ((fork.quality_delta ?? 1) / totalDelta))
  }));
}
```

---

## 5. route.ts 전체 구조

```typescript
// src/app/api/pok-distribute/route.ts
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateContributorShares } from '@/lib/pok';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  // 내부 API 인증
  const secret = req.headers.get('x-internal-secret');
  if (secret !== process.env.INTERNAL_API_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { runId, packId, chargeAmount } = await req.json();

  if (!runId || !packId || !chargeAmount) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Pack 정보 조회 (Builder, Author Tenant)
  const { data: pack } = await supabase
    .from('agent_packs')
    .select('builder_id, foundation_sources(author_tenant_id), lineage_commit_tree')
    .eq('pack_id', packId)
    .single();

  if (!pack) {
    return Response.json({ error: 'Pack not found' }, { status: 404 });
  }

  // 배당 금액 계산
  const builderAmount = Math.floor(chargeAmount * 0.40);
  const contributorPool = Math.floor(chargeAmount * 0.30);
  const authorAmount = Math.floor(chargeAmount * 0.20);
  const platformAmount = chargeAmount - builderAmount - contributorPool - authorAmount;

  // CONTRIBUTOR 분배 (Fork Tree 기반)
  const contributorShares = await calculateContributorShares(packId, contributorPool);

  // pok_ledger 일괄 INSERT
  const ledgerRows = [
    {
      run_id: runId,
      recipient_id: pack.builder_id,
      role: 'BUILDER' as const,
      amount_won: builderAmount,
    },
    ...contributorShares.map(s => ({
      run_id: runId,
      recipient_id: s.recipient_id,
      role: 'CONTRIBUTOR' as const,
      amount_won: s.amount_won,
    })),
    // Author-Tenant (foundation_sources.author_tenant_id)
    ...(pack.foundation_sources?.author_tenant_id ? [{
      run_id: runId,
      recipient_id: pack.foundation_sources.author_tenant_id,
      role: 'AUTHOR' as const,
      amount_won: authorAmount,
    }] : []),
    {
      run_id: runId,
      recipient_id: process.env.PLATFORM_RECIPIENT_ID!,  // 플랫폼 수령 계정
      role: 'PLATFORM' as const,
      amount_won: platformAmount,
    }
  ];

  const { error } = await supabase.from('pok_ledger').insert(ledgerRows);

  if (error) {
    console.error('[pok-distribute] Error:', error);
    return Response.json({ error: 'Failed to distribute PoK' }, { status: 500 });
  }

  return Response.json({
    success: true,
    distributed: ledgerRows,
    total_distributed: chargeAmount
  });
}
```

---

## 6. 수익 대시보드 (Author-Tenant용)

```typescript
// /authors/dashboard에서 사용
const { data: earnings } = await supabase
  .from('pok_ledger')
  .select('amount_won, is_settled, created_at, role')
  .eq('recipient_id', userId)
  .order('created_at', { ascending: false });

const pending = earnings?.filter(e => !e.is_settled).reduce((s, e) => s + e.amount_won, 0);
const settled = earnings?.filter(e => e.is_settled).reduce((s, e) => s + e.amount_won, 0);
```

---

## 7. 월말 정산 정책 (Cron)

- `pok_ledger.is_settled = false` → 미정산 상태
- 매월 말일 `cognitive-forge-os`의 Admin이 `is_settled = true`로 일괄 업데이트 후 실제 입금 처리
- Market은 정산 상태 **표시만** 담당 (정산 실행은 OS 어드민)
