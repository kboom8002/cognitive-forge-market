/**
 * src/app/authors/[authorId]/page.tsx
 * Author-Tenant 프로필 상세 페이지 (Server Component)
 * SDD-04 §4, SDD-11 §3 generateMetadata 패턴
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { SCLBadge } from '@/components/scl-badge';
import type { PackStatus } from '@/types/database';

interface AuthorDetailProps {
  params: Promise<{ authorId: string }>;
}

// ── Mock Author Map ───────────────────────────────────────────
const MOCK_AUTHORS: Record<string, {
  displayName: string;
  affiliation: string;
  bio: string;
  emoji: string;
  sourceType: string;
  packCount: number;
  totalRuns: number;
  verified: boolean;
  packs: { id: string; title: string; description: string; status: PackStatus; runCount: number; emoji: string }[];
}> = {
  'author-001': {
    displayName: '이재훈 박사',
    affiliation: '서울대 법학전문대학원',
    bio: '계약법·기업거래법 전문가. 저서 《계약의 기술》을 기반으로 계약서 분석 AI AgentPack을 개발했습니다. SCL Verified 환각률 0% 달성.',
    emoji: '⚖️',
    sourceType: 'BOOK',
    packCount: 3,
    totalRuns: 2840,
    verified: true,
    packs: [
      { id: 'mock-001', title: '계약서 리스크 분석 AI', description: '법률 계약서를 8가지 관점에서 리스크 분석', status: 'FEATURED', runCount: 1240, emoji: '⚖️' },
      { id: 'mock-001b', title: '법인 계약 체크리스트', description: '법인 간 계약의 필수 조항 체크', status: 'SCL_VERIFIED', runCount: 920, emoji: '📋' },
      { id: 'mock-001c', title: 'NDA 초안 생성기', description: '비밀유지협약 초안을 자동으로 생성', status: 'SCL_VERIFIED', runCount: 680, emoji: '🔏' },
    ],
  },
  'author-002': {
    displayName: '김수진',
    affiliation: '마케팅 전략 컨설턴트',
    bio: '10년 경력의 B2B 마케팅 전략가. 퍼스널 브랜딩 분야 코치. 브랜드 스토리 생성 AI 팩을 운영합니다.',
    emoji: '✍️',
    sourceType: 'EXPERT_DOC',
    packCount: 5,
    totalRuns: 1920,
    verified: true,
    packs: [
      { id: 'mock-002', title: '브랜드 스토리 생성기', description: '소셜 미디어용 브랜드 카피라이팅 자동 생성', status: 'SCL_VERIFIED', runCount: 842, emoji: '✍️' },
    ],
  },
};

// ── generateMetadata (SDD-11 §3 패턴) ──────────────────────
export async function generateMetadata(
  { params }: AuthorDetailProps,
): Promise<Metadata> {
  const { authorId } = await params;
  const author = MOCK_AUTHORS[authorId];

  if (!author) {
    return { title: 'Author | Cognitive Forge Market' };
  }

  const ogUrl = `/api/og?type=author&authorId=${authorId}`
    + `&name=${encodeURIComponent(author.displayName)}`
    + `&aff=${encodeURIComponent(author.affiliation)}`
    + `&emoji=${encodeURIComponent(author.emoji)}`
    + `&sourceType=${author.sourceType}`;

  return {
    title: `${author.displayName} — Author Hub | Cognitive Forge Market`,
    description: author.bio.slice(0, 160),
    openGraph: {
      title: `${author.displayName} | Cognitive Forge Author`,
      description: author.bio.slice(0, 160),
      images: [{ url: ogUrl, width: 1200, height: 630, alt: author.displayName }],
      type: 'profile',
      siteName: 'Cognitive Forge Market',
    },
    twitter: {
      card: 'summary_large_image',
      title: author.displayName,
      description: author.bio.slice(0, 160),
      images: [ogUrl],
    },
  };
}

const SOURCE_LABEL: Record<string, string> = {
  BOOK: '📚 도서 기반 Author',
  EXPERT_DOC: '🎓 전문가 문서 Author',
  INTERNAL: '🏢 내부 자료 Author',
};

// ─────────────────────────────────────────────────────────────
export default async function AuthorProfilePage({ params }: AuthorDetailProps) {
  const { authorId } = await params;
  const author = MOCK_AUTHORS[authorId];

  // 미등록 authorId → 기본 플레이스홀더
  if (!author) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center px-4">
        <div className="text-6xl mb-6">👤</div>
        <h1 className="text-3xl font-black mb-3">Author를 찾을 수 없습니다</h1>
        <p className="text-slate-500 mb-8 text-center">
          <code className="text-slate-400 bg-white/5 px-2 py-0.5 rounded">{authorId}</code>에 해당하는 Author가 존재하지 않습니다.
        </p>
        <Link href="/authors" className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 py-4 rounded-2xl transition-colors">
          ← Author Hub로
        </Link>
      </div>
    );
  }

  // JSON-LD (Person)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: author.displayName,
    jobTitle: author.affiliation,
    description: author.bio,
    worksFor: { '@type': 'Organization', name: 'Cognitive Forge Market' },
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ── 상단 내비게이션 ─────────────────────────────────── */}
      <nav className="fixed top-0 w-full bg-[#0a0a0f]/80 backdrop-blur-md border-b border-white/[0.06] z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/authors" className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true">
              <path d="M10 4L6 8l4 4" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Author Hub로
          </Link>
          <div className="text-xs font-bold text-slate-500 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
            Author-Tenant Profile
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 pt-28 pb-32">

        {/* ── 프로필 헤더 ─────────────────────────────────── */}
        <header className="mb-16">
          <div className="flex flex-col md:flex-row gap-10 items-start">
            {/* 아바타 */}
            <div className="relative flex-shrink-0">
              <div className="w-32 h-32 rounded-2xl bg-slate-800 ring-2 ring-emerald-500/20 flex items-center justify-center text-5xl">
                {author.emoji}
              </div>
              {author.verified && (
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500/20 border-2 border-[#0a0a0f] border-emerald-500/30 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-label="SCL Verified">
                    <path d="M2.5 8.5l3.5 3.5 7.5-8" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
              )}
            </div>

            {/* 텍스트 */}
            <div className="flex-1">
              <div className="text-sm font-bold text-emerald-400 mb-2 tracking-wide">
                {SOURCE_LABEL[author.sourceType] ?? '📝 Author-Tenant'}
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2">{author.displayName}</h1>
              <div className="text-lg text-slate-400 font-medium mb-5">{author.affiliation}</div>
              <p className="text-slate-400 leading-relaxed text-base max-w-2xl">{author.bio}</p>

              {/* 통계 */}
              <div className="flex flex-wrap gap-6 mt-8">
                <div className="text-center">
                  <div className="text-3xl font-black text-white">{author.packCount}</div>
                  <div className="text-xs text-slate-500 font-semibold mt-1">출시 팩</div>
                </div>
                <div className="w-px h-12 bg-white/10 self-center" />
                <div className="text-center">
                  <div className="text-3xl font-black text-white">{author.totalRuns.toLocaleString()}</div>
                  <div className="text-xs text-slate-500 font-semibold mt-1">총 실행</div>
                </div>
                <div className="w-px h-12 bg-white/10 self-center" />
                <div className="text-center">
                  <div className="text-3xl font-black text-emerald-400">SCL</div>
                  <div className="text-xs text-slate-500 font-semibold mt-1">검증 완료</div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="h-px bg-white/[0.06] mb-16" />

        {/* ── 공식 AgentPack 목록 ──────────────────────────── */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
            <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 1l1.85 3.75L14 5.5l-3 2.92.71 4.13L8 10.5l-3.71 1.95.71-4.13L2 5.5l4.15-.75L8 1z"/>
            </svg>
            이 Author의 공식 AgentPack
          </h2>

          <div className="space-y-5">
            {author.packs.map((pack) => (
              <article
                key={pack.id}
                className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-emerald-500/20 hover:bg-emerald-950/10 transition-all p-6"
              >
                <div className="flex items-start gap-5">
                  {/* 이모지 */}
                  <div className="w-14 h-14 rounded-xl bg-slate-800 flex items-center justify-center text-2xl flex-shrink-0">
                    {pack.emoji}
                  </div>

                  {/* 내용 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <SCLBadge status={pack.status as PackStatus} size="sm" />
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <svg className="w-3 h-3 text-emerald-400" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                          <path d="M6 3.5l6 4.5-6 4.5V3.5z"/>
                        </svg>
                        {pack.runCount.toLocaleString()}회 실행
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-emerald-300 transition-colors">
                      {pack.title}
                    </h3>
                    <p className="text-slate-500 text-sm leading-relaxed">
                      {pack.description}
                    </p>
                  </div>

                  {/* CTA */}
                  <Link
                    href={`/packs/${pack.id}`}
                    className="flex-shrink-0 inline-flex items-center gap-2 text-sm font-bold bg-white/5 hover:bg-emerald-600 border border-white/10 hover:border-emerald-500 text-slate-300 hover:text-white px-4 py-2 rounded-xl transition-all"
                  >
                    팩 보기 →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
