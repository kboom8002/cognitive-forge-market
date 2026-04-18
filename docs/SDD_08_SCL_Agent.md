# SDD-08: SCL Agent (Market 연동 명세)
## cognitive-forge-market

**버전:** 1.0 | **날짜:** 2026-04-17

> ⚠️ **SCL 실행 주체는 `cognitive-forge-os`입니다.**  
> 이 문서는 Market이 SCL 결과(배지)를 어떻게 **표시(Display)**하는지를 정의합니다.

---

## 1. SCL이란?

**SCL (Synthetic Cohort Lab)**:  
AI 에이전트가 1,000개의 Edge-case를 자율적으로 팩에 투척하여  
환각률 0%, Output Contract 준수율 99% 이상을 검증하는 자율 스트레스 테스트.

---

## 2. SCL Verified 배지 UI

### 배지 컴포넌트

```typescript
// src/components/scl-badge.tsx
interface SCLBadgeProps {
  status: PackStatus;
  hallucination_rate?: number;    // SCL 리포트에서 추출, 0이어야 함
  test_case_count?: number;       // 기본 1000
  size?: 'sm' | 'md' | 'lg';
}

export function SCLBadge({ status, hallucination_rate, test_case_count, size = 'md' }: SCLBadgeProps) {
  if (!['SCL_VERIFIED', 'FEATURED'].includes(status)) return null;

  return (
    <div className={`scl-badge scl-badge--${size}`}>
      <span className="scl-badge__icon">✓</span>
      <span className="scl-badge__text">AI Verified</span>
    </div>
  );
}
```

### 배지 스타일 기준
| 상황 | 색상 | 텍스트 |
|:---|:---|:---|
| `SCL_VERIFIED` | `#10b981` (에메랄드) | `✓ AI Verified` |
| `FEATURED` | `#7c3aed` (보라) + `#10b981` | `⭐ Featured · AI Verified` |

---

## 3. Supabase Realtime 구독 (Market 실시간 배지 갱신)

```typescript
// src/hooks/use-scl-realtime.ts
'use client';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';

export function useSCLRealtime(onVerified: (packId: string) => void) {
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel('scl-updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'agent_packs',
        filter: 'status=eq.SCL_VERIFIED'
      }, (payload) => {
        onVerified(payload.new.pack_id);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [onVerified]);
}
```

---

## 4. Pack 상세 페이지의 SCL 리포트 표시

```
/packs/[packId]
└── SCLReportSection
    ├── "AI 검증 완료" 헤더 (초록 배경)
    ├── 테스트 케이스: 1,000건
    ├── 환각률: 0%
    ├── Output Contract 준수율: 99.8%
    └── 검증 완료일: YYYY-MM-DD
```

SCL 리포트 데이터는 `agent_packs.taskflow_blocks` 내 별도 메타데이터 필드 또는  
`agent_packs` 테이블의 확장 컬럼 (`scl_report JSONB`)으로 저장.

---

## 5. SCL 미통과 팩 접근 시 UX

`SCL_TESTING` 상태의 팩에 직접 URL 접근:
```typescript
// /packs/[packId]/page.tsx
if (pack.status === 'SCL_TESTING') {
  return (
    <div className="verification-in-progress">
      <h1>🔬 AI 검증 진행 중</h1>
      <p>이 팩은 현재 1,000건의 품질 테스트를 통과하는 중입니다.</p>
      <p>검증 완료 후 마켓에 공개됩니다.</p>
    </div>
  );
}
```
