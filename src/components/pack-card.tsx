/**
 * src/components/pack-card.tsx
 * SDD-04 §2 PackCardProps 기준 AgentPack 카드 컴포넌트
 *
 * - SCL Verified 배지: 우상단 고정 (에메랄드)
 * - Featured 배지: 우상단 고정 (보라)
 * - hover: scale(1.02) + 그림자 확장
 * - 다크 테마 glassmorphism
 */
import Link from 'next/link';
import { SCLBadge } from './scl-badge';
import type { PackStatus } from '@/types/database';

export interface PackCardProps {
  packId: string;
  title: string;           // micro_saas_ui_schema.title
  description: string;     // micro_saas_ui_schema.description
  coverEmoji?: string;     // micro_saas_ui_schema.cover_emoji
  builderName?: string;
  authorTenant?: string;   // foundation_sources.title
  sourceType?: 'BOOK' | 'EXPERT_DOC' | 'INTERNAL';
  runCount: number;
  status: PackStatus;
  isSCLVerified: boolean;
  isFeatured: boolean;
  estimatedTimeSec?: number;
  ctaLabel?: string;
}

const SOURCE_TYPE_LABEL: Record<string, string> = {
  BOOK: '📚 도서 기반',
  EXPERT_DOC: '🎓 전문가 문서',
  INTERNAL: '🏢 내부 자료',
};

export function PackCard({
  packId,
  title,
  description,
  coverEmoji = '🤖',
  builderName,
  authorTenant,
  sourceType,
  runCount,
  status,
  isFeatured,
  estimatedTimeSec,
}: PackCardProps) {
  return (
    <Link
      href={`/packs/${packId}`}
      className="group relative block"
      aria-label={`${title} AgentPack 보기`}
    >
      <article
        className={`
          relative h-full rounded-2xl border p-6 flex flex-col gap-4
          bg-white/5 backdrop-blur-sm
          transition-all duration-300 ease-out
          hover:scale-[1.02] hover:shadow-2xl
          ${isFeatured
            ? 'border-violet-500/40 hover:border-violet-400/60 hover:shadow-violet-900/40'
            : 'border-white/10 hover:border-emerald-500/30 hover:shadow-emerald-900/30'
          }
        `}
      >
        {/* ── 배지 (우상단 고정) ── */}
        <div className="absolute top-4 right-4">
          <SCLBadge status={status} size="sm" />
        </div>

        {/* ── 카드 헤더 ── */}
        <div className="flex items-start gap-4 pr-20">
          {/* 커버 이모지 */}
          <div
            className={`
              w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0
              ${isFeatured
                ? 'bg-violet-900/60 ring-1 ring-violet-500/30'
                : 'bg-slate-800/80 ring-1 ring-white/10'
              }
            `}
          >
            {coverEmoji}
          </div>

          <div className="min-w-0">
            {/* 소스 타입 */}
            {sourceType && (
              <div className="text-[11px] font-bold text-slate-400 mb-1 tracking-wide">
                {SOURCE_TYPE_LABEL[sourceType] ?? sourceType}
              </div>
            )}
            {/* pack title */}
            <h3 className="font-bold text-white text-lg leading-snug line-clamp-2 group-hover:text-violet-300 transition-colors">
              {title}
            </h3>
          </div>
        </div>

        {/* ── 설명 ── */}
        <p className="text-slate-400 text-sm leading-relaxed line-clamp-3 flex-1">
          {description}
        </p>

        {/* ── 메타 정보 ── */}
        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-white/[0.06]">
          {/* 실행 횟수 */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M6 3.5l6 4.5-6 4.5V3.5z"/>
            </svg>
            <span className="font-semibold text-slate-300">{runCount.toLocaleString()}</span>
            <span>회 실행</span>
          </div>

          {/* 예상 시간 */}
          {estimatedTimeSec && (
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true">
                <circle cx="8" cy="8" r="6.5" strokeWidth="1.5"/>
                <path d="M8 5v3.5l2 1.5" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              약 {estimatedTimeSec}s
            </div>
          )}

          {/* 저자/원천 */}
          {(authorTenant || builderName) && (
            <div className="ml-auto text-xs text-slate-500 truncate max-w-[120px]">
              by {authorTenant ?? builderName}
            </div>
          )}
        </div>

        {/* ── Hover CTA overlay ── */}
        <div className="absolute inset-x-0 bottom-0 h-12 flex items-end justify-center pb-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className={`
            text-xs font-bold px-3 py-1 rounded-full
            ${isFeatured
              ? 'bg-violet-600/90 text-white'
              : 'bg-emerald-600/90 text-white'
            }
          `}>
            팩 실행하기 →
          </div>
        </div>
      </article>
    </Link>
  );
}
