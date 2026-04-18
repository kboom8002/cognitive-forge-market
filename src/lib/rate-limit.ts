/**
 * src/lib/rate-limit.ts
 * Vercel KV 기반 Rate Limiting — SDD-03 §5, AGENTS.md
 *
 * 전략:
 *   - identifier: IP + userId 복합 키 (IP 단독보다 정밀)
 *   - 슬라이딩 윈도우: 1분에 MAX_REQUESTS회 허용
 *   - Vercel KV 미연결(로컬/개발) 시 → 항상 허용 (graceful fallback)
 */

const MAX_REQUESTS = 10;  // 1분간 최대 요청 수
const WINDOW_SECONDS = 60;

/**
 * Rate Limit 확인
 *
 * @param ip       X-Forwarded-For 헤더 값 (또는 'anonymous')
 * @param userId   로그인 사용자 ID (없으면 생략)
 * @returns        true → 허용, false → 차단
 */
export async function checkRateLimit(ip: string, userId?: string | null): Promise<boolean> {
  // Vercel KV 환경 변수 없으면 항상 허용 (로컬 개발 환경)
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;

  if (!kvUrl || !kvToken) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[RateLimit] Vercel KV 미연결 — 개발 환경 Bypass');
    }
    return true;
  }

  try {
    // 복합 identifier: userId > IP (더 정밀한 식별)
    const identifier = userId ? `uid:${userId}` : `ip:${ip.split(',')[0].trim()}`;
    const key = `rl:run:${identifier}`;

    // KV REST API: INCR + TTL 설정
    // 1. 현재 count 조회
    const getRes = await fetch(`${kvUrl}/get/${key}`, {
      headers: { Authorization: `Bearer ${kvToken}` },
      cache: 'no-store',
    });
    const getJson = await getRes.json() as { result: string | null };
    const current = parseInt(getJson.result ?? '0', 10);

    if (current >= MAX_REQUESTS) {
      return false; // 차단
    }

    // 2. INCR
    const incrRes = await fetch(`${kvUrl}/incr/${key}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${kvToken}` },
    });
    const incrJson = await incrRes.json() as { result: number };

    // 3. 첫 요청일 때 TTL 설정 (EXPIRE)
    if (incrJson.result === 1) {
      await fetch(`${kvUrl}/expire/${key}/${WINDOW_SECONDS}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${kvToken}` },
      });
    }

    return true;
  } catch (err) {
    // KV 오류 시 허용 (가용성 우선)
    console.error('[RateLimit] KV 오류 — 허용 처리:', err);
    return true;
  }
}

/**
 * 남은 요청 횟수 조회 (헤더 노출용)
 */
export async function getRateLimitRemaining(ip: string, userId?: string | null): Promise<number> {
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  if (!kvUrl || !kvToken) return MAX_REQUESTS;

  try {
    const identifier = userId ? `uid:${userId}` : `ip:${ip.split(',')[0].trim()}`;
    const key = `rl:run:${identifier}`;
    const res = await fetch(`${kvUrl}/get/${key}`, {
      headers: { Authorization: `Bearer ${kvToken}` },
      cache: 'no-store',
    });
    const json = await res.json() as { result: string | null };
    const current = parseInt(json.result ?? '0', 10);
    return Math.max(0, MAX_REQUESTS - current);
  } catch {
    return MAX_REQUESTS;
  }
}
