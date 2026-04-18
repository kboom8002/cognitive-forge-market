/**
 * src/lib/assemble-prompt.ts
 * 8-Block 프롬프트 조립 로직 — SDD-06 §4
 *
 * TaskflowBlocks (A/S/T/K/W/F/L/O) → System Prompt 문자열 조립
 * {variable_key} 플레이스홀더 치환
 */

/**
 * 8-Block 구조 (SDD-06 §4)
 */
export interface TaskflowBlocks {
  A?: string;  // Agent Role (페르소나)
  S?: string;  // Situation (상황)
  T?: string;  // Task (과업)
  K?: string;  // Knowledge / K-REF (핵심 지식)
  W?: string;  // Watchouts (주의사항)
  F?: string;  // Flow (기승전결 구조)
  L?: string;  // Length/Format (출력 형식)
  O?: string;  // Output Contract (출력 계약)
}

/**
 * {variable_key} 형태의 플레이스홀더를 inputs 값으로 치환
 *
 * @example
 *   interpolate("안녕 {name}!", { name: "Forge" }) → "안녕 Forge!"
 *   미입력 변수 → "[name: 미입력]" 으로 표시
 */
function interpolate(template: string, inputs: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const val = inputs[key];
    if (val === undefined || val === '') return `[${key}: 미입력]`;
    // base64 DataURL은 요약 처리 (파일 업로드 데이터는 시스템 메시지에 직접 넣지 않음)
    if (val.startsWith('data:') && val.length > 200) {
      return `[파일 업로드 완료 — ${val.slice(5, 30).split(';')[0]} 형식]`;
    }
    return val;
  });
}

/**
 * System Prompt 조립 (SDD-06 §4)
 *
 * blocks의 각 필드를 섹션으로 변환하고 {variable_key} 치환을 적용합니다.
 */
export function assembleSystemPrompt(
  blocks: TaskflowBlocks,
  inputs: Record<string, string>
): string {
  const sections: string[] = [];

  const BLOCK_LABELS: [keyof TaskflowBlocks, string][] = [
    ['A', '## 역할 (Role)'],
    ['S', '## 상황 (Situation)'],
    ['T', '## 과업 (Task)'],
    ['K', '## 핵심 지식 (Knowledge)'],
    ['W', '## 주의사항 (Watchouts)'],
    ['F', '## 구성 흐름 (Flow)'],
    ['L', '## 출력 형식 (Format)'],
    ['O', '## 출력 계약 (Output Contract)'],
  ];

  for (const [key, label] of BLOCK_LABELS) {
    const block = blocks[key];
    if (block) {
      sections.push(`${label}\n${interpolate(block, inputs)}`);
    }
  }

  // blocks가 비어 있으면 기본 시스템 프롬프트 제공
  if (sections.length === 0) {
    return [
      '## 역할 (Role)',
      'You are a helpful AI assistant powered by Cognitive Forge Market.',
      '',
      '## 출력 계약 (Output Contract)',
      '- 항상 한국어로 응답하세요.',
      '- Markdown 형식으로 명확하게 구조화하세요.',
    ].join('\n');
  }

  return sections.join('\n\n');
}

/**
 * User Message 조립 (SDD-06 §4)
 *
 * inputs를 `[variable_key]: value` 형식의 목록으로 변환합니다.
 * base64 DataURL(파일) 입력은 요약 처리하여 토큰 폭발 방지.
 */
export function assembleUserMessage(inputs: Record<string, string>): string {
  const RESERVED_KEYS = new Set(['packId', 'learnerId', 'mcp_context']);

  const lines = Object.entries(inputs)
    .filter(([key]) => !RESERVED_KEYS.has(key))
    .map(([key, value]) => {
      // 파일(base64) → 요약
      if (typeof value === 'string' && value.startsWith('data:') && value.length > 200) {
        const mimeType = value.slice(5, 60).split(';')[0];
        return `[${key}]: (파일 업로드됨 — ${mimeType})`;
      }
      return `[${key}]: ${value}`;
    });

  if (lines.length === 0) {
    return '위의 시스템 프롬프트에 따라 결과를 생성해주세요.';
  }

  return lines.join('\n');
}
