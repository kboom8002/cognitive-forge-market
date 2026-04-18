'use client';
/**
 * src/components/ui-forge/fields/TextAreaField.tsx
 * 자동 리사이즈 멀티라인 — SDD-05 §3 TEXT_AREA
 */
import { useId, useRef, useEffect } from 'react';
import type { InputField } from '@/types/ui-forge';

interface Props {
  field: InputField;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function TextAreaField({ field, value, onChange, disabled }: Props) {
  const uid = useId();
  const id = `forge-${uid}`;
  const ref = useRef<HTMLTextAreaElement>(null);

  // 자동 리사이즈
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="flex items-center gap-1.5 text-sm font-bold text-slate-300">
        {field.label}
        {field.required && <span className="text-violet-400 text-xs">*</span>}
        {!field.required && <span className="text-slate-600 text-xs font-normal">(선택)</span>}
      </label>

      <textarea
        ref={ref}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        disabled={disabled}
        rows={4}
        className="
          w-full bg-white/[0.04] border border-white/10 rounded-xl
          px-4 py-3 text-white text-sm placeholder:text-slate-600
          focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/25
          disabled:opacity-40 disabled:cursor-not-allowed
          resize-none overflow-hidden min-h-[108px]
          transition-all duration-150
        "
      />

      <div className="flex justify-between items-center">
        {field.helper_text && (
          <p className="text-xs text-slate-500 leading-snug">{field.helper_text}</p>
        )}
        {value.length > 0 && (
          <span className="text-xs text-slate-600 ml-auto">{value.length}자</span>
        )}
      </div>
    </div>
  );
}
