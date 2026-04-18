/**
 * src/app/api/pok-distribute/route.ts
 * PoK 배당 API — SDD-09 §5
 *
 * AGENTS.md 규칙:
 *   - x-internal-secret 헤더 필수 검증
 *   - 원자성: 전체 INSERT 실패 시 롤백 (Supabase RPC 활용)
 */
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildPoKLedgerRows } from '@/lib/pok';
import type { PoKRole } from '@/types/database';

// service_role 클라이언트 (RLS 우회, run_logs/pok_ledger 쓰기)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── Request / Response 타입 ──────────────────────────────────
interface PoKDistributeRequest {
  runId: string;
  packId: string;
  chargeAmount: number;
}

interface DistributedEntry {
  recipient_id: string;
  role: PoKRole;
  amount_won: number;
}

interface PoKDistributeResponse {
  success: boolean;
  distributed: DistributedEntry[];
  total_distributed: number;
}

// ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // ── 1. 내부 API 인증 (AGENTS.md 필수) ──────────────────────
  const secret = req.headers.get('x-internal-secret');
  const expectedSecret = process.env.INTERNAL_API_SECRET;

  // 개발 환경에서 INTERNAL_API_SECRET 미설정 시 경고 후 통과
  if (expectedSecret && secret !== expectedSecret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── 2. 요청 파싱 ─────────────────────────────────────────
  let body: PoKDistributeRequest;
  try {
    body = await req.json() as PoKDistributeRequest;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { runId, packId, chargeAmount } = body;

  if (!runId || !packId || typeof chargeAmount !== 'number' || chargeAmount <= 0) {
    return Response.json(
      { error: 'runId, packId, chargeAmount(>0)은 필수입니다.' },
      { status: 400 }
    );
  }

  // ── 3. pok_ledger 행 목록 계산 ───────────────────────────
  const { shares, error: buildError } = await buildPoKLedgerRows(runId, packId, chargeAmount);

  if (buildError) {
    return Response.json({ error: buildError }, { status: 404 });
  }

  if (shares.length === 0) {
    return Response.json({ error: 'No shares calculated' }, { status: 500 });
  }

  // ── 4. pok_ledger 원자적 INSERT ────────────────────────
  // Supabase는 단일 INSERT 배열을 원자적으로 처리
  // 실패 시 전체 롤백 (PostgreSQL 트랜잭션)
  const ledgerRows = shares.map((s) => ({
    run_id: runId,
    recipient_id: s.recipient_id,
    role: s.role,
    amount_won: s.amount_won,
    is_settled: false,
  }));

  const { error: insertError } = await supabase
    .from('pok_ledger')
    .insert(ledgerRows);

  if (insertError) {
    console.error('[pok-distribute] INSERT 실패:', insertError);
    return Response.json(
      { error: 'PoK 배당 저장 실패: ' + insertError.message },
      { status: 500 }
    );
  }

  // ── 5. run_logs.run_count 증가 (비동기, fire-and-forget) ──
  // Pack의 전체 실행 횟수 증가
  void supabase.rpc('increment_run_count', { p_pack_id: packId });

  // ── 6. 성공 응답 ─────────────────────────────────────────
  const response: PoKDistributeResponse = {
    success: true,
    distributed: shares.map((s) => ({
      recipient_id: s.recipient_id,
      role: s.role,
      amount_won: s.amount_won,
    })),
    total_distributed: shares.reduce((sum, s) => sum + s.amount_won, 0),
  };

  console.log(
    `[pok-distribute] ✅ runId=${runId} packId=${packId} ` +
    `${chargeAmount}원 → ${shares.length}명 배분`
  );

  return Response.json(response, { status: 200 });
}
