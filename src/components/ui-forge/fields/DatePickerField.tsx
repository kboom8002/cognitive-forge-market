'use client';
/**
 * src/components/ui-forge/fields/DatePickerField.tsx
 * 날짜 선택기 — SDD-05 §3 DATE_PICKER
 */
import { useId } from 'react';
import type { InputField } from '@/types/ui-forge';

interface Props {
  field: InputField;
  value: string;  // ISO date string 'YYYY-MM-DD'
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function DatePickerField({ field, value, onChange, disabled }: Props) {
  const uid = useId();
  const id = `forge-${uid}`;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="flex items-center gap-1.5 text-sm font-bold text-slate-300">
        {field.label}
        {field.required && <span className="text-violet-400 text-xs">*</span>}
      </label>

      <div className="relative">
        <input
          id={id}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="
            w-full bg-white/[0.04] border border-white/10 rounded-xl
            px-4 py-3 text-white text-sm
            focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/25
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-all duration-150
            [color-scheme:dark]
          "
        />
      </div>

      {field.helper_text && (
        <p className="text-xs text-slate-500 leading-snug">{field.helper_text}</p>
      )}
    </div>
  );
}
