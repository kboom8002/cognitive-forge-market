/**
 * src/app/packs/page.tsx
 * AgentPack 마켓플레이스 리스트 (Server Component)
 * SDD-04 §2: 필터/정렬/페이지네이션, SCL_VERIFIED+FEATURED 만 노출
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { getMarketPacks } from '@/lib/supabase';
import { PackCard } from '@/components/pack-card';
import type { MicroSaaSUISchema } from '@/types/ui-forge';
import type { AgentPack } from '@/types/database';

export const revalidate = 30;

export const metadata: Metadata = {
  title: 'AgentPack 마켓플레이스 | Cognitive Forge Market',
  description: 'SCL Verified AI AgentPack 전체 목록. 카테고리·정렬·소스 타입별로 필터링하세요.',
};

// ── URL SearchParams 타입 ──────────────────────────────────────
interface PacksPageProps {
  searchParams: Promise<{
    category?: string;
    source_type?: string;
    sort?: string;
    page?: string;
  }>;
}

// ── 더미 데이터 (Supabase 미연결 fallback) ──────────────────────
const MOCK_PACKS_LIST: (AgentPack & { foundation_sources: { title: string; source_type: string } | null })[] = [
  { pack_id: 'mock-001', foundation_source_id: null, builder_id: 'b1', taskflow_blocks: {}, execution_proof_run_id: undefined, status: 'FEATURED', lineage_commit_tree: [], micro_saas_ui_schema: { title: '계약서 리스크 분석 AI', description: '법률 계약서를 업로드하면 8가지 관점에서 리스크를 분석합니다.', cover_emoji: '⚖️', required_inputs: [], output_format: 'MARKDOWN', cta_label: '분석 시작', estimated_time_seconds: 30 } as MicroSaaSUISchema, run_count: 1240, created_at: '2026-04-01T00:00:00Z', updated_at: '2026-04-17T00:00:00Z', foundation_sources: { title: '계약의 기술', source_type: 'BOOK' } },
  { pack_id: 'mock-002', foundation_source_id: null, builder_id: 'b2', taskflow_blocks: {}, execution_proof_run_id: undefined, status: 'SCL_VERIFIED', lineage_commit_tree: [], micro_saas_ui_schema: { title: '브랜드 스토리 생성기', description: '제품 정보를 입력하면 소셜 미디어 카피를 생성합니다.', cover_emoji: '✍️', required_inputs: [], output_format: 'MARKDOWN', cta_label: '생성 시작', estimated_time_seconds: 20 } as MicroSaaSUISchema, run_count: 842, created_at: '2026-04-05T00:00:00Z', updated_at: '2026-04-17T00:00:00Z', foundation_sources: { title: '퍼스널 브랜딩의 법칙', source_type: 'BOOK' } },
  { pack_id: 'mock-003', foundation_source_id: null, builder_id: 'b3', taskflow_blocks: {}, execution_proof_run_id: undefined, status: 'SCL_VERIFIED', lineage_commit_tree: [], micro_saas_ui_schema: { title: '성과 리뷰 작성 도우미', description: '키워드로 공정한 성과 리뷰를 작성합니다.', cover_emoji: '📊', required_inputs: [], output_format: 'MARKDOWN', cta_label: '리뷰 생성', estimated_time_seconds: 15 } as MicroSaaSUISchema, run_count: 577, created_at: '2026-04-08T00:00:00Z', updated_at: '2026-04-17T00:00:00Z', foundation_sources: { title: 'OKR 바이블', source_type: 'EXPERT_DOC' } },
  { pack_id: 'mock-004', foundation_source_id: null, builder_id: 'b4', taskflow_blocks: {}, execution_proof_run_id: undefined, status: 'SCL_VERIFIED', lineage_commit_tree: [], micro_saas_ui_schema: { title: '투자 제안서 구조화기', description: 'VC가 선호하는 투자 제안서를 자동 생성합니다.', cover_emoji: '🚀', required_inputs: [], output_format: 'MARKDOWN', cta_label: '제안서 생성', estimated_time_seconds: 45 } as MicroSaaSUISchema, run_count: 391, created_at: '2026-04-10T00:00:00Z', updated_at: '2026-04-17T00:00:00Z', foundation_sources: { title: '제로 투 원', source_type: 'BOOK' } },
  { pack_id: 'mock-005', foundation_source_id: null, builder_id: 'b5', taskflow_blocks: {}, execution_proof_run_id: undefined, status: 'SCL_VERIFIED', lineage_commit_tree: [], micro_saas_ui_schema: { title: '고객 인터뷰 분석기', description: '녹취록에서 Pain Point와 Job-to-be-Done을 추출합니다.', cover_emoji: '🎯', required_inputs: [], output_format: 'MARKDOWN', cta_label: '분석 시작', estimated_time_seconds: 25 } as MicroSaaSUISchema, run_count: 288, created_at: '2026-04-12T00:00:00Z', updated_at: '2026-04-17T00:00:00Z', foundation_sources: { title: 'The Mom Test', source_type: 'BOOK' } },
  { pack_id: 'mock-006', foundation_source_id: null, builder_id: 'b6', taskflow_blocks: {}, execution_proof_run_id: undefined, status: 'FEATURED', lineage_commit_tree: [], micro_saas_ui_schema: { title: '회의록 → 액션 아이템 변환기', description: '회의록에서 담당자·기한별 액션 아이템을 추출합니다.', cover_emoji: '📋', required_inputs: [], output_format: 'MARKDOWN', cta_label: '추출 시작', estimated_time_seconds: 10 } as MicroSaaSUISchema, run_count: 213, created_at: '2026-04-14T00:00:00Z', updated_at: '2026-04-17T00:00:00Z', foundation_sources: { title: 'Getting Things Done', source_type: 'BOOK' } },
  { pack_id: 'mock-007', foundation_source_id: null, builder_id: 'b7', taskflow_blocks: {}, execution_proof_run_id: undefined, status: 'SCL_VERIFIED', lineage_commit_tree: [], micro_saas_ui_schema: { title: 'KPI 대시보드 설계 도우미', description: '비즈니스 목표를 입력하면 측정 가능한 KPI 트리를 생성합니다.', cover_emoji: '📈', required_inputs: [], output_format: 'MARKDOWN', cta_label: 'KPI 설계 시작', estimated_time_seconds: 20 } as MicroSaaSUISchema, run_count: 185, created_at: '2026-04-13T00:00:00Z', updated_at: '2026-04-17T00:00:00Z', foundation_sources: { title: '측정의 기술', source_type: 'EXPERT_DOC' } },
  { pack_id: 'mock-008', foundation_source_id: null, builder_id: 'b8', taskflow_blocks: {}, execution_proof_run_id: undefined, status: 'SCL_VERIFIED', lineage_commit_tree: [], micro_saas_ui_schema: { title: '연구논문 요약기', description: '학술 논문 PDF를 업로드하면 핵심 기여와 한계를 요약합니다.', cover_emoji: '🔬', required_inputs: [], output_format: 'MARKDOWN', cta_label: '논문 요약', estimated_time_seconds: 35 } as MicroSaaSUISchema, run_count: 142, created_at: '2026-04-15T00:00:00Z', updated_at: '2026-04-17T00:00:00Z', foundation_sources: { title: '학술 연구 가이드', source_type: 'EXPERT_DOC' } },
];

// ── 정렬 옵션 ─────────────────────────────────────────────────
const SORT_OPTIONS = [
  { value: 'run_count', label: '인기순' },
  { value: 'latest', label: '최신순' },
  { value: 'featured', label: 'Featured 우선' },
];

// ── 소스 타입 옵션 ────────────────────────────────────────────
const SOURCE_TYPE_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'BOOK', label: '📚 도서 기반' },
  { value: 'EXPERT_DOC', label: '🎓 전문가 문서' },
  { value: 'INTERNAL', label: '🏢 내부 자료' },
];

// ── Pack → PackCard Props 변환 ────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toCardProps(pack: any) {
  const schema = pack.micro_saas_ui_schema as MicroSaaSUISchema | null;
  const fs = Array.isArray(pack.foundation_sources)
    ? pack.foundation_sources[0]
    : pack.foundation_sources;
  return {
    packId: pack.pack_id,
    title: schema?.title ?? '(제목 없음)',
    description: schema?.description ?? '',
    coverEmoji: schema?.cover_emoji,
    status: pack.status,
    isSCLVerified: pack.status === 'SCL_VERIFIED' || pack.status === 'FEATURED',
    isFeatured: pack.status === 'FEATURED',
    runCount: pack.run_count ?? 0,
    authorTenant: fs?.title,
    sourceType: fs?.source_type as 'BOOK' | 'EXPERT_DOC' | 'INTERNAL' | undefined,
    estimatedTimeSec: schema?.estimated_time_seconds,
    ctaLabel: schema?.cta_label,
  };
}

// ── 필터 URL 생성 헬퍼 ────────────────────────────────────────
function buildFilterUrl(
  base: Record<string, string | undefined>,
  overrides: Record<string, string | undefined>,
) {
  const params = new URLSearchParams();
  const merged = { ...base, ...overrides };
  Object.entries(merged).forEach(([k, v]) => {
    if (v) params.set(k, v);
  });
  const str = params.toString();
  return str ? `/packs?${str}` : '/packs';
}

// ─────────────────────────────────────────────────────────────
export default async function PacksListPage({ searchParams }: PacksPageProps) {
  const resolvedParams = await searchParams;
  const category = resolvedParams.category;
  const sourceType = resolvedParams.source_type;
  const sort = (resolvedParams.sort ?? 'run_count') as 'run_count' | 'latest' | 'featured';
  const page = Math.max(1, parseInt(resolvedParams.page ?? '1', 10));
  const pageSize = 12;

  // 현재 필터 상태 (URL 빌더용)
  const currentFilters = { category, source_type: sourceType, sort, page: String(page) };

  // ── 데이터 패치 ────────────────────────────────────────────
  const result = await getMarketPacks({ category, sourceType, sort, page, pageSize });
  const packs = (result.data && result.data.length > 0) ? result.data : MOCK_PACKS_LIST;
  const totalCount = (result.data && result.data.length > 0) ? (result.count || result.data.length) : MOCK_PACKS_LIST.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const isMock = !result.data || result.data.length === 0;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pt-8 pb-24">
      <div className="container mx-auto max-w-7xl px-4">

        {/* ── 페이지 헤더 ─────────────────────────────────── */}
        <div className="pt-16 pb-12">
          <div className="text-xs font-bold text-violet-400 tracking-widest uppercase mb-3">
            AgentPack Marketplace
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
            AI 검증 팩 전체 목록
          </h1>
          <p className="text-slate-400 text-lg">
            SCL Verified · Featured 팩만 엄선 게재 —{' '}
            <span className="text-white font-semibold">{totalCount.toLocaleString()}개</span> 팩
          </p>
        </div>

        {/* ── 필터 바 ──────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-4 mb-10 pb-8 border-b border-white/[0.06]">
          {/* 정렬 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">정렬</span>
            <div className="flex rounded-xl border border-white/10 overflow-hidden">
              {SORT_OPTIONS.map((opt) => (
                <Link
                  key={opt.value}
                  href={buildFilterUrl(currentFilters, { sort: opt.value, page: '1' })}
                  className={`
                    px-4 py-2 text-sm font-bold transition-colors
                    ${sort === opt.value
                      ? 'bg-violet-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }
                  `}
                >
                  {opt.label}
                </Link>
              ))}
            </div>
          </div>

          {/* 소스 타입 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">소스</span>
            <div className="flex flex-wrap gap-2">
              {SOURCE_TYPE_OPTIONS.map((opt) => (
                <Link
                  key={opt.value}
                  href={buildFilterUrl(currentFilters, { source_type: opt.value || undefined, page: '1' })}
                  className={`
                    px-3 py-1.5 rounded-xl text-sm font-semibold border transition-colors
                    ${sourceType === opt.value || (!sourceType && !opt.value)
                      ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300'
                      : 'border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                    }
                  `}
                >
                  {opt.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Mock 표시 */}
          {isMock && (
            <div className="ml-auto text-xs text-amber-400/70 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full">
              ⚙️ 개발 모드 — 더미 데이터
            </div>
          )}
        </div>

        {/* ── 팩 그리드 ─────────────────────────────────────── */}
        {packs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {packs.map((pack) => (
              <PackCard key={pack.pack_id} {...toCardProps(pack)} />
            ))}
          </div>
        ) : (
          <div className="py-32 text-center">
            <div className="text-5xl mb-4">🔍</div>
            <h2 className="text-xl font-bold text-slate-300 mb-2">검색 결과 없음</h2>
            <p className="text-slate-500 mb-6">필터 조건을 변경해 보세요.</p>
            <Link
              href="/packs"
              className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-bold px-6 py-3 rounded-2xl transition-colors"
            >
              전체 팩 보기
            </Link>
          </div>
        )}

        {/* ── 페이지네이션 ──────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="mt-12 flex items-center justify-center gap-2">
            {/* 이전 */}
            {page > 1 && (
              <Link
                href={buildFilterUrl(currentFilters, { page: String(page - 1) })}
                className="w-10 h-10 flex items-center justify-center rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-colors"
                aria-label="이전 페이지"
              >
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true">
                  <path d="M10 4l-4 4 4 4" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </Link>
            )}

            {/* 페이지 번호 */}
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = i + 1;
              return (
                <Link
                  key={p}
                  href={buildFilterUrl(currentFilters, { page: String(p) })}
                  className={`
                    w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold
                    border transition-colors
                    ${page === p
                      ? 'bg-violet-600 border-violet-500 text-white'
                      : 'border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                    }
                  `}
                  aria-label={`${p}페이지`}
                  aria-current={page === p ? 'page' : undefined}
                >
                  {p}
                </Link>
              );
            })}

            {/* 다음 */}
            {page < totalPages && (
              <Link
                href={buildFilterUrl(currentFilters, { page: String(page + 1) })}
                className="w-10 h-10 flex items-center justify-center rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-colors"
                aria-label="다음 페이지"
              >
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true">
                  <path d="M6 4l4 4-4 4" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </Link>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
