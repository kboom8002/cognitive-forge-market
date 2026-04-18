/**
 * src/app/page.tsx
 * Cognitive Forge Market — 홈 페이지 (Server Component)
 * SDD-04 §1: QuestHero + FeaturedPacksGrid + AuthorSpotlight + FAQ JSON-LD
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { getFeaturedPacks, getTodayQuest } from '@/lib/supabase';
import { PackCard } from '@/components/pack-card';
import { QuestHero } from '@/components/quest-hero';
import type { AgentPack } from '@/types/database';
import type { MicroSaaSUISchema } from '@/types/ui-forge';

export const revalidate = 10;

export const metadata: Metadata = {
  title: 'Cognitive Forge Market — AI AgentPack 마켓플레이스',
  description:
    'SCL 검증 완료된 8-Block AgentPack을 탐색하고 즉시 실행하세요. Today\'s Quest에 도전해 PoK를 획득하세요.',
  openGraph: {
    title: 'Cognitive Forge Market',
    description: 'AI 검증 완료된 AgentPack 마켓플레이스 — SCL Verified AI 팩 즉시 실행',
    url: 'https://market.cognitiveforge.io',
    siteName: 'Cognitive Forge Market',
    locale: 'ko_KR',
    type: 'website',
  },
};

// ── 더미 데이터 (Supabase 미연결 시 Fallback) ──────────────────────
const MOCK_PACKS: (AgentPack & { foundation_sources: { title: string; source_type: string } | null })[] = [
  {
    pack_id: 'mock-001',
    foundation_source_id: null,
    builder_id: 'builder-1',
    taskflow_blocks: {},
    execution_proof_run_id: undefined,
    status: 'FEATURED',
    lineage_commit_tree: [],
    micro_saas_ui_schema: {
      title: '계약서 리스크 분석 AI',
      description: '법률 계약서를 업로드하면 8가지 관점에서 을/갑/중립 관점으로 리스크를 분석합니다. 평균 30초 소요.',
      cover_emoji: '⚖️',
      required_inputs: [],
      output_format: 'MARKDOWN',
      cta_label: '계약서 분석 시작',
      estimated_time_seconds: 30,
    } as MicroSaaSUISchema,
    run_count: 1240,
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-17T00:00:00Z',
    foundation_sources: { title: '계약의 기술', source_type: 'BOOK' },
  },
  {
    pack_id: 'mock-002',
    foundation_source_id: null,
    builder_id: 'builder-2',
    taskflow_blocks: {},
    execution_proof_run_id: undefined,
    status: 'SCL_VERIFIED',
    lineage_commit_tree: [],
    micro_saas_ui_schema: {
      title: '브랜드 스토리 생성기',
      description: '제품 정보를 입력하면 소셜 미디어에 바로 사용할 수 있는 브랜드 스토리와 카피라이팅을 생성합니다.',
      cover_emoji: '✍️',
      required_inputs: [],
      output_format: 'MARKDOWN',
      cta_label: '스토리 생성 시작',
      estimated_time_seconds: 20,
    } as MicroSaaSUISchema,
    run_count: 842,
    created_at: '2026-04-05T00:00:00Z',
    updated_at: '2026-04-17T00:00:00Z',
    foundation_sources: { title: '퍼스널 브랜딩의 법칙', source_type: 'BOOK' },
  },
  {
    pack_id: 'mock-003',
    foundation_source_id: null,
    builder_id: 'builder-3',
    taskflow_blocks: {},
    execution_proof_run_id: undefined,
    status: 'SCL_VERIFIED',
    lineage_commit_tree: [],
    micro_saas_ui_schema: {
      title: '성과 리뷰 작성 도우미',
      description: '팀원 정보와 성과 키워드를 입력하면 공정하고 구체적인 성과 리뷰 초안을 자동으로 작성합니다.',
      cover_emoji: '📊',
      required_inputs: [],
      output_format: 'MARKDOWN',
      cta_label: '리뷰 초안 생성',
      estimated_time_seconds: 15,
    } as MicroSaaSUISchema,
    run_count: 577,
    created_at: '2026-04-08T00:00:00Z',
    updated_at: '2026-04-17T00:00:00Z',
    foundation_sources: { title: 'OKR 성과 관리 바이블', source_type: 'EXPERT_DOC' },
  },
  {
    pack_id: 'mock-004',
    foundation_source_id: null,
    builder_id: 'builder-4',
    taskflow_blocks: {},
    execution_proof_run_id: undefined,
    status: 'SCL_VERIFIED',
    lineage_commit_tree: [],
    micro_saas_ui_schema: {
      title: '투자 제안서 구조화기',
      description: '스타트업 정보를 입력하면 VC가 선호하는 형식의 투자 제안서 초안을 생성합니다.',
      cover_emoji: '🚀',
      required_inputs: [],
      output_format: 'MARKDOWN',
      cta_label: '제안서 작성 시작',
      estimated_time_seconds: 45,
    } as MicroSaaSUISchema,
    run_count: 391,
    created_at: '2026-04-10T00:00:00Z',
    updated_at: '2026-04-17T00:00:00Z',
    foundation_sources: { title: '제로 투 원', source_type: 'BOOK' },
  },
  {
    pack_id: 'mock-005',
    foundation_source_id: null,
    builder_id: 'builder-5',
    taskflow_blocks: {},
    execution_proof_run_id: undefined,
    status: 'SCL_VERIFIED',
    lineage_commit_tree: [],
    micro_saas_ui_schema: {
      title: '고객 인터뷰 분석기',
      description: '고객 인터뷰 녹취록을 붙여넣으면 Pain Point, Gain, Job-to-be-Done을 자동으로 추출합니다.',
      cover_emoji: '🎯',
      required_inputs: [],
      output_format: 'MARKDOWN',
      cta_label: '인터뷰 분석 시작',
      estimated_time_seconds: 25,
    } as MicroSaaSUISchema,
    run_count: 288,
    created_at: '2026-04-12T00:00:00Z',
    updated_at: '2026-04-17T00:00:00Z',
    foundation_sources: { title: 'The Mom Test', source_type: 'BOOK' },
  },
  {
    pack_id: 'mock-006',
    foundation_source_id: null,
    builder_id: 'builder-6',
    taskflow_blocks: {},
    execution_proof_run_id: undefined,
    status: 'FEATURED',
    lineage_commit_tree: [],
    micro_saas_ui_schema: {
      title: '주간 회의록 → 액션 아이템 변환기',
      description: '회의록을 입력하면 담당자·기한별로 정리된 액션 아이템 목록을 즉시 추출합니다.',
      cover_emoji: '📋',
      required_inputs: [],
      output_format: 'MARKDOWN',
      cta_label: '액션 아이템 추출',
      estimated_time_seconds: 10,
    } as MicroSaaSUISchema,
    run_count: 213,
    created_at: '2026-04-14T00:00:00Z',
    updated_at: '2026-04-17T00:00:00Z',
    foundation_sources: { title: 'Getting Things Done', source_type: 'BOOK' },
  },
];

const MOCK_QUEST = {
  quest_id: 'q-mock-001',
  title: '《그릿》 8-Block AgentPack을 가장 먼저 출시하세요!',
  target_book_title: '그릿 (Grit) — 앤절라 더크워스',
  reward_pok: 50000,
  deadline_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  linked_pack_id: undefined,
  created_at: new Date().toISOString(),
};

// ── Pack 데이터 → PackCard props 변환 ────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPackCardProps(pack: any) {
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

// ── FAQ (AEO/SEO) ─────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: 'AgentPack이란 무엇인가요?',
    a: 'AgentPack은 8-Block TaskFlow 구조로 설계된 AI 실행 패키지입니다. 도서·전문가 지식을 AI 프롬프트 구조로 변환하여 누구나 즉시 실행할 수 있는 Micro-SaaS 형태로 제공합니다.',
  },
  {
    q: 'SCL Verified 배지는 무엇을 의미하나요?',
    a: 'SCL(Synthetic Cohort Lab)은 AI 에이전트가 1,000개의 Edge-case를 자율적으로 투척하여 환각률 0%, Output Contract 준수율 99% 이상을 검증한 팩에만 부여하는 품질 인증입니다.',
  },
  {
    q: '팩을 실행하면 무슨 일이 일어나나요?',
    a: '입력 폼을 작성하고 [Run]을 클릭하면 SSE(Server-Sent Events) 스트리밍 방식으로 GPT-4o가 실시간으로 결과를 생성합니다. 완성된 출력은 Markdown 또는 DOCX로 다운로드할 수 있습니다.',
  },
  {
    q: 'PoK(Proof of Knowledge)란 무엇인가요?',
    a: 'PoK는 팩 실행 시 발생하는 배당 포인트입니다. Pack Builder 40%, Fork 기여자 30%, Author-Tenant 20%, Platform 10%로 자동 배분됩니다.',
  },
];

// ─────────────────────────────────────────────────────────────────
export default async function HomePage() {
  // ── 서버 데이터 패치 (병렬) ──────────────────────────────────
  const [packsResult, quest] = await Promise.all([
    getFeaturedPacks(6),
    getTodayQuest(),
  ]);

  const packs = (packsResult && packsResult.length > 0) ? packsResult : MOCK_PACKS;
  const todayQuest = quest ?? MOCK_QUEST;

  // ── JSON-LD (ItemList + FAQPage) ─────────────────────────────
  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Cognitive Forge — AgentPack Marketplace',
    description: 'AI 검증 완료된 지식 패키지를 실행하는 마켓플레이스',
    itemListElement: packs.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: (p.micro_saas_ui_schema as MicroSaaSUISchema | null)?.title ?? '',
      url: `https://market.cognitiveforge.io/packs/${p.pack_id}`,
    })),
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* ── JSON-LD ──────────────────────────────────────────── */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* ═══════════════════════════════════════════════════════
          HERO — QuestHero (Realtime)
      ═══════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden pt-28 pb-20 px-4">
        {/* 배경 그라데이션 */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950/60 via-[#0a0a0f] to-[#0a0a0f] pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-violet-600/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative container mx-auto max-w-6xl">

          {/* Today's Quest — QuestHero (SSR 초기값 + Realtime 구독) */}
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
              TODAY&apos;S QUEST
            </div>
            {/* QuestHero: 서버 initialQuest → 클라이언트 Realtime 업데이트 */}
            <QuestHero initialQuest={todayQuest} />
          </div>

          {/* FeaturedPacksGrid 헤더 */}
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="text-xs font-bold text-violet-400 tracking-widest uppercase mb-2">
                Featured &amp; Verified Packs
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white">
                지금 가장 인기 있는 AgentPack
              </h2>
            </div>
            <Link
              href="/packs"
              className="hidden md:flex items-center gap-1.5 text-sm font-bold text-violet-400 hover:text-violet-300 transition-colors"
            >
              전체 보기
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FeaturedPacksGrid — 6개 카드
      ═══════════════════════════════════════════════════════ */}
      <section className="container mx-auto max-w-6xl px-4 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {packs.map((pack) => (
            <PackCard key={pack.pack_id} {...toPackCardProps(pack)} />
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/packs"
            className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-violet-500/30 text-white font-bold px-8 py-4 rounded-2xl transition-all hover:shadow-lg hover:shadow-violet-900/20 text-sm"
          >
            AgentPack 전체 보기
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true">
              <path d="M3 8h10M9 4l4 4-4 4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          AuthorSpotlight
      ═══════════════════════════════════════════════════════ */}
      <section className="border-t border-white/[0.06] py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-end justify-between mb-10">
            <div>
              <div className="text-xs font-bold text-emerald-400 tracking-widest uppercase mb-2">
                Author-Tenant Hub
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white">
                지식을 AgentPack으로 변환한 Author들
              </h2>
            </div>
            <Link
              href="/authors"
              className="hidden md:flex items-center gap-1.5 text-sm font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              전체 보기 →
            </Link>
          </div>

          {/* Author 플레이스홀더 카드들 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['⚖️', '✍️', '📊', '🚀'].map((emoji, i) => (
              <div
                key={i}
                className="relative rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 text-center hover:border-emerald-500/20 transition-colors group"
              >
                <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-2xl mx-auto mb-4">
                  {emoji}
                </div>
                <div className="h-3 bg-white/5 rounded-full mb-2 mx-auto w-24 group-hover:bg-white/10 transition-colors" />
                <div className="h-2 bg-white/[0.03] rounded-full mx-auto w-16" />
              </div>
            ))}
          </div>
          <p className="text-center text-slate-600 text-sm mt-6">Author 데이터 로딩 중 — Supabase 연결 후 활성화됩니다</p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FAQ — AEO/SEO JSON-LD 대응 마크업
      ═══════════════════════════════════════════════════════ */}
      <section className="border-t border-white/[0.06] py-20 px-4" aria-label="자주 묻는 질문">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <div className="text-xs font-bold text-slate-500 tracking-widest uppercase mb-3">FAQ</div>
            <h2 className="text-2xl md:text-3xl font-black text-white">자주 묻는 질문</h2>
          </div>

          <div className="space-y-4" itemScope itemType="https://schema.org/FAQPage">
            {FAQ_ITEMS.map(({ q, a }, i) => (
              <details
                key={i}
                className="group rounded-2xl border border-white/[0.06] bg-white/[0.03] overflow-hidden"
                itemScope
                itemProp="mainEntity"
                itemType="https://schema.org/Question"
              >
                <summary
                  className="flex items-center justify-between p-6 cursor-pointer list-none font-bold text-slate-200 hover:text-white transition-colors gap-4"
                  itemProp="name"
                >
                  <span>{q}</span>
                  <svg
                    className="w-5 h-5 text-slate-500 flex-shrink-0 group-open:rotate-180 transition-transform"
                    viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true"
                  >
                    <path d="M4 6l4 4 4-4" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </summary>
                <div
                  className="px-6 pb-6 text-slate-400 leading-relaxed text-sm"
                  itemScope
                  itemProp="acceptedAnswer"
                  itemType="https://schema.org/Answer"
                >
                  <span itemProp="text">{a}</span>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          하단 CTA
      ═══════════════════════════════════════════════════════ */}
      <section className="border-t border-white/[0.06] py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="relative rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-950/60 to-slate-900/80 p-12 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 to-transparent pointer-events-none" />
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4 relative">
              나만의 AgentPack을 출시하세요
            </h2>
            <p className="text-slate-400 text-lg mb-8 max-w-xl mx-auto relative">
              8-Block Pack Studio에서 지식을 구조화하고, SCL 검증을 통과하면
              이 마켓에 자동으로 게시되어 PoK 배당을 받을 수 있습니다.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative">
              <Link
                href="http://localhost:3000/studio"
                className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-bold px-8 py-4 rounded-2xl transition-all hover:scale-105 hover:shadow-xl hover:shadow-violet-900/50"
              >
                ⚡ Pack Studio 시작하기
              </Link>
              <Link
                href="/packs"
                className="inline-flex items-center gap-2 text-slate-400 hover:text-white font-bold px-8 py-4 rounded-2xl border border-white/10 hover:border-white/20 transition-all"
              >
                팩 탐색하기
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
