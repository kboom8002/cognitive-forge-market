'use client';
/**
 * src/components/ui-forge/RunButton.tsx
 * CTA 버튼 — SDD-05 §5
 *
 * 3가지 상태:
 *   비활성: disabled, 흐릿하게
 *   로딩:   스피너 + 진행 바 애니메이션 + 경과 시간
 *   완료:   ✅ 완료 표시
 */
import { useEffect, useState } from 'react';

interface RunButtonProps {
  label: string;
  disabled: boolean;
  isRunning: boolean;
  isDone?: boolean;
  estimatedTime?: number;   // 초
  onClick: () => void;
}

export function RunButton({ label, disabled, isRunning, isDone, estimatedTime, onClick }: RunButtonProps) {
  const [elapsed, setElapsed] = useState(0);

  // 경과 시간 카운터 (스트리밍 중)
  useEffect(() => {
    if (!isRunning) { setElapsed(0); return; }
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [isRunning]);

  // 예상 시간 대비 진행률 (100% 상한)
  const pct = estimatedTime
    ? Math.min((elapsed / estimatedTime) * 100, 95)
    : null;

  // ── 완료 상태 ────────────────────────────────────────────
  if (isDone) {
    return (
      <div className="flex items-center justify-center gap-2.5 py-4 text-emerald-400 font-semibold text-sm">
        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden="true">
          <circle cx="10" cy="10" r="8" strokeWidth="1.5" />
          <path d="M6 10.5l2.5 2.5 5.5-5.5" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        생성 완료
      </div>
    );
  }

  // ── 로딩 상태 ────────────────────────────────────────────
  if (isRunning) {
    return (
      <div className="space-y-3">
        <button
          type="button"
          disabled
          className="
            w-full flex items-center justify-center gap-3
            bg-violet-700/50 text-violet-300/80 font-bold text-base py-5 rounded-2xl
            cursor-wait opacity-80
          "
        >
          {/* 스피너 */}
          <svg
            className="w-5 h-5 animate-spin text-violet-400"
            viewBox="0 0 24 24" fill="none" aria-label="실행 중"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          AI 실행 중…
          {estimatedTime && (
            <span className="text-sm font-normal opacity-70">{elapsed}s / ~{estimatedTime}s</span>
          )}
        </button>

        {/* 진행 바 */}
        {pct !== null && (
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-600 to-violet-400 rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  // ── 기본/비활성 상태 ──────────────────────────────────────
  return (
    <button
      id="pack-run-btn"
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full flex items-center justify-center gap-3
        font-black text-lg py-5 rounded-2xl
        transition-all duration-200
        ${disabled
          ? 'bg-violet-600/30 text-violet-400/40 cursor-not-allowed'
          : 'bg-violet-600 hover:bg-violet-500 text-white hover:shadow-xl hover:shadow-violet-900/50 active:scale-[0.98]'
        }
      `}
    >
      <svg className="w-5 h-5" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M6 3.5l6 4.5-6 4.5V3.5z" />
      </svg>
      {label}
      {estimatedTime && !disabled && (
        <span className="text-sm font-normal opacity-70">약 {estimatedTime}s</span>
      )}
    </button>
  );
}
