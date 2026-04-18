'use client';
/**
 * src/components/ui-forge/fields/SliderField.tsx
 * 범위 슬라이더 + 현재값 표시 — SDD-05 §3 SLIDER
 */
import { useId } from 'react';
import type { InputField } from '@/types/ui-forge';

interface Props {
  field: InputField;
  value: string;  // 숫자를 string으로 관리 (통합 inputs state)
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function SliderField({ field, value, onChange, disabled }: Props) {
  const uid = useId();
  const id = `forge-${uid}`;

  const min = field.min ?? 0;
  const max = field.max ?? 100;
  const step = field.step ?? 1;
  const current = value !== '' ? Number(value) : (field.default_value !== undefined ? Number(field.default_value) : min);

  // 진행률 (0~1)
  const pct = ((current - min) / (max - min)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="flex items-center gap-1.5 text-sm font-bold text-slate-300">
          {field.label}
          {field.required && <span className="text-violet-400 text-xs">*</span>}
        </label>
        <span className="text-sm font-bold text-violet-300 tabular-nums min-w-[3rem] text-right">
          {current}
        </span>
      </div>

      {/* Range input with custom track */}
      <div className="relative py-1">
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-400 transition-all duration-75"
            style={{ width: `${pct}%` }}
          />
        </div>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={current}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="
            absolute inset-0 w-full opacity-0 cursor-pointer h-full
            disabled:cursor-not-allowed
          "
          style={{ height: '24px', top: '-5px' }}
        />
        {/* Thumb indicator */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-violet-400 ring-2 ring-[#0a0a0f] shadow pointer-events-none transition-all duration-75"
          style={{ left: `${pct}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-slate-600">
        <span>{min}</span>
        <span>{max}</span>
      </div>

      {field.helper_text && (
        <p className="text-xs text-slate-500 leading-snug">{field.helper_text}</p>
      )}
    </div>
  );
}
