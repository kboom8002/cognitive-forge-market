/**
 * src/lib/telemetry.ts
 * SDD-11 §1 trackEvent 헬퍼
 *
 * - 클라이언트 사이드에서 호출
 * - pack_run_complete는 run_logs 연동 (Supabase 미연결 시 console.log fallback)
 * - 기본 이벤트는 traffic_logs 적재 (phalanx-media 방식 유지)
 */
import type { TelemetryEvent } from '@/types/telemetry';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Supabase REST API로 직접 INSERT (클라이언트 사이드 경량 버전)
 * @supabase/supabase-js 클라이언트 대신 fetch 사용 — Edge/Server 모두 호환
 */
async function supabaseInsert(table: string, record: Record<string, unknown>) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return; // 환경변수 미설정 시 skip
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(record),
    });
  } catch {
    // 네트워크 오류 시 무시 (telemetry는 non-blocking)
  }
}

/**
 * 이벤트 추적 메인 함수 (SDD-11 §1)
 *
 * @example
 * // 팩 뷰 이벤트
 * trackEvent({ type: 'pack_view', packId: 'xxx', packTitle: '계약서 분석 AI' });
 *
 * @example
 * // 팩 실행 완료 이벤트
 * trackEvent({ type: 'pack_run_complete', packId: 'xxx', runId: 'yyy', durationMs: 3200 });
 */
export async function trackEvent(event: TelemetryEvent): Promise<void> {
  const timestamp = new Date().toISOString();

  // ── 개발 환경 콘솔 로그 (phalanx-media 기존 방식 유지) ──────
  console.log('[CFM Telemetry]', event.type, event);

  // ── pack_run_complete → run_logs 연동 (SDD-11 §1) ───────────
  if (event.type === 'pack_run_complete') {
    await supabaseInsert('run_logs', {
      run_id: event.runId,
      pack_id: event.packId,
      duration_ms: event.durationMs,
      finished_at: timestamp,
    });
  }

  // ── traffic_logs 기본 적재 (phalanx-media 방식 유지) ─────────
  await supabaseInsert('traffic_logs', {
    event_type: event.type,
    metadata: event,
    created_at: timestamp,
    // page_view 이벤트는 path도 추출
    path: 'path' in event ? event.path : undefined,
  });
}

/**
 * 클라이언트 사이드 간편 훅용 래퍼 (fire-and-forget)
 * useEffect 내에서 await 없이 사용
 */
export function fireEvent(event: TelemetryEvent): void {
  trackEvent(event).catch(() => {
    // telemetry 오류는 UX에 영향을 주지 않음
  });
}
