/**
 * src/lib/run-pack.ts
 * SSE 스트리밍 클라이언트 — SDD-05 §7
 *
 * /api/run은 SSE(text/event-stream) 방식으로 응답 (AGENTS.md SSE 규칙)
 * File 타입 입력은 base64 DataURL로 변환하여 JSON으로 전송
 */

/** File → base64 DataURL */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * AgentPack 실행 — SSE 스트리밍
 *
 * @param packId       실행할 팩 ID
 * @param inputs       variable_key → string | File 매핑
 * @param mcpContext   Personal MCP 컨텍스트 (옵션, SDD-13)
 * @param onChunk      청크 수신 콜백
 * @param onDone       완료 콜백 (runId, chargeAmount)
 * @param onError      오류 콜백
 */
export async function runPack(
  packId: string,
  inputs: Record<string, string | File>,
  mcpContext: string | undefined,
  onChunk: (chunk: string) => void,
  onDone: (runId: string, chargeAmount: number) => void,
  onError: (error: string) => void
): Promise<void> {
  // File 입력을 base64로 변환
  const processedInputs: Record<string, string> = {};
  for (const [key, val] of Object.entries(inputs)) {
    if (val instanceof File) {
      processedInputs[key] = await fileToBase64(val);
    } else {
      processedInputs[key] = val;
    }
  }

  // FormData 구성
  const formData = new FormData();
  formData.append('packId', packId);
  formData.append('inputs', JSON.stringify(processedInputs));
  if (mcpContext) formData.append('mcp_context', mcpContext);

  let response: Response;
  try {
    response = await fetch('/api/run', {
      method: 'POST',
      body: formData,
    });
  } catch (err) {
    onError(err instanceof Error ? err.message : '네트워크 오류가 발생했습니다.');
    return;
  }

  if (!response.ok) {
    try {
      const err = await response.json();
      onError(err.error ?? `HTTP ${response.status}`);
    } catch {
      onError(`HTTP ${response.status}`);
    }
    return;
  }

  // SSE 스트림 읽기
  const reader = response.body?.getReader();
  if (!reader) {
    onError('스트림을 읽을 수 없습니다.');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // 버퍼에서 완전한 SSE 라인 처리
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? ''; // 마지막 불완전 라인은 버퍼에 보존

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;

        const raw = trimmed.slice(6);
        if (raw === '[DONE]') continue;

        try {
          const data = JSON.parse(raw);
          if (data.type === 'chunk' && typeof data.content === 'string') {
            onChunk(data.content);
          } else if (data.type === 'done') {
            onDone(data.runId ?? '', data.chargeAmount ?? 0);
          } else if (data.type === 'error') {
            onError(data.message ?? '실행 오류');
          }
        } catch {
          // JSON 파싱 실패는 무시 (헬스체크 핑 등)
        }
      }
    }
  } catch (err) {
    onError(err instanceof Error ? err.message : '스트리밍 오류');
  } finally {
    reader.releaseLock();
  }
}
