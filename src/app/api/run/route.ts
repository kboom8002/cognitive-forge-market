/**
 * src/app/api/run/route.ts
 * Pack Run API — SSE 스트리밍 실행 엔진
 *
 * SDD-06 §5 전체 구현
 * AGENTS.md 규칙:
 *   - runtime: nodejs (edge 아님 — 파일 처리 필요)
 *   - SSE 방식 응답 (Content-Type: text/event-stream)
 *   - agent_packs 조회 시 .in('status', ['SCL_VERIFIED', 'FEATURED']) 필수
 */
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { checkRateLimit } from '@/lib/rate-limit';
import { assembleSystemPrompt, assembleUserMessage } from '@/lib/assemble-prompt';
import type { TaskflowBlocks } from '@/lib/assemble-prompt';

export const runtime = 'nodejs';  // AGENTS.md SSE 규칙

// ── Supabase Admin (service_role — RLS 우회) ─────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── OpenAI 클라이언트 (Key 없으면 undefined) ──────────────────
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// ── SSE 헬퍼 ─────────────────────────────────────────────────
const encoder = new TextEncoder();

function sseEvent(payload: object): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);
}

// ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // ── 1. Rate Limit (AGENTS.md — Vercel KV 필수 적용) ───────
  const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
  const allowed = await checkRateLimit(ip);
  if (!allowed) {
    return new Response(
      JSON.stringify({ error: '요청 한도 초과. 잠시 후 다시 시도해주세요.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // ── 2. FormData 파싱 ──────────────────────────────────────
  let packId: string;
  let inputs: Record<string, string>;
  let learnerId: string | null;
  let mcpContext: string | null;

  try {
    const formData = await req.formData();
    packId = (formData.get('packId') as string | null) ?? '';
    const rawInputs = formData.get('inputs') as string | null;
    inputs = rawInputs ? JSON.parse(rawInputs) : {};
    learnerId = formData.get('learnerId') as string | null;
    mcpContext = formData.get('mcp_context') as string | null;
  } catch {
    return Response.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 });
  }

  if (!packId) {
    return Response.json({ error: 'packId는 필수입니다.' }, { status: 400 });
  }

  // ── 3. Pack 조회 + 검증 ───────────────────────────────────
  // AGENTS.md 절대 규칙: .in('status', ['SCL_VERIFIED', 'FEATURED'])
  const { data: pack, error: packError } = await supabase
    .from('agent_packs')
    .select('pack_id, taskflow_blocks, status, foundation_source_id')
    .eq('pack_id', packId)
    .in('status', ['SCL_VERIFIED', 'FEATURED'])
    .single();

  if (packError || !pack) {
    // ── 개발 환경 Mock Fallback ────────────────────────────
    // Supabase 미연결 + mock-* ID → 데모 스트리밍 허용
    // 프로덕션에서는 이 분기에 절대 진입하지 않음 (NODE_ENV 확인)
    const isMockId = packId.startsWith('mock-');
    if (process.env.NODE_ENV === 'development' && isMockId) {
      const stream = new ReadableStream({
        async start(controller) {
          try {
            await mockStreaming(controller, packId, learnerId);
          } catch (e) {
            controller.enqueue(sseEvent({ type: 'error', message: String(e) }));
          } finally {
            controller.close();
          }
        },
      });
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
    }

    return Response.json(
      { error: '팩을 찾을 수 없거나 검증되지 않은 팩입니다.' },
      { status: 404 }
    );
  }

  // ── 4. SSE ReadableStream 생성 ────────────────────────────
  const stream = new ReadableStream({
    async start(controller) {
      const startTime = Date.now();

      try {
        // ── 5A. OPENAI_API_KEY 없으면 Mock Streaming ─────────
        if (!openai) {
          await mockStreaming(controller, packId, learnerId);
          return;
        }

        // ── 5B. 프롬프트 조립 ────────────────────────────────
        const blocks = (pack.taskflow_blocks ?? {}) as TaskflowBlocks;
        const systemPrompt = assembleSystemPrompt(blocks, inputs);

        // MCP 컨텍스트 주입 (SDD-13)
        const finalSystem = mcpContext
          ? `[Personal Context]\n${mcpContext}\n\n---\n\n${systemPrompt}`
          : systemPrompt;

        const userMessage = assembleUserMessage(inputs);

        // ── 6. OpenAI 스트리밍 ────────────────────────────────
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          stream: true,
          temperature: 0.4,
          max_tokens: 2000,
          messages: [
            { role: 'system', content: finalSystem },
            { role: 'user', content: userMessage },
          ],
        });

        let fullOutput = '';

        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content ?? '';
          if (content) {
            fullOutput += content;
            controller.enqueue(sseEvent({ type: 'chunk', content }));
          }
        }

        // ── 7. run_logs INSERT (비동기) ───────────────────────
        // TODO: 과금 정책 연동 (현재 하드코딩 200원)
        const chargeAmount = 200;
        const durationMs = Date.now() - startTime;

        const { data: runLog } = await supabase
          .from('run_logs')
          .insert({
            pack_id: packId,
            learner_id: learnerId ?? null,
            charge_amount: chargeAmount,
            output_snapshot: fullOutput.slice(0, 500),
            duration_ms: durationMs,
          })
          .select('run_id')
          .single();

        // ── 8. PoK 분배 트리거 (fire-and-forget) ──────────────
        // AGENTS.md: /api/pok-distribute에 x-internal-secret 헤더 필수
        if (runLog?.run_id && chargeAmount > 0) {
          const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
          fetch(`${baseUrl}/api/pok-distribute`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-internal-secret': process.env.INTERNAL_API_SECRET ?? '',
            },
            body: JSON.stringify({
              runId: runLog.run_id,
              packId,
              chargeAmount,
            }),
          }).catch((e) => console.error('[PoK] fire-and-forget 오류:', e));
        }

        // ── 9. 완료 이벤트 ────────────────────────────────────
        controller.enqueue(
          sseEvent({
            type: 'done',
            runId: runLog?.run_id ?? crypto.randomUUID(),
            chargeAmount,
          })
        );

      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : '알 수 없는 오류';
        console.error('[/api/run] 스트리밍 오류:', message);
        controller.enqueue(sseEvent({ type: 'error', message }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',  // nginx 버퍼링 비활성화
    },
  });
}

// ─────────────────────────────────────────────────────────────
// Mock Streaming (SDD-06 §6)
// OPENAI_API_KEY 없을 때 개발/데모 폴백
// ─────────────────────────────────────────────────────────────
async function mockStreaming(
  controller: ReadableStreamDefaultController,
  packId: string,
  learnerId: string | null
): Promise<void> {
  const mockOutput = [
    '## [DEMO] AI 분석 결과\n\n',
    '이 팩은 **SCL 검증 완료**된 AgentPack입니다.\n\n',
    '### 주요 분석\n',
    '- ✅ 입력 변수가 정상적으로 수신되었습니다.\n',
    '- ✅ 8-Block 프롬프트 조립 완료\n',
    '- ✅ SSE 스트리밍 파이프라인 정상 동작\n\n',
    '### 다음 단계\n',
    '`OPENAI_API_KEY`를 `.env.local`에 등록하면 실제 GPT-4o 결과를 받을 수 있습니다.\n\n',
    '```\n',
    'OPENAI_API_KEY=sk-...\n',
    '```\n\n',
    '> 💡 Cognitive Forge Market은 Learner가 AI 지식을 실전에 적용할 수 있는 플랫폼입니다.\n',
  ];

  for (const chunk of mockOutput) {
    controller.enqueue(
      encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`)
    );
    // 첫 청크 < 1s 목표: 이후 50ms 딜레이로 스트리밍 효과
    await new Promise((r) => setTimeout(r, 50));
  }

  // Mock run_logs INSERT (비동기 — 실패해도 무시)
  const chargeAmount = 200; // TODO: 과금 정책 연동
  void supabase
    .from('run_logs')
    .insert({
      pack_id: packId,
      learner_id: learnerId ?? null,
      charge_amount: chargeAmount,
      output_snapshot: '[DEMO] Mock output',
    });

  controller.enqueue(
    encoder.encode(
      `data: ${JSON.stringify({
        type: 'done',
        runId: crypto.randomUUID(),
        chargeAmount,
      })}\n\n`
    )
  );
}
