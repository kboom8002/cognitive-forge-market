'use client';
/**
 * src/components/quest-hero.tsx
 * Today's Quest 실시간 섹션 — SDD-12 §4
 *
 * - Supabase Realtime 구독으로 quest_board INSERT 이벤트 수신
 * - 클라이언트 사이드 마감 카운트다운 타이머 (1초 갱신)
 * - 초기 데이터는 props(서버 렌더링)에서 수신, Realtime으로 업데이트
 */
import { useEffect, useState, useCallback } from 'react';
import { supabaseClient } from '@/lib/supabase';
import type { QuestBoard } from '@/types/database';

// ── props 타입 ────────────────────────────────────────────────
interface QuestHeroProps {
  /** 서버에서 패치한 초기 퀘스트 (null이면 스켈레톤 표시) */
  initialQuest: QuestBoard | null;
}

// ── 카운트다운 문자열 계산 ──────────────────────────────────────
function calcCountdown(deadlineAt: string | undefined): string {
  if (!deadlineAt) return '';
  const diff = new Date(deadlineAt).getTime() - Date.now();
  if (diff <= 0) return '마감됨';
  const days  = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins  = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const secs  = Math.floor((diff % (1000 * 60)) / 1000);
  if (days  > 0) return `${days}일 ${hours}시간 ${mins}분`;
  if (hours > 0) return `${hours}시간 ${mins}분 ${secs}초`;
  return `${mins}분 ${secs}초`;
}

// ─────────────────────────────────────────────────────────────
export function QuestHero({ initialQuest }: QuestHeroProps) {
  const [quest, setQuest]         = useState<QuestBoard | null>(initialQuest);
  const [countdown, setCountdown] = useState<string>('');
  const [isNew, setIsNew]         = useState(false); // 새 퀘스트 플래시 효과

  // ── 카운트다운 타이머 ──────────────────────────────────────
  const updateCountdown = useCallback(() => {
    if (quest?.deadline_at) {
      setCountdown(calcCountdown(quest.deadline_at));
    }
  }, [quest?.deadline_at]);

  useEffect(() => {
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [updateCountdown]);

  // ── Supabase Realtime 구독 ─────────────────────────────────
  useEffect(() => {
    const channel = supabaseClient
      .channel('quest-board-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'quest_board' },
        (payload) => {
          const newQuest = payload.new as QuestBoard;
          setQuest(newQuest);
          setIsNew(true);
          setTimeout(() => setIsNew(false), 3000); // 3초 후 플래시 종료
        }
      )
      .subscribe();

    return () => {
      void supabaseClient.removeChannel(channel);
    };
  }, []);

  // ── 스켈레톤 (데이터 없을 때) ──────────────────────────────
  if (!quest) {
    return <QuestHeroSkeleton />;
  }

  const isExpired = quest.deadline_at
    ? new Date(quest.deadline_at).getTime() <= Date.now()
    : false;

  return (
    <div
      className={`
        relative rounded-3xl border overflow-hidden
        transition-all duration-500
        ${isNew
          ? 'border-amber-400/40 bg-amber-900/10 shadow-lg shadow-amber-900/20'
          : 'border-violet-500/20 bg-white/[0.03]'
        }
      `}
      aria-label="Today's Quest 섹션"
    >
      {/* 새 퀘스트 알림 배너 */}
      {isNew && (
        <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
      )}

      {/* 내부 배경 글로우 */}
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-violet-600/10 blur-3xl rounded-full pointer-events-none" aria-hidden="true" />

      <div className="relative p-8 md:p-10">
        {/* 뉴 퀘스트 토스트 */}
        {isNew && (
          <div className="mb-4 inline-flex items-center gap-2 text-xs font-bold text-amber-300 bg-amber-400/10 border border-amber-400/20 px-3 py-1.5 rounded-full animate-pulse">
            ✨ 새 퀘스트 등록됨!
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center gap-8">
          <div className="flex-1 min-w-0">
            {/* 대상 도서 */}
            {quest.target_book_title && (
              <div className="text-sm text-slate-400 mb-2 font-medium truncate">
                🎯 대상 도서:{' '}
                <span className="text-slate-200">{quest.target_book_title}</span>
              </div>
            )}

            {/* 퀘스트 제목 */}
            <h2 className="text-xl md:text-2xl font-black text-white leading-tight mb-5">
              {quest.title}
            </h2>

            <div className="flex flex-wrap items-center gap-3">
              {/* PoK 보상 */}
              <div
                className="flex items-center gap-2 bg-amber-400/10 border border-amber-400/20 px-4 py-2 rounded-xl"
                aria-label={`보상 ${quest.reward_pok.toLocaleString()} PoK`}
              >
                <span className="text-amber-400 text-lg" aria-hidden="true">🏆</span>
                <div>
                  <div className="text-xs text-amber-400/70 font-semibold">보상 PoK</div>
                  <div className="text-amber-300 font-black text-lg leading-none">
                    {quest.reward_pok.toLocaleString()} PoK
                  </div>
                </div>
              </div>

              {/* 카운트다운 타이머 */}
              {quest.deadline_at && (
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border
                    ${isExpired
                      ? 'bg-red-900/20 border-red-500/20'
                      : 'bg-white/5 border-white/10'
                    }`}
                  aria-label={isExpired ? '마감됨' : `마감까지 ${countdown}`}
                >
                  <span className={isExpired ? 'text-red-400' : 'text-slate-400'} aria-hidden="true">⏱</span>
                  <div>
                    <div className={`text-xs font-semibold ${isExpired ? 'text-red-400/70' : 'text-slate-500'}`}>
                      {isExpired ? '마감됨' : '마감까지'}
                    </div>
                    {!isExpired && (
                      <div className="text-white font-bold leading-none font-mono tabular-nums">
                        {countdown}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* CTA 버튼 */}
          {!isExpired && (
            <a
              href={`${process.env.NEXT_PUBLIC_FORGE_OS_URL ?? 'http://localhost:3000'}/studio`}
              className="flex-shrink-0 inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-bold px-6 py-4 rounded-2xl transition-all hover:scale-105 hover:shadow-lg hover:shadow-violet-900/50 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-transparent"
              id="quest-hero-cta"
            >
              퀘스트 도전하기
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 스켈레톤 컴포넌트 ─────────────────────────────────────────
function QuestHeroSkeleton() {
  return (
    <div
      className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-8 md:p-10 animate-pulse"
      aria-label="퀘스트 로딩 중"
      role="status"
    >
      <div className="flex flex-col md:flex-row md:items-center gap-8">
        <div className="flex-1 space-y-4">
          <div className="h-4 bg-white/5 rounded-full w-48" />
          <div className="h-7 bg-white/5 rounded-full w-3/4" />
          <div className="h-5 bg-white/5 rounded-xl w-24" />
          <div className="flex gap-3">
            <div className="h-12 bg-white/5 rounded-xl w-32" />
            <div className="h-12 bg-white/5 rounded-xl w-32" />
          </div>
        </div>
        <div className="h-14 bg-white/5 rounded-2xl w-36" />
      </div>
    </div>
  );
}
