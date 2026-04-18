/**
 * src/types/ui-forge.ts
 * UI Forge Engine 타입 정의
 *
 * 출처: SDD-05 §2 MicroSaaSUISchema 타입 정의
 * UIForgeRenderer, RunButton, OutputPanel, DynamicField 컴포넌트에서 import하여 사용
 */

export type InputFieldType =
  | 'FILE_UPLOAD'
  | 'DROPDOWN'
  | 'TEXT_AREA'
  | 'TEXT_INPUT'
  | 'SLIDER'
  | 'TOGGLE'
  | 'DATE_PICKER';

export interface InputField {
  id: string;                    // 고유 식별자
  type: InputFieldType;
  label: string;                 // 사용자에게 표시할 라벨
  variable_key: string;          // 8-Block 내 변수 키 (예: K_In, A_Role)
  required: boolean;
  placeholder?: string;
  helper_text?: string;          // 설명 텍스트
  // DROPDOWN 전용
  options?: string[];
  // FILE_UPLOAD 전용
  accept?: string;               // ".pdf,.docx,.txt"
  max_size_mb?: number;
  // SLIDER 전용
  min?: number;
  max?: number;
  step?: number;
  default_value?: string | number;
}

export interface MicroSaaSUISchema {
  title: string;
  description: string;
  cover_emoji?: string;          // 팩 대표 이모지
  required_inputs: InputField[];
  output_format: 'MARKDOWN' | 'JSON' | 'HTML' | 'PLAIN';
  cta_label: string;             // Run 버튼 텍스트 (예: "계약서 분석 시작")
  estimated_time_seconds?: number;  // 예상 실행 시간 힌트
}

/**
 * UIForgeRenderer 컴포넌트 Props
 * 참조: SDD-05 §5
 */
export interface UIForgeRendererProps {
  schema: MicroSaaSUISchema;
  packId: string;
  mcpContext?: string;  // Personal MCP Bridge (SDD-13)
}

/**
 * OutputPanel 컴포넌트 Props
 * 참조: SDD-05 §6
 */
export interface OutputPanelProps {
  content: string;
  format: MicroSaaSUISchema['output_format'];
  isStreaming: boolean;
  runId: string | null;
}

/**
 * SSE 스트리밍 이벤트 타입
 * 참조: SDD-05 §7, SDD-06
 */
export type SSEEvent =
  | { type: 'chunk'; content: string }
  | { type: 'done'; runId: string; chargeAmount: number }
  | { type: 'error'; message: string };
