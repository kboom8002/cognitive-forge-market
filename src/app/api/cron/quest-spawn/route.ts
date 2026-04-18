/**
 * src/app/api/cron/quest-spawn/route.ts
 * 퀘스트 자동 스폰 Cron API — SDD-12 §3
 *
 * AGENTS.md 규칙:
 *   - Authorization: Bearer {CRON_SECRET} 필수 검증
 *
 * Vercel Cron: 매일 UTC 00:00 (KST 09:00) 자동 실행
 * 수동 테스트: GET /api/cron/quest-spawn
 *              Header: Authorization: Bearer {CRON_SECRET}
 */
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

// service_role 클라이언트 (quest_board INSERT 권한)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── 베스트셀러 타입 ────────────────────────────────────────────
interface Bestseller {
  title: string;
  author: string;
  rank: number;
  category?: string;
}

// ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  // ── 1. Cron 인증 (AGENTS.md 필수) ────────────────────────────
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // CRON_SECRET 미설정 시 개발 환경에서만 통과
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // CRON_SECRET이 없고 프로덕션이면 차단
  if (!cronSecret && process.env.NODE_ENV === 'production') {
    return Response.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }

  try {
    // ── 2. 베스트셀러 파싱 ────────────────────────────────────
    const bestsellers = await fetchBestsellers();

    if (bestsellers.length === 0) {
      return Response.json({ error: 'No bestsellers fetched' }, { status: 500 });
    }

    // ── 3. 오늘의 퀘스트 생성 (Top 1 도서 기반) ───────────────
    const topBook = bestsellers[0];
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 7); // 7일 후 마감

    // 중복 퀘스트 방지: 오늘 이미 같은 책으로 퀘스트가 생성됐는지 확인
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: existing } = await supabase
      .from('quest_board')
      .select('quest_id')
      .eq('target_book_title', topBook.title)
      .gte('created_at', todayStart.toISOString())
      .limit(1)
      .maybeSingle();

    if (existing) {
      return Response.json({
        success: true,
        skipped: true,
        reason: '오늘 이미 같은 책으로 퀘스트가 생성되었습니다.',
        questId: existing.quest_id,
        book: topBook.title,
      });
    }

    // ── 4. quest_board INSERT ────────────────────────────────
    const questTitle = `📚 "${topBook.title}" 전문 AI 팩을 가장 먼저 출시하세요!`;

    const { data: quest, error: insertError } = await supabase
      .from('quest_board')
      .insert({
        title: questTitle,
        target_book_title: topBook.title,
        reward_pok: 50000,
        deadline_at: deadline.toISOString(),
      })
      .select('quest_id')
      .single();

    if (insertError) {
      throw new Error(`quest_board INSERT 실패: ${insertError.message}`);
    }

    // ── 5. 연관 팩 status → FEATURED 업데이트 (옵셔널) ────────
    // foundation_sources.title이 동일한 팩 → FEATURED 상향
    const { data: linkedPacks } = await supabase
      .from('agent_packs')
      .select('pack_id, foundation_source_id, foundation_sources!inner(title)')
      .ilike('foundation_sources.title', `%${topBook.title}%`)
      .in('status', ['SCL_VERIFIED'])
      .limit(3);

    let featuredCount = 0;
    if (linkedPacks && linkedPacks.length > 0) {
      const packIds = linkedPacks.map((p) => p.pack_id);
      const { error: updateError } = await supabase
        .from('agent_packs')
        .update({ status: 'FEATURED' })
        .in('pack_id', packIds);

      if (!updateError) featuredCount = packIds.length;
    }

    console.log(
      `[quest-spawn] ✅ 퀘스트 생성 완료: "${topBook.title}" — ID: ${quest.quest_id}, ` +
      `FEATURED 팩 업데이트: ${featuredCount}개`
    );

    return Response.json({
      success: true,
      questId: quest.quest_id,
      book: topBook.title,
      author: topBook.author,
      rank: topBook.rank,
      rewardPoK: 50000,
      deadline: deadline.toISOString(),
      featuredPacksUpdated: featuredCount,
      message: `퀘스트 생성 완료: ${topBook.title}`,
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    console.error('[quest-spawn] 오류:', message);
    return Response.json({ error: message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────
/**
 * 베스트셀러 파싱 함수
 *
 * Priority:
 *   1. 알라딘 오픈 API (실제 데이터)  ← TODO: API Key 발급 필요
 *   2. Hardcoded Fallback (개발/데모용)
 *
 * TODO: 알라딘 API 연동
 *   - 발급: https://www.aladin.co.kr/ttb/wblog_manage.aspx
 *   - URL: http://www.aladin.co.kr/ttb/api/ItemList.aspx?ttbkey={KEY}&QueryType=Bestseller
 *   - 환경변수: ALADIN_API_KEY
 */
async function fetchBestsellers(): Promise<Bestseller[]> {
  // Option A: 알라딘 API (TTB Open API)
  if (process.env.ALADIN_API_KEY) {
    try {
      const url = new URL('http://www.aladin.co.kr/ttb/api/ItemList.aspx');
      url.searchParams.set('ttbkey', process.env.ALADIN_API_KEY);
      url.searchParams.set('QueryType', 'Bestseller');
      url.searchParams.set('MaxResults', '10');
      url.searchParams.set('start', '1');
      url.searchParams.set('SearchTarget', 'Book');
      url.searchParams.set('output', 'js');
      url.searchParams.set('Version', '20131101');
      url.searchParams.set('CategoryId', '170'); // 경제경영

      const res = await fetch(url.toString(), {
        next: { revalidate: 3600 }, // 1시간 캐시
      });

      if (res.ok) {
        // 알라딘 API는 JSONP 형태 → 파싱
        const text = await res.text();
        // "var _express = {...}" 형식이므로 JSON 부분 추출
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const json = JSON.parse(jsonMatch[0]) as {
            item?: { title: string; author: string }[];
          };
          if (json.item && json.item.length > 0) {
            return json.item.slice(0, 10).map((book, idx) => ({
              title: book.title.split(' - ')[0].trim(), // 부제목 분리
              author: book.author,
              rank: idx + 1,
              category: '경제경영',
            }));
          }
        }
      }
    } catch (e) {
      console.warn('[quest-spawn] 알라딘 API 실패 — Fallback 사용:', e);
    }
  }

  // Option B: Hardcoded Fallback (개발/데모용)
  // 실제 2024년 국내 베스트셀러 기반
  const FALLBACK_BESTSELLERS: Bestseller[] = [
    { title: '원씽', author: '게리 켈러', rank: 1, category: '자기계발' },
    { title: '아주 작은 습관의 힘', author: '제임스 클리어', rank: 2, category: '자기계발' },
    { title: '그릿', author: '앤절라 더크워스', rank: 3, category: '자기계발' },
    { title: '도둑맞은 집중력', author: '요한 하리', rank: 4, category: '심리' },
    { title: '제로 투 원', author: '피터 틸', rank: 5, category: '경영' },
    { title: '린 스타트업', author: '에릭 리스', rank: 6, category: '경영' },
    { title: 'The Mom Test', author: '롭 피츠패트릭', rank: 7, category: '스타트업' },
    { title: '생각에 관한 생각', author: '대니얼 카너먼', rank: 8, category: '심리' },
    { title: '설득의 심리학', author: '로버트 치알디니', rank: 9, category: '심리' },
    { title: '넛지', author: '리처드 탈러', rank: 10, category: '행동경제학' },
  ];

  // 매일 다른 책이 1위가 되도록 날짜 기반 로테이션
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
    (1000 * 60 * 60 * 24)
  );
  const offset = dayOfYear % FALLBACK_BESTSELLERS.length;

  // 오프셋 기반으로 순서 재배열 (rotate)
  return [
    ...FALLBACK_BESTSELLERS.slice(offset),
    ...FALLBACK_BESTSELLERS.slice(0, offset),
  ].map((book, idx) => ({ ...book, rank: idx + 1 }));
}
