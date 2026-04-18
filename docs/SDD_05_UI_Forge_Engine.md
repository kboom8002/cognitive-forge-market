# SDD-05: UI Forge Engine
## cognitive-forge-market

**버전:** 1.0 | **날짜:** 2026-04-17

---

## 1. 개요

**UI Forge**는 `agent_packs.micro_saas_ui_schema` JSON을 파싱하여  
Learner에게 8-Block 코드를 전혀 노출하지 않고 깔끔한 **Micro-SaaS UI**를 동적으로 렌더링하는 엔진입니다.

```
AgentPack JSON (8-Block 복잡한 프롬프트 구조)
         ↓ micro_saas_ui_schema 파싱
UIForgeRenderer (동적 폼 생성)
         ↓ Learner 입력 완료 → [Run]
/api/run (SSE 스트리밍)
         ↓
OutputPanel (완성된 문서 렌더링)
```

---

## 2. MicroSaaSUISchema 타입 정의

```typescript
// src/types/ui-forge.ts

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
```

---

## 3. 지원 Input 타입 상세

| Type | UI 컴포넌트 | 변수 키 매핑 | 설명 |
|:---|:---|:---|:---|
| `FILE_UPLOAD` | 드래그앤드롭 영역 | K_In | PDF, DOCX, TXT 업로드 |
| `DROPDOWN` | Select 박스 | A_Role, L_Format 등 | 선택지 중 1개 선택 |
| `TEXT_AREA` | 멀티라인 텍스트 | S_Situation, T_Task | 자유 텍스트 |
| `TEXT_INPUT` | 단일 라인 | 임의 변수 키 | 짧은 입력 |
| `SLIDER` | 범위 슬라이더 | 수치형 변수 | 분량, 깊이 등 설정 |
| `TOGGLE` | ON/OFF 스위치 | 불리언 변수 | 옵션 기능 활성화 |
| `DATE_PICKER` | 날짜 선택기 | 날짜형 변수 | 기준일, 마감일 등 |

---

## 4. 컴포넌트 구조

```
src/components/ui-forge/
├── UIForgeRenderer.tsx        ← 메인 컨테이너 (CC)
├── RunButton.tsx              ← CTA 버튼 + 로딩 상태
├── OutputPanel.tsx            ← SSE 스트리밍 결과 렌더링
└── fields/
    ├── FileUploadField.tsx
    ├── DropdownField.tsx
    ├── TextAreaField.tsx
    ├── TextInputField.tsx
    ├── SliderField.tsx
    ├── ToggleField.tsx
    └── DatePickerField.tsx
```

---

## 5. UIForgeRenderer 구현 명세

```typescript
// src/components/ui-forge/UIForgeRenderer.tsx
'use client';

interface UIForgeRendererProps {
  schema: MicroSaaSUISchema;
  packId: string;
  mcpContext?: string;  // Personal MCP Bridge (SDD-13)
}

export function UIForgeRenderer({ schema, packId, mcpContext }: UIForgeRendererProps) {
  const [inputs, setInputs] = useState<Record<string, string | File>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState('');
  const [runId, setRunId] = useState<string | null>(null);

  const handleFieldChange = (variableKey: string, value: string | File) => {
    setInputs(prev => ({ ...prev, [variableKey]: value }));
  };

  const isValid = schema.required_inputs
    .filter(f => f.required)
    .every(f => inputs[f.variable_key]);

  return (
    <div className="ui-forge-container">
      <UIForgeHeader schema={schema} />
      <div className="fields-grid">
        {schema.required_inputs.map(field => (
          <DynamicField
            key={field.id}
            field={field}
            onChange={(val) => handleFieldChange(field.variable_key, val)}
          />
        ))}
      </div>
      <RunButton
        disabled={!isValid || isRunning}
        isRunning={isRunning}
        label={schema.cta_label}
        estimatedTime={schema.estimated_time_seconds}
        onClick={() => handleRun(packId, inputs, mcpContext, setIsRunning, setOutput, setRunId)}
      />
      {(isRunning || output) && (
        <OutputPanel
          content={output}
          format={schema.output_format}
          isStreaming={isRunning}
          runId={runId}
        />
      )}
    </div>
  );
}
```

---

## 6. OutputPanel 구현 명세

```typescript
// src/components/ui-forge/OutputPanel.tsx
'use client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface OutputPanelProps {
  content: string;
  format: 'MARKDOWN' | 'JSON' | 'HTML' | 'PLAIN';
  isStreaming: boolean;
  runId: string | null;
}

export function OutputPanel({ content, format, isStreaming, runId }: OutputPanelProps) {
  return (
    <div className="output-panel">
      <div className="output-header">
        <span>{isStreaming ? '⚙️ 생성 중...' : '✅ 생성 완료'}</span>
        {!isStreaming && runId && (
          <div className="output-actions">
            <button onClick={() => navigator.clipboard.writeText(content)}>
              복사
            </button>
            <button onClick={() => downloadAsDocx(content)}>
              DOCX 다운로드
            </button>
          </div>
        )}
      </div>
      <div className="output-content">
        {format === 'MARKDOWN' ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        ) : (
          <pre>{content}</pre>
        )}
      </div>
      {isStreaming && <div className="streaming-cursor">▋</div>}
    </div>
  );
}
```

---

## 7. SSE 스트리밍 클라이언트 로직

```typescript
// src/lib/run-pack.ts
export async function runPack(
  packId: string,
  inputs: Record<string, string | File>,
  mcpContext?: string,
  onChunk: (chunk: string) => void,
  onDone: (runId: string, chargeAmount: number) => void,
  onError: (error: string) => void
) {
  const formData = new FormData();
  formData.append('packId', packId);
  formData.append('inputs', JSON.stringify(
    Object.fromEntries(
      Object.entries(inputs).filter(([, v]) => typeof v === 'string')
    )
  ));
  // File 처리는 별도 업로드 후 URL로 변환
  if (mcpContext) formData.append('mcp_context', mcpContext);

  const response = await fetch('/api/run', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json();
    onError(err.error);
    return;
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value);
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        if (data.type === 'chunk') onChunk(data.content);
        if (data.type === 'done') onDone(data.runId, data.chargeAmount);
      }
    }
  }
}
```

---

## 8. micro_saas_ui_schema 예시

```json
{
  "title": "계약서 리스크 분석 AI",
  "description": "법률 계약서를 업로드하면 8가지 관점에서 리스크를 분석합니다. 평균 30초 소요.",
  "cover_emoji": "⚖️",
  "required_inputs": [
    {
      "id": "file_contract",
      "type": "FILE_UPLOAD",
      "label": "계약서 파일 업로드",
      "variable_key": "K_In",
      "required": true,
      "accept": ".pdf,.docx",
      "max_size_mb": 10,
      "helper_text": "PDF 또는 Word 파일을 지원합니다."
    },
    {
      "id": "role_select",
      "type": "DROPDOWN",
      "label": "분석 관점 선택",
      "variable_key": "A_Role",
      "required": true,
      "options": ["을(수급자) 관점", "갑(발주자) 관점", "중립 관점"]
    },
    {
      "id": "concerns",
      "type": "TEXT_AREA",
      "label": "특별히 우려되는 조항 (선택)",
      "variable_key": "S_Situation",
      "required": false,
      "placeholder": "예: 계약 해제 조건, 지연 배상금 조항"
    }
  ],
  "output_format": "MARKDOWN",
  "cta_label": "계약서 분석 시작",
  "estimated_time_seconds": 30
}
```
