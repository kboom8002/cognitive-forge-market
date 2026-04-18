/**
 * src/types/telemetry.ts
 * SDD-11 §1 기준 Telemetry 이벤트 타입 정의
 *
 * BaseEvent  — phalanx-media에서 이식, 절대 수정 금지
 * MarketEvent — cognitive-forge-market 전용 신규 이벤트
 */

// ── phalanx-media 기존 이벤트 (유지 / 수정 금지) ─────────────
export type BaseEvent =
  | { type: 'page_view'; path: string }
  | { type: 'external_click'; url: string };

// ── cognitive-forge-market 신규 이벤트 (SDD-11 §1) ───────────
export type MarketEvent =
  | { type: 'pack_view';           packId: string; packTitle: string }
  | { type: 'pack_run_start';      packId: string }
  | { type: 'pack_run_complete';   packId: string; runId: string; durationMs: number }
  | { type: 'pack_run_error';      packId: string; errorType: string }
  | { type: 'author_profile_view'; authorId: string }
  | { type: 'quest_view';          questId: string };

// ── 통합 타입 ─────────────────────────────────────────────────
export type TelemetryEvent = BaseEvent | MarketEvent;
