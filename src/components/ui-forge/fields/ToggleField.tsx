'use client';
/**
 * src/components/ui-forge/fields/ToggleField.tsx
 * ON/OFF 스위치 — SDD-05 §3 TOGGLE
 */
import { useId } from 'react';
import type { InputField } from '@/types/ui-forge';

interface Props {
  field: InputField;
  value: string;  // 'true' | 'false' | ''
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ToggleField({ field, value, onChange, disabled }: Props) {
  const uid = useId();
  const id = `forge-${uid}`;
  const checked = value === 'true';

  return (
    <div className="flex items-center justify-between py-1">
      <div>
        <label htmlFor={id} className="text-sm font-bold text-slate-300 cursor-pointer select-none block">
          {field.label}
          {field.required && <span className="text-violet-400 text-xs ml-1">*</span>}
        </label>
        {field.helper_text && (
          <p className="text-xs text-slate-500 mt-0.5">{field.helper_text}</p>
        )}
      </div>

      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(checked ? 'false' : 'true')}
        className={`
          relative inline-flex h-6 w-11 flex-shrink-0 rounded-full
          border-2 border-transparent
          transition-colors duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-violet-500/40
          disabled:opacity-40 disabled:cursor-not-allowed
          ${checked ? 'bg-violet-600' : 'bg-white/10'}
        `}
      >
        <span
          className={`
            inline-block h-5 w-5 rounded-full bg-white shadow
            transform transition-transform duration-200 ease-in-out
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  );
}
