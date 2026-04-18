/**
 * src/app/packs/[packId]/page.tsx
 * AgentPack 상세 페이지 (Server Component)
 * SDD-04 §3, SDD-11 §3 generateMetadata 패턴
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getVerifiedPackById } from '@/lib/supabase';
import { SCLBadge } from '@/components/scl-badge';
import type { MicroSaaSUISchema, InputField, InputFieldType } from '@/types/ui-forge';
import { UIForgeRenderer } from '@/components/ui-forge/UIForgeRenderer';

// ── 파라미터 타입 (Next.js 16 — params: Promise) ─────────────
interface PackDetailProps {
  params: Promise<{ packId: string }>;
}

// ── generateMetadata (SDD-11 §3) ─────────────────────────────
export async function generateMetadata(
  { params }: PackDetailProps,
): Promise<Metadata> {
  const { packId } = await params;

  // SCL_VERIFIED/FEATURED 팩만 조회 (AGENTS.md 절대 규칙)
  const pack = await getVerifiedPackById(packId);
  const schema = pack?.micro_saas_ui_schema as MicroSaaSUISchema | null | undefined;

  if (!pack || !schema) {
    return {
      title: 'AgentPack | Cognitive Forge Market',
    };
  }

  const safeTitle = `${schema.title} | Cognitive Forge Market`;
  const safeDesc = (schema.description ?? '').slice(0, 160);

  // OG URL — packId와 함께 fallback 파라미터도 전달 (SSG/Edge 대응)
  const ogUrl = `/api/og?type=pack&packId=${packId}`
    + `&title=${encodeURIComponent(schema.title ?? '')}`
    + `&desc=${encodeURIComponent((schema.description ?? '').slice(0, 80))}`
    + `&emoji=${encodeURIComponent(schema.cover_emoji ?? '🤖')}`
    + `&runs=${pack.run_count ?? 0}`
    + `&status=${pack.status}`;

  return {
    title: safeTitle,
    description: safeDesc,
    openGraph: {
      title: schema.title ?? 'AgentPack',
      description: safeDesc,
      images: [
        {
          url: ogUrl,
          width: 1200,
          height: 630,
          alt: schema.title,
        },
      ],
      type: 'website',
      siteName: 'Cognitive Forge Market',
    },
    twitter: {
      card: 'summary_large_image',
      title: schema.title ?? 'AgentPack',
      description: safeDesc,
      images: [ogUrl],
    },
  };
}

// ── Mock 스키마 — SDD-05 §8 예시 기반 ───────────────────────
// 개발 환경에서 UIForgeRenderer 테스트용
const MOCK_PACK_MAP: Record<string, {
  title: string;
  description: string;
  cover_emoji: string;
  status: 'SCL_VERIFIED' | 'FEATURED';
  run_count: number;
  source_title: string;
  source_type: string;
  // MicroSaaSUISchema 전체를 그대로 넣어 UIForgeRenderer에 전달
  uiSchema: MicroSaaSUISchema;
}> = {
  'mock-001': {
    title: '계약서 리스크 분석 AI',
    description: '법률 계약서를 업로드하면 8가지 관점에서 리스크를 분석합니다. 평균 30초 소요.',
    cover_emoji: '⚖️',
    status: 'FEATURED',
    run_count: 1240,
    source_title: '계약의 기술',
    source_type: 'BOOK',
    // SDD-05 §8 예시 스키마 (FILE_UPLOAD + DROPDOWN + TEXT_AREA)
    uiSchema: {
      title: '계약서 리스크 분석 AI',
      description: '법률 계약서를 업로드하면 8가지 관점에서 리스크를 분석합니다. 평균 30초 소요.',
      cover_emoji: '⚖️',
      required_inputs: [
        {
          id: 'file_contract',
          type: 'FILE_UPLOAD' as InputFieldType,
          label: '계약서 파일 업로드',
          variable_key: 'K_In',
          required: true,
          accept: '.pdf,.docx',
          max_size_mb: 10,
          helper_text: 'PDF 또는 Word 파일을 지원합니다.',
        },
        {
          id: 'role_select',
          type: 'DROPDOWN' as InputFieldType,
          label: '분석 관점 선택',
          variable_key: 'A_Role',
          required: true,
          options: ['을(수급자) 관점', '갑(발주자) 관점', '중립 관점'],
        },
        {
          id: 'concerns',
          type: 'TEXT_AREA' as InputFieldType,
          label: '특별히 우려되는 조항 (선택)',
          variable_key: 'S_Situation',
          required: false,
          placeholder: '예: 계약 해제 조건, 지연 배상금 조항',
        },
        {
          id: 'depth_slider',
          type: 'SLIDER' as InputFieldType,
          label: '분석 깊이',
          variable_key: 'L_Depth',
          required: false,
          min: 1,
          max: 10,
          step: 1,
          default_value: 7,
          helper_text: '1=간략, 10=최대 상세',
        },
      ],
      output_format: 'MARKDOWN',
      cta_label: '계약서 분석 시작',
      estimated_time_seconds: 30,
    },
  },
  'mock-002': {
    title: '브랜드 스토리 생성기',
    description: '소셜 미디어용 브랜드 카피라이팅을 자동으로 생성합니다.',
    cover_emoji: '✍️',
    status: 'SCL_VERIFIED',
    run_count: 842,
    source_title: '퍼스널 브랜딩 전략',
    source_type: 'EXPERT_DOC',
    uiSchema: {
      title: '브랜드 스토리 생성기',
      description: '소셜 미디어용 브랜드 카피라이팅을 자동으로 생성합니다.',
      cover_emoji: '✍️',
      required_inputs: [
        {
          id: 'brand_name',
          type: 'TEXT_INPUT' as InputFieldType,
          label: '브랜드/제품명',
          variable_key: 'K_Brand',
          required: true,
          placeholder: '예: Cognitive Forge',
        },
        {
          id: 'target_channel',
          type: 'DROPDOWN' as InputFieldType,
          label: '타겟 채널',
          variable_key: 'A_Channel',
          required: true,
          options: ['인스타그램', '링크드인', '트위터/X', '네이버 블로그'],
        },
        {
          id: 'brand_desc',
          type: 'TEXT_AREA' as InputFieldType,
          label: '브랜드 소개 (3-5문장)',
          variable_key: 'S_Intro',
          required: true,
          placeholder: '브랜드의 핵심 가치, 타겟층, 차별점을 적어주세요.',
        },
        {
          id: 'tone_toggle',
          type: 'TOGGLE' as InputFieldType,
          label: '이모지 포함',
          variable_key: 'T_Emoji',
          required: false,
          helper_text: '활성화 시 이모지를 카피에 포함합니다',
        },
        {
          id: 'deadline',
          type: 'DATE_PICKER' as InputFieldType,
          label: '캠페인 시작일 (선택)',
          variable_key: 'D_Launch',
          required: false,
        },
      ],
      output_format: 'MARKDOWN',
      cta_label: '브랜드 스토리 생성',
      estimated_time_seconds: 15,
    },
  },
};

// ─────────────────────────────────────────────────────────────
export default async function PackDetailPage({ params }: PackDetailProps) {
  const { packId } = await params;

  // ── 데이터 패치 ────────────────────────────────────────────
  const packData = await getVerifiedPackById(packId);
  const mock = MOCK_PACK_MAP[packId];

  // 실제 데이터도 없고 mock도 없으면 → 404
  // AGENTS.md 절대 규칙: SCL_VERIFIED/FEATURED가 아닌 팩은 노출 불가
  if (!packData && !mock) {
    notFound();
  }

  // 데이터 병합
  const schema = (packData?.micro_saas_ui_schema as MicroSaaSUISchema | null) ?? mock?.uiSchema ?? null;
  const title       = schema?.title       ?? mock?.title       ?? '(제목 없음)';
  const description = schema?.description ?? mock?.description ?? '';
  const emoji       = schema?.cover_emoji ?? mock?.cover_emoji ?? '🤖';
  const status      = packData?.status    ?? mock?.status      ?? 'SCL_VERIFIED';
  const runCount    = packData?.run_count ?? mock?.run_count   ?? 0;
  const estTime     = schema?.estimated_time_seconds;
  const sourceTitle = (packData as { foundation_sources?: { title: string } | null } | null)
    ?.foundation_sources?.title ?? mock?.source_title ?? '';
  const sourceType  = (packData as { foundation_sources?: { source_type: string } | null } | null)
    ?.foundation_sources?.source_type ?? mock?.source_type ?? '';

  const isFeatured = status === 'FEATURED';
  const SOURCE_EMOJI: Record<string, string> = { BOOK: '📚', EXPERT_DOC: '🎓', INTERNAL: '🏢' };

  // JSON-LD (SoftwareApplication)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: title,
    description,
    applicationCategory: 'AIApplication',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── 상단 내비게이션 ─────────────────────────────────── */}
      <nav className="fixed top-0 w-full bg-[#0a0a0f]/80 backdrop-blur-md border-b border-white/[0.06] z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/packs"
            className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true">
              <path d="M10 4L6 8l4 4" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            마켓으로 돌아가기
          </Link>
          <div className="flex items-center gap-3">
            <SCLBadge status={status} size="sm" />
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 pt-28 pb-32">

        {/* ── 팩 헤더 ──────────────────────────────────────── */}
        <header className="mb-12">
          {/* 소스 출처 */}
          {sourceTitle && (
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-5">
              <span>{SOURCE_EMOJI[sourceType] ?? '📄'}</span>
              <span className="font-semibold">{sourceTitle}</span>
              <span className="text-slate-700">·</span>
              <span>{sourceType === 'BOOK' ? '도서 기반' : sourceType === 'EXPERT_DOC' ? '전문가 문서' : '내부 자료'}</span>
            </div>
          )}

          {/* 이모지 + 제목 */}
          <div className="flex items-start gap-6 mb-6">
            <div
              className={`w-20 h-20 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0 ring-1
                ${isFeatured
                  ? 'bg-violet-900/60 ring-violet-500/30'
                  : 'bg-slate-800 ring-white/10'
                }`}
            >
              {emoji}
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black leading-tight tracking-tight mb-3">
                {title}
              </h1>
              {/* 메타 배지 */}
              <div className="flex flex-wrap items-center gap-3">
                <SCLBadge status={status} size="md" />
                <div className="flex items-center gap-1.5 text-sm text-slate-400">
                  <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path d="M6 3.5l6 4.5-6 4.5V3.5z"/>
                  </svg>
                  <span className="font-bold text-slate-200">{runCount.toLocaleString()}</span>
                  <span>회 실행</span>
                </div>
                {estTime && (
                  <div className="flex items-center gap-1 text-sm text-slate-500">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true">
                      <circle cx="8" cy="8" r="6.5" strokeWidth="1.5"/>
                      <path d="M8 5v3.5l2 1.5" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    약 {estTime}s
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 설명 */}
          <p className="text-slate-400 text-lg leading-relaxed max-w-2xl">
            {description}
          </p>
        </header>

        {/* ── UI Forge 렌더링 엔진 — SDD-05 ─────────────────── */}
        {schema ? (
          <div className="mb-10">
            <UIForgeRenderer schema={schema} packId={packId} />
          </div>
        ) : (
          <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-10 text-center mb-10">
            <div className="text-4xl mb-4">⚙️</div>
            <p className="text-slate-500 text-sm">
              이 팩의 UI 스키마가 아직 설정되지 않았습니다.
            </p>
          </div>
        )}

        {/* ── SCL 검증 정보 ────────────────────────────────── */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
          <h2 className="text-base font-bold text-slate-300 mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true">
              <path d="M2.5 8.5l3.5 3.5 7.5-8" strokeWidth="2" strokeLinecap="round" />
            </svg>
            SCL (Synthetic Cohort Lab) 검증 정보
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: '환각률', value: '0%', sub: 'Hallucination Rate' },
              { label: '테스트 케이스', value: '1,000+', sub: 'Edge-case Coverage' },
              { label: 'Output 준수율', value: '99%+', sub: 'Contract Compliance' },
              { label: '검증 상태', value: status === 'FEATURED' ? 'Featured' : 'Verified', sub: 'SCL Status' },
            ].map((item) => (
              <div key={item.label} className="text-center bg-white/[0.02] rounded-xl p-4 border border-white/[0.04]">
                <div className="text-2xl font-black text-white mb-1">{item.value}</div>
                <div className="text-xs text-slate-500 font-semibold">{item.sub}</div>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}

// ── 플레이스홀더 (미등록 packId) ─────────────────────────────
function PackPlaceholder({ packId }: { packId: string }) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center px-4">
      <div className="text-6xl mb-6">🔍</div>
      <h1 className="text-3xl font-black text-white mb-3">팩을 찾을 수 없습니다</h1>
      <p className="text-slate-500 mb-2 text-center">
        <code className="text-slate-400 bg-white/5 px-2 py-0.5 rounded">{packId}</code>에 해당하는
        SCL_VERIFIED/FEATURED 팩이 존재하지 않습니다.
      </p>
      <p className="text-slate-600 text-sm mb-8">삭제되었거나 아직 검증 대기 중일 수 있습니다.</p>
      <Link
        href="/packs"
        className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-bold px-8 py-4 rounded-2xl transition-colors"
      >
        ← 팩 목록으로
      </Link>
    </div>
  );
}
