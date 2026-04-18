/**
 * src/components/scl-badge.tsx
 * SDD-08 §2 기준 SCL Verified 배지 컴포넌트
 */
import type { PackStatus } from '@/types/database';

interface SCLBadgeProps {
  status: PackStatus;
  hallucination_rate?: number;  // SCL 리포트에서 추출, 0이어야 함
  test_case_count?: number;     // 기본 1000
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_MAP = {
  sm: 'text-[10px] px-1.5 py-0.5 gap-1',
  md: 'text-xs px-2.5 py-1 gap-1.5',
  lg: 'text-sm px-3 py-1.5 gap-2',
};

const ICON_SIZE = {
  sm: 'w-2.5 h-2.5',
  md: 'w-3.5 h-3.5',
  lg: 'w-4 h-4',
};

export function SCLBadge({
  status,
  size = 'md',
  className = '',
}: SCLBadgeProps) {
  // SCL_VERIFIED / FEATURED 이외에는 렌더링하지 않음 (SDD-08 §2)
  if (!['SCL_VERIFIED', 'FEATURED'].includes(status)) return null;

  const isFeatured = status === 'FEATURED';

  return (
    <div
      className={`
        inline-flex items-center font-bold rounded-full border
        ${SIZE_MAP[size]}
        ${isFeatured
          ? 'bg-violet-950/80 border-violet-500/50 text-violet-200 shadow-[0_0_12px_rgba(124,58,237,0.4)]'
          : 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
        }
        ${className}
      `}
    >
      {/* 체크 아이콘 */}
      <svg
        className={`${ICON_SIZE[size]} flex-shrink-0`}
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        {isFeatured ? (
          // 별 아이콘 (Featured)
          <path
            d="M8 1l1.85 3.75L14 5.5l-3 2.92.71 4.13L8 10.5l-3.71 1.95.71-4.13L2 5.5l4.15-.75L8 1z"
            fill="currentColor"
          />
        ) : (
          // 체크 아이콘 (SCL_VERIFIED)
          <path
            d="M2.5 8.5l3.5 3.5 7.5-8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>

      {/* 텍스트 */}
      {isFeatured ? (
        <span>Featured · AI Verified</span>
      ) : (
        <span>AI Verified</span>
      )}
    </div>
  );
}
