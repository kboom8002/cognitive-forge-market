/**
 * src/lib/pok.ts
 * PoK (Proof of Knowledge) 배당 계산 엔진 — SDD-09 §4
 *
 * 배당 비율:
 *   BUILDER      40%  원작자
 *   CONTRIBUTOR  30%  Fork PR 기여자 (collectively, quality_delta 가중 분배)
 *   AUTHOR       20%  Author-Tenant (출판사/원저자)
 *   PLATFORM     10%  플랫폼 운영비
 */

import { createClient } from '@supabase/supabase-js';
import type { PoKRole } from '@/types/database';

// service_role 클라이언트 (RLS 우회, 서버 전용)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── 배당 비율 상수 (SDD-09 §2) ──────────────────────────────
export const POK_RATIOS = {
  BUILDER: 0.40,
  CONTRIBUTOR: 0.30,
  AUTHOR: 0.20,
  PLATFORM: 0.10,
} as const;

// ── 타입 정의 ──────────────────────────────────────────────
export interface PoKShare {
  recipient_id: string;
  role: PoKRole;
  amount_won: number;
}

export interface PoKDistributeResult {
  shares: PoKShare[];
  total_distributed: number;
}

// ─────────────────────────────────────────────────────────────
/**
 * CONTRIBUTOR 몫 배분 — Fork Tree 기반 quality_delta 가중 분배 (SDD-09 §4)
 *
 * Fork가 없는 팩 → Builder가 CONTRIBUTOR 몫까지 수취
 * Fork 있는 팩   → quality_delta 비율로 각 contributor에 가중 배분
 *
 * @param packId          실행된 팩 ID
 * @param contributorPool 전체 30% 해당 금액 (원)
 */
export async function calculateContributorShares(
  packId: string,
  contributorPool: number
): Promise<{ recipient_id: string; amount_won: number }[]> {

  // Pack의 lineage_commit_tree 조회
  const { data: pack } = await supabase
    .from('agent_packs')
    .select('lineage_commit_tree, builder_id')
    .eq('pack_id', packId)
    .single();

  if (!pack) {
    // Pack 자체가 없으면 빈 배열 반환 (route에서 처리)
    return [];
  }

  const commitTree: string[] = pack.lineage_commit_tree ?? [];

  // Fork 없는 Original Pack → Builder가 CONTRIBUTOR 몫 흡수
  if (commitTree.length === 0) {
    return [{ recipient_id: pack.builder_id, amount_won: contributorPool }];
  }

  // Fork Tree에서 각 기여 팩의 quality_delta 수집
  const { data: forks } = await supabase
    .from('fork_tree')
    .select('contributor_id, quality_delta, child_pack_id')
    .in('child_pack_id', commitTree);

  if (!forks || forks.length === 0) {
    // Fork Tree 데이터가 없으면 Builder 수취
    return [{ recipient_id: pack.builder_id, amount_won: contributorPool }];
  }

  // quality_delta 총합 (0 대비 안전: 최소 1)
  const totalDelta = forks.reduce((sum, f) => sum + (f.quality_delta ?? 1), 0) || 1;

  // 가중 비율로 배분 (소수점 버림 → 나머지는 첫 번째 contributor에 귀속)
  const shares = forks.map((fork) => ({
    recipient_id: fork.contributor_id as string,
    amount_won: Math.floor(contributorPool * ((fork.quality_delta ?? 1) / totalDelta)),
  }));

  // 반올림 오차 처리: 남은 금액 → 첫 번째 기여자에게 추가
  const distributed = shares.reduce((s, r) => s + r.amount_won, 0);
  const remainder = contributorPool - distributed;
  if (remainder > 0 && shares.length > 0) {
    shares[0].amount_won += remainder;
  }

  return shares;
}

// ─────────────────────────────────────────────────────────────
/**
 * PoK 전체 배당 계산
 *
 * 원자적 INSERT를 위해 pok_ledger 행 목록을 반환합니다.
 * 실제 INSERT는 route.ts 에서 수행.
 *
 * Author-Tenant null → AUTHOR 20% → PLATFORM으로 귀속 (SDD-09 §5)
 *
 * @param runId         run_logs.run_id
 * @param packId        agent_packs.pack_id
 * @param chargeAmount  과금액 (원)
 */
export async function buildPoKLedgerRows(
  runId: string,
  packId: string,
  chargeAmount: number
): Promise<{ shares: PoKShare[]; error?: string }> {

  // Pack 정보 조회 (builder_id, author_tenant_id)
  const { data: pack, error: packErr } = await supabase
    .from('agent_packs')
    .select('builder_id, foundation_sources(author_tenant_id), lineage_commit_tree')
    .eq('pack_id', packId)
    .in('status', ['SCL_VERIFIED', 'FEATURED'])
    .single();

  if (packErr || !pack) {
    return { shares: [], error: 'Pack not found or not verified' };
  }

  // 배당 금액 계산
  const builderAmount    = Math.floor(chargeAmount * POK_RATIOS.BUILDER);
  const contributorPool  = Math.floor(chargeAmount * POK_RATIOS.CONTRIBUTOR);
  const authorRaw        = Math.floor(chargeAmount * POK_RATIOS.AUTHOR);
  // PLATFORM = 잔액 (반올림 오차 흡수)
  const platformAmount   = chargeAmount - builderAmount - contributorPool - authorRaw;

  const platformId = process.env.PLATFORM_RECIPIENT_ID ?? 'platform';

  // Author-Tenant 처리: null이면 PLATFORM으로 귀속
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const foundationSrc = (pack as any).foundation_sources;
  const authorTenantId: string | null = foundationSrc?.author_tenant_id ?? null;

  const authorAmount   = authorTenantId ? authorRaw : 0;
  const finalPlatform  = authorTenantId ? platformAmount : platformAmount + authorRaw;

  // CONTRIBUTOR 분배
  const contributorShares = await calculateContributorShares(packId, contributorPool);

  // pok_ledger 행 목록 조립
  const shares: PoKShare[] = [
    {
      recipient_id: pack.builder_id,
      role: 'BUILDER',
      amount_won: builderAmount,
    },
    ...contributorShares.map((s) => ({
      recipient_id: s.recipient_id,
      role: 'CONTRIBUTOR' as PoKRole,
      amount_won: s.amount_won,
    })),
    ...(authorTenantId
      ? [{ recipient_id: authorTenantId, role: 'AUTHOR' as PoKRole, amount_won: authorAmount }]
      : []),
    {
      recipient_id: platformId,
      role: 'PLATFORM' as PoKRole,
      amount_won: finalPlatform,
    },
  ];

  return { shares };
}
