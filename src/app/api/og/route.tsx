/**
 * src/app/api/og/route.tsx
 * Dynamic OG Image Generator — SDD-11 §2
 *
 * 기존 phalanx-media 로직 유지 + Pack/Author/Home 타입 분기 추가
 *
 * 지원 파라미터:
 *   ?type=pack&packId={uuid}       → PackOGTemplate
 *   ?type=author&authorId={uuid}   → AuthorOGTemplate
 *   ?type=home                     → HomeOGTemplate
 *   ?type=FACT+CHECK&title={str}   → 기존 phalanx-media 로직 (유지)
 *   ?type=CANON&title={str}        → 기존 phalanx-media 로직 (유지)
 */
import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// ── 환경변수 (Edge Runtime에서는 process.env 직접 접근) ────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

// ── Supabase 데이터 패치 (Edge 호환 — fetch만 사용) ─────────
async function fetchPackForOG(packId: string) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/agent_packs?pack_id=eq.${packId}&status=in.(SCL_VERIFIED,FEATURED)&select=pack_id,status,run_count,micro_saas_ui_schema`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Accept: 'application/json',
        },
        // Edge Runtime — Next.js cache revalidate
        next: { revalidate: 60 },
      }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return rows?.[0] ?? null;
  } catch {
    return null;
  }
}

async function fetchAuthorForOG(authorId: string) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/foundation_sources?author_tenant_id=eq.${authorId}&select=author_tenant_id,title,source_type`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Accept: 'application/json',
        },
        next: { revalidate: 300 },
      }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return rows?.[0] ?? null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// OG 템플릿 컴포넌트 (ImageResponse 내부용 JSX — 인라인 스타일만 사용)
// ─────────────────────────────────────────────────────────────

// ── Home OG ────────────────────────────────────────────────
function HomeOGTemplate() {
  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0a0a0f',
        color: '#ffffff',
        padding: '80px',
        fontFamily: 'sans-serif',
        position: 'relative',
      }}
    >
      {/* 배경 그라데이션 원 */}
      <div
        style={{
          position: 'absolute',
          top: -100,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 800,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)',
          display: 'flex',
        }}
      />

      {/* 로고 영역 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 40 }}>
        <div
          style={{
            width: 72,
            height: 72,
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            borderRadius: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 36,
          }}
        >
          ⚡
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 42, fontWeight: 900, letterSpacing: '-0.02em' }}>
            Cognitive Forge
          </span>
          <span style={{ fontSize: 24, color: '#7c3aed', fontWeight: 700, letterSpacing: '0.1em' }}>
            MARKET
          </span>
        </div>
      </div>

      {/* 슬로건 */}
      <div
        style={{
          fontSize: 56,
          fontWeight: 900,
          textAlign: 'center',
          lineHeight: 1.2,
          letterSpacing: '-0.03em',
          maxWidth: 900,
          display: 'flex',
        }}
      >
        AI 검증 완료된 지식 패키지를 즉시 실행하세요
      </div>

      {/* 서브텍스트 */}
      <div
        style={{
          fontSize: 28,
          color: '#64748b',
          marginTop: 32,
          fontWeight: 500,
          textAlign: 'center',
          display: 'flex',
        }}
      >
        SCL Verified · 8-Block AgentPack · PoK 배당
      </div>

      {/* 하단 도메인 */}
      <div
        style={{
          position: 'absolute',
          bottom: 48,
          right: 80,
          fontSize: 24,
          color: '#334155',
          fontWeight: 700,
          display: 'flex',
        }}
      >
        market.cognitiveforge.io
      </div>
    </div>
  );
}

// ── Pack OG (SDD-11 §2 명세) ──────────────────────────────
function PackOGTemplate({
  title,
  description,
  runCount,
  isVerified,
  isFeatured,
  emoji,
}: {
  title: string;
  description: string;
  runCount: number;
  isVerified: boolean;
  isFeatured: boolean;
  emoji: string;
}) {
  const safeTitle = title.length > 45 ? title.slice(0, 45) + '…' : title;
  const safeDesc = description.length > 80 ? description.slice(0, 80) + '…' : description;

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        backgroundColor: '#0a0a0f',
        color: '#ffffff',
        padding: '72px 80px',
        fontFamily: 'sans-serif',
        position: 'relative',
      }}
    >
      {/* 배경 글로우 */}
      <div
        style={{
          position: 'absolute',
          top: -80,
          right: -80,
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: isFeatured
            ? 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)',
          display: 'flex',
        }}
      />

      {/* 상단: 배지 */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        {(isVerified || isFeatured) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 20px',
              borderRadius: 999,
              border: isFeatured ? '1px solid rgba(124,58,237,0.5)' : '1px solid rgba(16,185,129,0.5)',
              backgroundColor: isFeatured ? 'rgba(124,58,237,0.15)' : 'rgba(16,185,129,0.1)',
              fontSize: 22,
              fontWeight: 800,
              color: isFeatured ? '#c4b5fd' : '#6ee7b7',
            }}
          >
            {isFeatured ? '★ Featured · AI Verified' : '✓ AI Verified'}
          </div>
        )}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            borderRadius: 999,
            backgroundColor: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            fontSize: 22,
            fontWeight: 700,
            color: '#94a3b8',
          }}
        >
          🔥 {runCount.toLocaleString()}회 실행
        </div>
      </div>

      {/* 중단: 팩 정보 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, flex: 1, justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          {/* 이모지 커버 */}
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 28,
              backgroundColor: isFeatured ? 'rgba(124,58,237,0.2)' : 'rgba(30,41,59,0.8)',
              border: isFeatured ? '1.5px solid rgba(124,58,237,0.4)' : '1.5px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 56,
              flexShrink: 0,
            }}
          >
            {emoji}
          </div>

          {/* 제목 + 설명 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                fontSize: 58,
                fontWeight: 900,
                lineHeight: 1.15,
                letterSpacing: '-0.03em',
                color: '#ffffff',
                display: 'flex',
              }}
            >
              {safeTitle}
            </div>
            <div
              style={{
                fontSize: 28,
                color: '#64748b',
                fontWeight: 500,
                lineHeight: 1.4,
                display: 'flex',
              }}
            >
              {safeDesc}
            </div>
          </div>
        </div>
      </div>

      {/* 하단: 브랜딩 */}
      <div
        style={{
          display: 'flex',
          width: '100%',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          paddingTop: 32,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
            }}
          >
            ⚡
          </div>
          <span style={{ fontSize: 28, fontWeight: 800, color: '#ffffff', display: 'flex' }}>
            Cognitive Forge Market
          </span>
        </div>
        <span style={{ fontSize: 22, color: '#334155', fontWeight: 600, display: 'flex' }}>
          market.cognitiveforge.io
        </span>
      </div>
    </div>
  );
}

// ── Author OG ───────────────────────────────────────────────
function AuthorOGTemplate({
  displayName,
  affiliation,
  sourceType,
  emoji,
}: {
  displayName: string;
  affiliation: string;
  sourceType: string;
  emoji: string;
}) {
  const SOURCE_LABEL: Record<string, string> = {
    BOOK: '📚 도서 기반 Author',
    EXPERT_DOC: '🎓 전문가 문서 Author',
    INTERNAL: '🏢 내부 자료 Author',
  };

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0a0a0f',
        color: '#ffffff',
        padding: '80px',
        fontFamily: 'sans-serif',
        position: 'relative',
        gap: 40,
      }}
    >
      {/* 배경 글로우 */}
      <div
        style={{
          position: 'absolute',
          top: -100,
          left: '50%',
          width: 600,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)',
          display: 'flex',
        }}
      />

      {/* Author 배지 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 24px',
          borderRadius: 999,
          border: '1px solid rgba(16,185,129,0.4)',
          backgroundColor: 'rgba(16,185,129,0.1)',
          fontSize: 22,
          fontWeight: 800,
          color: '#6ee7b7',
        }}
      >
        ✓ SCL Verified Author-Tenant
      </div>

      {/* 이모지 아바타 */}
      <div
        style={{
          width: 140,
          height: 140,
          borderRadius: 32,
          backgroundColor: 'rgba(30,41,59,0.8)',
          border: '2px solid rgba(16,185,129,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 72,
        }}
      >
        {emoji}
      </div>

      {/* 이름 + 소속 */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div
          style={{
            fontSize: 64,
            fontWeight: 900,
            letterSpacing: '-0.03em',
            color: '#ffffff',
            display: 'flex',
          }}
        >
          {displayName}
        </div>
        <div
          style={{
            fontSize: 30,
            color: '#64748b',
            fontWeight: 500,
            display: 'flex',
          }}
        >
          {affiliation}
        </div>
        <div
          style={{
            fontSize: 24,
            color: '#10b981',
            fontWeight: 600,
            display: 'flex',
          }}
        >
          {SOURCE_LABEL[sourceType] ?? '📝 Author-Tenant'}
        </div>
      </div>

      {/* 하단 브랜딩 */}
      <div
        style={{
          position: 'absolute',
          bottom: 48,
          display: 'flex',
          width: '100%',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingLeft: 80,
          paddingRight: 80,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          paddingTop: 32,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
            }}
          >
            ⚡
          </div>
          <span style={{ fontSize: 28, fontWeight: 800, display: 'flex' }}>Cognitive Forge Market</span>
        </div>
        <span style={{ fontSize: 22, color: '#334155', fontWeight: 600, display: 'flex' }}>
          market.cognitiveforge.io
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// GET Handler
// ─────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') ?? 'home';

    // ── [NEW] Pack OG (SDD-11 §2) ──────────────────────────
    if (type === 'pack') {
      const packId = searchParams.get('packId') ?? '';

      // 성능 최적화: URL에 fallback 파라미터 모두 있으면 DB 조회 스킵
      // generateMetadata에서 이미 모든 파라미터를 OG URL에 채워 전달함
      const hasAllFallbacks =
        searchParams.has('title') &&
        searchParams.has('emoji') &&
        searchParams.has('runs') &&
        searchParams.has('status');

      const packData = hasAllFallbacks ? null : await fetchPackForOG(packId);

      // Supabase 미연결 or 팩 없음 → URL 파라미터 fallback
      const schema = packData?.micro_saas_ui_schema ?? {};
      const title = searchParams.get('title') ?? schema?.title ?? 'AgentPack';
      const description = searchParams.get('desc') ?? schema?.description ?? 'SCL Verified AI 팩';
      const emoji = searchParams.get('emoji') ?? schema?.cover_emoji ?? '🤖';
      const runCount = packData?.run_count ?? parseInt(searchParams.get('runs') ?? '0', 10);
      const status = packData?.status ?? searchParams.get('status') ?? 'SCL_VERIFIED';

      return new ImageResponse(
        <PackOGTemplate
          title={title}
          description={description}
          runCount={runCount}
          isVerified={['SCL_VERIFIED', 'FEATURED'].includes(status)}
          isFeatured={status === 'FEATURED'}
          emoji={emoji}
        />,
        { width: 1200, height: 630 }
      );
    }

    // ── [NEW] Author OG (SDD-11 §2) ───────────────────────
    if (type === 'author') {
      const authorId = searchParams.get('authorId') ?? '';
      const authorData = await fetchAuthorForOG(authorId);

      const displayName = searchParams.get('name') ?? authorData?.title ?? 'Author';
      const affiliation = searchParams.get('aff') ?? '전문가';
      const sourceType = authorData?.source_type ?? searchParams.get('sourceType') ?? 'EXPERT_DOC';
      const emoji = searchParams.get('emoji') ?? '👤';

      return new ImageResponse(
        <AuthorOGTemplate
          displayName={displayName}
          affiliation={affiliation}
          sourceType={sourceType}
          emoji={emoji}
        />,
        { width: 1200, height: 630 }
      );
    }

    // ── [NEW] Home OG ─────────────────────────────────────
    if (type === 'home') {
      return new ImageResponse(<HomeOGTemplate />, { width: 1200, height: 630 });
    }

    // ── [ORIGINAL] phalanx-media 기존 로직 (유지) ──────────
    const title = searchParams.get('title') ?? '문화강국 공식 아카이브 (VQCP)';
    const safeTitle = title.length > 55 ? title.slice(0, 55) + '...' : title;

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            backgroundColor: type === 'FACT CHECK' ? '#0f172a' : '#faf9f6',
            color: type === 'FACT CHECK' ? '#ffffff' : '#0f172a',
            padding: '80px',
            fontFamily: 'sans-serif',
          }}
        >
          {/* Top Stamp / Label */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: type === 'FACT CHECK' ? '#e11d48' : '#4f46e5',
              padding: '12px 24px',
              borderRadius: '999px',
              fontWeight: 900,
              fontSize: '24px',
              letterSpacing: '0.1em',
              color: 'white',
              border: type === 'FACT CHECK' ? 'none' : '1px solid #c7d2fe',
            }}
          >
            {type === 'FACT CHECK' ? '🚨 공식 팩트체크' : '📖 국가전략노트 (The Canon)'}
          </div>

          {/* Main Title */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              marginTop: '40px',
              marginBottom: '40px',
            }}
          >
            <div
              style={{
                fontSize: '64px',
                fontWeight: 900,
                lineHeight: 1.3,
                letterSpacing: '-0.02em',
                display: 'flex',
                flexWrap: 'wrap',
                whiteSpace: 'pre-wrap',
                maxWidth: '1000px',
              }}
            >
              {safeTitle}
            </div>

            {type === 'FACT CHECK' && (
              <div
                style={{
                  fontSize: '32px',
                  color: '#94a3b8',
                  marginTop: '20px',
                  fontWeight: 500,
                }}
              >
                잘못된 허위 프레임입니다. 공식 해명과 데이터를 확인하세요.
              </div>
            )}
          </div>

          {/* Footer Branding */}
          <div
            style={{
              display: 'flex',
              width: '100%',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: type === 'FACT CHECK' ? '2px solid #1e293b' : '2px solid #e2e8f0',
              paddingTop: '32px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '40px', height: '40px', backgroundColor: '#2563eb', borderRadius: '8px' }}></div>
              <span style={{ fontSize: '28px', fontWeight: 800 }}>VQCP Statesman</span>
            </div>
            <div style={{ fontSize: '24px', color: type === 'FACT CHECK' ? '#64748b' : '#94a3b8', fontWeight: 500 }}>
              phalanx.co
            </div>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.log(`[OG Error] ${msg}`);
    return new Response(`Failed to generate the image`, { status: 500 });
  }
}
