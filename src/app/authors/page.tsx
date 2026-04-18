/**
 * src/app/authors/page.tsx
 * Author-Tenant Hub (Server Component)
 * SDD-04 §4: phalanx-media /experts Fork + Supabase foundation_sources 연동
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { getAuthors } from '@/lib/supabase';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Author Hub | Cognitive Forge Market',
  description: '지식을 AgentPack으로 변환한 Author-Tenant 프로필과 공식 팩 목록입니다.',
};

// ── 더미 Author 데이터 (Supabase 미연결 fallback) ─────────────
const MOCK_AUTHORS = [
  {
    author_tenant_id: 'author-001',
    displayName: '이재훈 박사',
    affiliation: '서울대 법학전문대학원',
    bio: '계약법, 기업거래법 전문가. 《계약의 기술》 저자.',
    coverEmoji: '⚖️',
    packCount: 3,
    totalRuns: 2840,
    sourceType: 'BOOK',
    verified: true,
  },
  {
    author_tenant_id: 'author-002',
    displayName: '김수진',
    affiliation: '마케팅 전략 컨설턴트',
    bio: '10년 경력의 B2B 마케팅 전략가. 퍼스널 브랜딩 분야 코치.',
    coverEmoji: '✍️',
    packCount: 5,
    totalRuns: 1920,
    sourceType: 'EXPERT_DOC',
    verified: true,
  },
  {
    author_tenant_id: 'author-003',
    displayName: '박태영',
    affiliation: 'HR 테크 스타트업 CPO',
    bio: '前 삼성 HR팀장. OKR 기반 성과 관리 시스템 전문가.',
    coverEmoji: '📊',
    packCount: 2,
    totalRuns: 1105,
    sourceType: 'BOOK',
    verified: true,
  },
  {
    author_tenant_id: 'author-004',
    displayName: 'Jay Choi',
    affiliation: '시드 VC 파트너',
    bio: '스타트업 투자 심사역 출신. 초기 투자 심사 노하우를 AgentPack으로 구조화.',
    coverEmoji: '🚀',
    packCount: 4,
    totalRuns: 879,
    sourceType: 'EXPERT_DOC',
    verified: false,
  },
  {
    author_tenant_id: 'author-005',
    displayName: '최유진',
    affiliation: 'UX 리서치 Lead',
    bio: '사용자 인터뷰 전문가. The Mom Test 국내 커뮤니티 운영자.',
    coverEmoji: '🎯',
    packCount: 2,
    totalRuns: 641,
    sourceType: 'BOOK',
    verified: true,
  },
  {
    author_tenant_id: 'author-006',
    displayName: '한민준',
    affiliation: '학술 출판 컨설턴트',
    bio: 'SCI 논문 게재 컨설팅 10년 경력. 연구 방법론 전문가.',
    coverEmoji: '🔬',
    packCount: 1,
    totalRuns: 284,
    sourceType: 'EXPERT_DOC',
    verified: true,
  },
  {
    author_tenant_id: 'author-007',
    displayName: '오세준',
    affiliation: '애자일 코치',
    bio: 'GTD & OKR 기반 팀 생산성 전문가. 국내 Notion 커뮤니티 운영.',
    coverEmoji: '📋',
    packCount: 3,
    totalRuns: 497,
    sourceType: 'BOOK',
    verified: true,
  },
  {
    author_tenant_id: 'author-008',
    displayName: '정다은',
    affiliation: '데이터 분석가',
    bio: 'KPI 대시보드 설계 전문가. BI 툴 트레이너 출신.',
    coverEmoji: '📈',
    packCount: 2,
    totalRuns: 371,
    sourceType: 'EXPERT_DOC',
    verified: false,
  },
];

const SOURCE_TYPE_EMOJI: Record<string, string> = {
  BOOK: '📚',
  EXPERT_DOC: '🎓',
  INTERNAL: '🏢',
};

// ─────────────────────────────────────────────────────────────
export default async function AuthorsHubPage() {
  // Supabase에서 author 조회 시도
  const authorsData = await getAuthors();
  const isMock = !authorsData || authorsData.length === 0;

  const authors = isMock
    ? MOCK_AUTHORS
    : authorsData.map((a) => ({
        author_tenant_id: a.author_tenant_id ?? '',
        displayName: `Author #${a.author_tenant_id?.slice(0, 8)}`,
        affiliation: a.title,
        bio: '',
        coverEmoji: SOURCE_TYPE_EMOJI[a.source_type] ?? '👤',
        packCount: 0,
        totalRuns: 0,
        sourceType: a.source_type,
        verified: true,
      }));

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">

      {/* ── 헤더 ────────────────────────────────────────────── */}
      <header className="relative overflow-hidden pt-32 pb-20 px-4 border-b border-white/[0.06]">
        {/* 배경 */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/30 via-[#0a0a0f] to-[#0a0a0f] pointer-events-none" />
        <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-emerald-600/8 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative container mx-auto max-w-6xl text-center">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 tracking-widest uppercase mb-6 bg-emerald-400/10 border border-emerald-400/20 px-4 py-2 rounded-full">
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 1l1.85 3.75L14 5.5l-3 2.92.71 4.13L8 10.5l-3.71 1.95.71-4.13L2 5.5l4.15-.75L8 1z"/>
            </svg>
            Author-Tenant Hub
          </div>

          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight mb-6">
            지식을{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              AgentPack
            </span>
            으로 변환한 Author들
          </h1>

          <p className="text-xl text-slate-400 font-light leading-relaxed mb-10 max-w-3xl mx-auto">
            검증된 전문 지식을 8-Block 구조로 캡슐화한 Author-Tenant의
            <br className="hidden md:block" />
            공식 프로필과 출시 팩을 탐색하세요.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-slate-300 px-5 py-2.5 rounded-xl text-sm font-semibold">
              <span className="w-2 h-2 bg-emerald-400 rounded-full" />
              총 {authors.length}명 등록
            </div>
            {isMock && (
              <div className="text-xs text-amber-400/70 bg-amber-400/10 border border-amber-400/20 px-3 py-2 rounded-xl">
                ⚙️ 개발 모드 — 더미 데이터
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Author 그리드 ─────────────────────────────────────── */}
      <main className="container mx-auto max-w-6xl px-4 py-20">

        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-2xl font-bold text-white">등록된 Author-Tenant</h2>
            <p className="text-slate-500 text-sm mt-1">SCL Verified 팩을 출시한 지식 공급자</p>
          </div>
          <Link
            href="/packs"
            className="hidden sm:flex items-center gap-2 text-sm font-bold text-violet-400 hover:text-violet-300 transition-colors border border-violet-500/20 hover:border-violet-500/40 px-4 py-2 rounded-xl"
          >
            팩 마켓 보기 →
          </Link>
        </div>

        {/* 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {authors.map((author) => (
            <Link
              key={author.author_tenant_id}
              href={`/authors/${author.author_tenant_id}`}
              className="group block"
              aria-label={`${author.displayName} Author 프로필`}
            >
              <div className="relative h-full rounded-2xl border border-white/[0.06] bg-white/[0.03] hover:border-emerald-500/30 hover:bg-emerald-950/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-900/20 p-6 text-center">

                {/* SCL Verified 인증 마크 */}
                {author.verified && (
                  <div className="absolute top-3 right-3 w-6 h-6 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-emerald-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-label="SCL Verified Author">
                      <path d="M2.5 8.5l3.5 3.5 7.5-8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}

                {/* 아바타 */}
                <div className="w-20 h-20 rounded-2xl bg-slate-800 ring-2 ring-white/5 group-hover:ring-emerald-500/20 flex items-center justify-center text-3xl mx-auto mb-5 transition-all">
                  {author.coverEmoji}
                </div>

                {/* 이름 + 소속 */}
                <div className="text-xs font-bold text-emerald-400 mb-1 uppercase tracking-wider">
                  {SOURCE_TYPE_EMOJI[author.sourceType]} {author.sourceType === 'BOOK' ? '도서 저자' : '전문가'}
                </div>
                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-emerald-300 transition-colors">
                  {author.displayName}
                </h3>
                <div className="text-sm text-slate-500 mb-4 leading-snug">{author.affiliation}</div>

                {/* bio */}
                {author.bio && (
                  <p className="text-xs text-slate-500 leading-relaxed mb-5 line-clamp-2">{author.bio}</p>
                )}

                {/* 구분선 */}
                <div className="w-10 h-px bg-white/10 mx-auto mb-5 group-hover:bg-emerald-500/30 transition-colors" />

                {/* 통계 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white/[0.03] p-2.5">
                    <div className="text-lg font-black text-white">{author.packCount}</div>
                    <div className="text-[10px] text-slate-500 font-semibold">팩 출시</div>
                  </div>
                  <div className="rounded-xl bg-white/[0.03] p-2.5">
                    <div className="text-lg font-black text-white">{author.totalRuns.toLocaleString()}</div>
                    <div className="text-[10px] text-slate-500 font-semibold">총 실행</div>
                  </div>
                </div>

                {/* 프로필 보기 → */}
                <div className="mt-5 text-xs font-bold text-slate-500 group-hover:text-emerald-400 transition-colors flex items-center justify-center gap-1">
                  프로필 보기
                  <svg className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true">
                    <path d="M3 8h10M9 4l4 4-4 4" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Author가 없을 때 */}
        {authors.length === 0 && (
          <div className="py-32 text-center">
            <div className="text-5xl mb-4">👥</div>
            <h2 className="text-xl font-bold text-slate-300 mb-2">등록된 Author가 없습니다</h2>
            <p className="text-slate-500">Pack Studio에서 팩을 출시하면 Author Hub에 자동 등록됩니다.</p>
          </div>
        )}
      </main>

      {/* ── Author 지원 CTA ──────────────────────────────────── */}
      <section className="border-t border-white/[0.06] py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="relative rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 to-slate-900/80 p-12 overflow-hidden text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/5 to-transparent pointer-events-none" />
            <h2 className="text-3xl font-black text-white mb-4 relative">
              Author-Tenant로 참여하세요
            </h2>
            <p className="text-slate-400 text-lg mb-8 max-w-xl mx-auto relative">
              가지고 있는 전문 지식이나 도서를 8-Block Pack으로 변환하면
              Learner의 실행마다 PoK 배당을 받을 수 있습니다.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative">
              <Link
                href="http://localhost:3000/studio"
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 py-4 rounded-2xl transition-all hover:scale-105 hover:shadow-xl hover:shadow-emerald-900/40"
              >
                🎓 Author 신청하기
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
