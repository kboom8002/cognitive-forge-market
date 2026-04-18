'use client';
/**
 * src/components/ui-forge/fields/DropdownField.tsx
 * 커스텀 스타일 Select — SDD-05 §3 DROPDOWN
 */
import { useId, useState, useRef, useEffect } from 'react';
import type { InputField } from '@/types/ui-forge';

interface Props {
  field: InputField;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function DropdownField({ field, value, onChange, disabled }: Props) {
  const uid = useId();
  const id = `forge-${uid}`;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const options = field.options ?? [];
  const selected = value || null;

  // 외부 클릭 닫기
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="flex items-center gap-1.5 text-sm font-bold text-slate-300">
        {field.label}
        {field.required && <span className="text-violet-400 text-xs">*</span>}
      </label>

      <div ref={ref} className="relative" id={id}>
        {/* Trigger */}
        <button
          type="button"
          onClick={() => !disabled && setOpen((o) => !o)}
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="listbox"
          className={`
            w-full flex items-center justify-between
            bg-white/[0.04] border rounded-xl px-4 py-3
            text-sm text-left transition-all duration-150
            disabled:opacity-40 disabled:cursor-not-allowed
            ${open
              ? 'border-violet-500/60 ring-1 ring-violet-500/25'
              : 'border-white/10 hover:border-white/20'
            }
          `}
        >
          <span className={selected ? 'text-white' : 'text-slate-600'}>
            {selected ?? (field.placeholder ?? '선택하세요')}
          </span>
          <svg
            className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true"
          >
            <path d="M4 6l4 4 4-4" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        {/* Dropdown list */}
        {open && (
          <ul
            role="listbox"
            className="
              absolute z-30 mt-2 w-full
              bg-[#1a1a2e] border border-white/10 rounded-xl
              shadow-xl shadow-black/50 overflow-hidden
              animate-in fade-in slide-in-from-top-2 duration-150
            "
          >
            {options.map((opt) => (
              <li
                key={opt}
                role="option"
                aria-selected={value === opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`
                  px-4 py-3 text-sm cursor-pointer transition-colors
                  ${value === opt
                    ? 'bg-violet-600/30 text-violet-200 font-semibold'
                    : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                  }
                `}
              >
                {value === opt && (
                  <svg className="inline w-3.5 h-3.5 mr-2 text-violet-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true">
                    <path d="M2.5 8.5l3.5 3.5 7.5-8" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                )}
                {opt}
              </li>
            ))}
          </ul>
        )}
      </div>

      {field.helper_text && (
        <p className="text-xs text-slate-500 leading-snug">{field.helper_text}</p>
      )}
    </div>
  );
}
