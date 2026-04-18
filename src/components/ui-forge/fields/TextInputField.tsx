'use client';
/**
 * src/components/ui-forge/fields/TextInputField.tsx
 * 단일 라인 텍스트 입력 — SDD-05 §3 TEXT_INPUT
 */
import { useId } from 'react';
import type { InputField } from '@/types/ui-forge';

interface Props {
  field: InputField;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function TextInputField({ field, value, onChange, disabled }: Props) {
  const uid = useId();
  const id = `forge-${uid}`;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="flex items-center gap-1.5 text-sm font-bold text-slate-300">
        {field.label}
        {field.required && <span className="text-violet-400 text-xs">*</span>}
      </label>

      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        disabled={disabled}
        autoComplete="off"
        className="
          w-full bg-white/[0.04] border border-white/10 rounded-xl
          px-4 py-3 text-white text-sm placeholder:text-slate-600
          focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/25
          disabled:opacity-40 disabled:cursor-not-allowed
          transition-all duration-150
        "
      />

      {field.helper_text && (
        <p className="text-xs text-slate-500 leading-snug">{field.helper_text}</p>
      )}
    </div>
  );
}
