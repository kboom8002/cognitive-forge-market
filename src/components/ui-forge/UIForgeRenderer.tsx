'use client';
/**
 * src/components/ui-forge/UIForgeRenderer.tsx
 * UI Forge 렌더링 엔진 메인 컨테이너 — SDD-05 §5
 *
 * Client Component:
 *   - inputs 상태 관리
 *   - DynamicField 라우팅 (type별 분기)
 *   - /api/run SSE 연동 (runPack)
 *   - Telemetry (pack_run_start / pack_run_complete)
 */
import { useState, useCallback } from 'react';
import type { InputField, UIForgeRendererProps } from '@/types/ui-forge';

import { FileUploadField } from './fields/FileUploadField';
import { DropdownField } from './fields/DropdownField';
import { TextAreaField } from './fields/TextAreaField';
import { TextInputField } from './fields/TextInputField';
import { SliderField } from './fields/SliderField';
import { ToggleField } from './fields/ToggleField';
import { DatePickerField } from './fields/DatePickerField';
import { RunButton } from './RunButton';
import { OutputPanel } from './OutputPanel';
import { runPack } from '@/lib/run-pack';
import { useMarketTelemetry } from '@/components/telemetry-provider';

// ── DynamicField 라우터 ───────────────────────────────────────
interface DynamicFieldProps {
  field: InputField;
  value: string | File | null;
  onChange: (val: string | File | null) => void;
  disabled: boolean;
}

function DynamicField({ field, value, onChange, disabled }: DynamicFieldProps) {
  switch (field.type) {
    case 'FILE_UPLOAD':
      return (
        <FileUploadField
          field={field}
          value={value instanceof File ? value : null}
          onChange={(f) => onChange(f)}
          disabled={disabled}
        />
      );
    case 'DROPDOWN':
      return (
        <DropdownField
          field={field}
          value={typeof value === 'string' ? value : ''}
          onChange={(v) => onChange(v)}
          disabled={disabled}
        />
      );
    case 'TEXT_AREA':
      return (
        <TextAreaField
          field={field}
          value={typeof value === 'string' ? value : ''}
          onChange={(v) => onChange(v)}
          disabled={disabled}
        />
      );
    case 'TEXT_INPUT':
      return (
        <TextInputField
          field={field}
          value={typeof value === 'string' ? value : ''}
          onChange={(v) => onChange(v)}
          disabled={disabled}
        />
      );
    case 'SLIDER':
      return (
        <SliderField
          field={field}
          value={typeof value === 'string' ? value : ''}
          onChange={(v) => onChange(v)}
          disabled={disabled}
        />
      );
    case 'TOGGLE':
      return (
        <ToggleField
          field={field}
          value={typeof value === 'string' ? value : ''}
          onChange={(v) => onChange(v)}
          disabled={disabled}
        />
      );
    case 'DATE_PICKER':
      return (
        <DatePickerField
          field={field}
          value={typeof value === 'string' ? value : ''}
          onChange={(v) => onChange(v)}
          disabled={disabled}
        />
      );
    default:
      // 미지원 타입 → TextInput으로 fallback
      return (
        <TextInputField
          field={field}
          value={typeof value === 'string' ? value : ''}
          onChange={(v) => onChange(v)}
          disabled={disabled}
        />
      );
  }
}

// ─────────────────────────────────────────────────────────────
// UIForgeRenderer
// ─────────────────────────────────────────────────────────────
export function UIForgeRenderer({ schema, packId, mcpContext }: UIForgeRendererProps) {
  const [inputs, setInputs] = useState<Record<string, string | File | null>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [output, setOutput] = useState('');
  const [runId, setRunId] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const { trackPackRunStart, trackPackRunComplete, trackPackRunError } = useMarketTelemetry();

  // ── 입력 핸들러 ──────────────────────────────────────────
  const handleFieldChange = useCallback((variableKey: string, value: string | File | null) => {
    setInputs((prev) => ({ ...prev, [variableKey]: value }));
  }, []);

  // ── 유효성 검증 ──────────────────────────────────────────
  const isValid = schema.required_inputs
    .filter((f) => f.required)
    .every((f) => {
      const v = inputs[f.variable_key];
      if (f.type === 'FILE_UPLOAD') return v instanceof File;
      if (f.type === 'TOGGLE') return true; // TOGGLE은 기본값 있음
      return typeof v === 'string' && v.trim() !== '';
    });

  // 완료된 필드 수
  const filledCount = schema.required_inputs.filter((f) => {
    const v = inputs[f.variable_key];
    if (f.type === 'FILE_UPLOAD') return v instanceof File;
    if (f.type === 'TOGGLE') return true;
    return typeof v === 'string' && v.trim() !== '';
  }).length;
  const requiredCount = schema.required_inputs.filter((f) => f.required).length;

  // ── Run 핸들러 ─────────────────────────────────────────
  const handleRun = useCallback(async () => {
    if (!isValid || isRunning) return;

    const startedAt = Date.now();
    setIsRunning(true);
    setIsDone(false);
    setOutput('');
    setRunId(null);
    setRunError(null);

    // File 타입 변환 (null 제거)
    const cleanInputs: Record<string, string | File> = {};
    for (const [k, v] of Object.entries(inputs)) {
      if (v !== null) cleanInputs[k] = v;
    }

    // Telemetry: pack_run_start
    trackPackRunStart(packId);

    await runPack(
      packId,
      cleanInputs,
      mcpContext,
      // onChunk
      (chunk) => {
        setOutput((prev) => prev + chunk);
      },
      // onDone
      (rid, _chargeAmount) => {
        const durationMs = Date.now() - startedAt;
        setRunId(rid);
        setIsRunning(false);
        setIsDone(true);
        trackPackRunComplete(packId, rid, durationMs);
      },
      // onError
      (err) => {
        setRunError(err);
        setIsRunning(false);
        trackPackRunError(packId, err);
      }
    );
  }, [isValid, isRunning, inputs, packId, mcpContext,
      trackPackRunStart, trackPackRunComplete, trackPackRunError]);

  // ── Reset ─────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setInputs({});
    setOutput('');
    setRunId(null);
    setIsDone(false);
    setIsRunning(false);
    setRunError(null);
  }, []);

  return (
    <div className="ui-forge-container space-y-8">

      {/* ── 입력 폼 ──────────────────────────────────────── */}
      <section
        className={`
          rounded-3xl border p-7 space-y-6
          transition-all duration-300
          ${isDone
            ? 'border-white/[0.04] bg-white/[0.01] opacity-60'
            : 'border-violet-500/15 bg-violet-950/10'
          }
        `}
        aria-label="AgentPack 실행 폼"
      >
        {/* 입력 진행 상황 */}
        {requiredCount > 0 && !isDone && (
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-slate-400">
              필수 입력 <span className="text-white">{filledCount}</span>/{requiredCount}
            </h2>
            {filledCount === requiredCount && (
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true">
                  <path d="M2.5 8.5l3.5 3.5 7.5-8" strokeWidth="2" strokeLinecap="round" />
                </svg>
                입력 완료
              </span>
            )}
          </div>
        )}

        {/* 필드들 */}
        <div className="space-y-6">
          {schema.required_inputs.map((field) => (
            <DynamicField
              key={field.id}
              field={field}
              value={inputs[field.variable_key] ?? null}
              onChange={(val) => handleFieldChange(field.variable_key, val)}
              disabled={isRunning || isDone}
            />
          ))}
        </div>

        {/* Run 버튼 */}
        <div className="pt-2">
          <RunButton
            label={schema.cta_label}
            disabled={!isValid || isRunning || isDone}
            isRunning={isRunning}
            isDone={isDone}
            estimatedTime={schema.estimated_time_seconds}
            onClick={handleRun}
          />
        </div>

        {/* 에러 표시 */}
        {runError && (
          <div className="flex items-start gap-3 bg-red-950/30 border border-red-500/20 rounded-xl px-4 py-3">
            <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 3a5 5 0 100 10A5 5 0 008 3zm0 3a.75.75 0 01.75.75v2a.75.75 0 01-1.5 0v-2A.75.75 0 018 6zm0 5a.75.75 0 110-1.5.75.75 0 010 1.5z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-red-300">실행 오류</p>
              <p className="text-xs text-red-400/80 mt-0.5">{runError}</p>
              <p className="text-xs text-slate-500 mt-1">
                /api/run이 아직 연결되지 않았습니다. Sprint 1-C에서 구현 예정입니다.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ── OutputPanel (스트리밍 시작 또는 완료 시 표시) ── */}
      {(isRunning || output || isDone) && (
        <section aria-label="AI 출력 결과">
          <OutputPanel
            content={output}
            format={schema.output_format}
            isStreaming={isRunning}
            runId={runId}
          />

          {/* 완료 후 다시 실행 */}
          {isDone && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={handleReset}
                className="
                  inline-flex items-center gap-2 text-sm font-bold
                  text-slate-500 hover:text-slate-300
                  px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.06]
                  border border-white/[0.06] transition-colors
                "
              >
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true">
                  <path d="M2 8a6 6 0 116 6" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M2 8l2-2M2 8l2 2" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                다시 실행
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
