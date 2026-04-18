<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# cognitive-forge-market 추가 규칙

## 절대 규칙: Pack 노출 필터
agent_packs를 조회하는 모든 쿼리에는 반드시 다음 필터를 포함해야 합니다:
```typescript
.in('status', ['SCL_VERIFIED', 'FEATURED'])
```
이 필터 없이 팩을 노출하는 것은 **절대 금지**입니다.

## API 인증 규칙
- `/api/pok-distribute`: `x-internal-secret` 헤더 필수 검증
- `/api/cron/quest-spawn`: `Authorization: Bearer {CRON_SECRET}` 필수 검증
- `/api/run`: Vercel KV Rate Limit 필수 적용

## SSE 스트리밍 규칙
- `/api/run`은 반드시 SSE(Server-Sent Events) 방식으로 응답
- Content-Type: text/event-stream
- Runtime: nodejs (edge 아님)

## 타입 참조
- 모든 DB 타입은 `src/types/database.ts` 참조
- UI Forge 타입은 `src/types/ui-forge.ts` 참조
<!-- END:nextjs-agent-rules -->
