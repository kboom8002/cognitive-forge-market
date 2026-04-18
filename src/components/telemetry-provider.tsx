"use client";

/**
 * src/components/telemetry-provider.tsx
 * phalanx-media 원본 이식 + SDD-11 §1 MarketEvent 확장
 *
 * 원본 로직 (page_view 추적): 보존
 * 추가:
 *  - useMarketTelemetry() 훅 내보내기 (pack_view, pack_run_start 등)
 *  - window.__cfmTrack global (non-React 컨텍스트에서도 사용 가능)
 */

import { useEffect, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { fireEvent } from "@/lib/telemetry";
import type { TelemetryEvent, MarketEvent } from "@/types/telemetry";

// ── Window 타입 augmentation (global tracker) ────────────────
declare global {
  interface Window {
    __cfmTrack?: (event: TelemetryEvent) => void;
  }
}

// ─────────────────────────────────────────────────────────────
// TelemetryProvider — Root Layout에 마운트
// phalanx-media 원본 동작(page_view) + global tracker 등록
// ─────────────────────────────────────────────────────────────
export function TelemetryProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // ── [ORIGINAL] phalanx-media 기존 로직 (수정 금지) ──────
    const vgId = searchParams.get("utm_vanguard");
    const source = searchParams.get("utm_source");
    const referrer = document.referrer || "direct";
    const userAgent = navigator.userAgent;

    const logData = {
      path: pathname,
      vanguard_id: vgId,
      source: source,
      referrer: referrer,
      user_agent: userAgent,
      timestamp: new Date().toISOString(),
    };

    // 기존 콘솔 로그 (phalanx-media 방식 유지)
    console.log("[VQCP Telemetry] Payload Captured:", logData);

    // ── [EXTENDED] SDD-11 §1 page_view 이벤트 발행 ──────────
    fireEvent({ type: "page_view", path: pathname });

  }, [pathname, searchParams]);

  // ── [EXTENDED] global tracker 등록 (SSR safe) ────────────
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.__cfmTrack = (event: TelemetryEvent) => {
        fireEvent(event);
      };
    }
    return () => {
      if (typeof window !== "undefined") {
        delete window.__cfmTrack;
      }
    };
  }, []);

  // UI-less 컴포넌트
  return null;
}

// ─────────────────────────────────────────────────────────────
// useMarketTelemetry — 클라이언트 컴포넌트에서 사용하는 훅
// SDD-11 §1 MarketEvent를 type-safe하게 발행
// ─────────────────────────────────────────────────────────────
export function useMarketTelemetry() {
  /**
   * 팩 상세 페이지 진입 시
   * @example trackPackView('pack-uuid', '계약서 분석 AI')
   */
  const trackPackView = useCallback((packId: string, packTitle: string) => {
    fireEvent({ type: "pack_view", packId, packTitle });
  }, []);

  /**
   * [Run] 버튼 클릭 시
   */
  const trackPackRunStart = useCallback((packId: string) => {
    fireEvent({ type: "pack_run_start", packId });
  }, []);

  /**
   * SSE 스트리밍 완료 시
   */
  const trackPackRunComplete = useCallback(
    (packId: string, runId: string, durationMs: number) => {
      fireEvent({ type: "pack_run_complete", packId, runId, durationMs });
    },
    []
  );

  /**
   * 실행 오류 시
   */
  const trackPackRunError = useCallback(
    (packId: string, errorType: string) => {
      fireEvent({ type: "pack_run_error", packId, errorType });
    },
    []
  );

  /**
   * Author 프로필 조회 시
   */
  const trackAuthorView = useCallback((authorId: string) => {
    fireEvent({ type: "author_profile_view", authorId });
  }, []);

  /**
   * Quest 상세 조회 시
   */
  const trackQuestView = useCallback((questId: string) => {
    fireEvent({ type: "quest_view", questId });
  }, []);

  /** 범용 이벤트 (타입 안전) */
  const track = useCallback((event: MarketEvent) => {
    fireEvent(event);
  }, []);

  return {
    trackPackView,
    trackPackRunStart,
    trackPackRunComplete,
    trackPackRunError,
    trackAuthorView,
    trackQuestView,
    track,
  };
}
