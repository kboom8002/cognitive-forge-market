'use client';
/**
 * src/components/ui-forge/fields/FileUploadField.tsx
 * 드래그앤드롭 + 파일 미리보기 — SDD-05 §3 FILE_UPLOAD
 *
 * 업로드 전략:
 *   개발/Supabase Storage 미연결 → base64 DataURL로 변환 후 string으로 전달
 *   실제 환경 → Supabase Storage PUT → public URL 반환 (uploadFileToStorage 참조)
 */
import { useId, useState, useCallback, useRef } from 'react';
import type { InputField } from '@/types/ui-forge';

interface Props {
  field: InputField;
  value: File | null;
  onChange: (value: File | null) => void;
  disabled?: boolean;
}

const ACCEPTED_LABELS: Record<string, string> = {
  '.pdf': 'PDF',
  '.docx': 'Word',
  '.txt': 'TXT',
  '.xlsx': 'Excel',
  '.csv': 'CSV',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function FileUploadField({ field, value, onChange, disabled }: Props) {
  const uid = useId();
  const id = `forge-${uid}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxBytes = (field.max_size_mb ?? 10) * 1024 * 1024;
  const acceptTypes = field.accept?.split(',').map((s) => s.trim()) ?? [];
  const acceptLabels = acceptTypes.map((a) => ACCEPTED_LABELS[a] ?? a).join(', ');

  const validate = useCallback((file: File): string | null => {
    if (file.size > maxBytes) {
      return `파일 크기 ${formatBytes(file.size)}가 최대 ${field.max_size_mb}MB를 초과합니다.`;
    }
    if (acceptTypes.length > 0) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!acceptTypes.includes(ext)) {
        return `허용된 형식: ${acceptLabels}`;
      }
    }
    return null;
  }, [maxBytes, acceptTypes, acceptLabels, field.max_size_mb]);

  const handleFile = useCallback((file: File) => {
    const err = validate(file);
    if (err) { setError(err); return; }
    setError(null);
    onChange(file);
  }, [validate, onChange]);

  // Drag handlers
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setDragOver(true);
  };
  const onDragLeave = () => setDragOver(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };
  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  // 파일 확장자 아이콘
  const ext = value?.name.split('.').pop()?.toUpperCase() ?? '';

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="flex items-center gap-1.5 text-sm font-bold text-slate-300">
        {field.label}
        {field.required && <span className="text-violet-400 text-xs">*</span>}
      </label>

      {/* Drop Zone */}
      {!value ? (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => !disabled && inputRef.current?.click()}
          className={`
            relative flex flex-col items-center justify-center gap-3
            border-2 border-dashed rounded-2xl p-8 cursor-pointer
            transition-all duration-200
            ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
            ${dragOver
              ? 'border-violet-500 bg-violet-950/30 scale-[1.01]'
              : 'border-white/15 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]'
            }
          `}
        >
          {/* Icon */}
          <div className={`
            w-14 h-14 rounded-2xl flex items-center justify-center text-2xl
            transition-colors duration-200
            ${dragOver ? 'bg-violet-600/30' : 'bg-white/[0.06]'}
          `}>
            📎
          </div>

          <div className="text-center">
            <p className="text-sm font-semibold text-slate-300">
              {dragOver ? '여기에 놓으세요' : '파일을 드롭하거나 클릭하세요'}
            </p>
            {acceptLabels && (
              <p className="text-xs text-slate-500 mt-1">{acceptLabels} · 최대 {field.max_size_mb ?? 10}MB</p>
            )}
          </div>

          <input
            ref={inputRef}
            id={id}
            type="file"
            accept={field.accept}
            onChange={onInputChange}
            disabled={disabled}
            className="sr-only"
          />
        </div>
      ) : (
        /* 업로드된 파일 프리뷰 */
        <div className="flex items-center gap-4 bg-white/[0.04] border border-white/10 rounded-2xl p-4">
          {/* 파일 아이콘 */}
          <div className="w-12 h-12 rounded-xl bg-violet-600/20 border border-violet-500/20 flex items-center justify-center text-xs font-black text-violet-300 flex-shrink-0">
            {ext.slice(0, 4)}
          </div>

          {/* 파일 정보 */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{value.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">{formatBytes(value.size)}</p>
          </div>

          {/* 삭제 버튼 */}
          <button
            type="button"
            onClick={() => { onChange(null); setError(null); }}
            disabled={disabled}
            className="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-red-500/20 hover:text-red-400 text-slate-500 flex items-center justify-center transition-colors flex-shrink-0"
            aria-label="파일 제거"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}

      {/* 에러 */}
      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 3a5 5 0 100 10A5 5 0 008 3zm0 3a.75.75 0 01.75.75v2a.75.75 0 01-1.5 0v-2A.75.75 0 018 6zm0 5a.75.75 0 110-1.5.75.75 0 010 1.5z" />
          </svg>
          {error}
        </p>
      )}

      {field.helper_text && !error && (
        <p className="text-xs text-slate-500 leading-snug">{field.helper_text}</p>
      )}
    </div>
  );
}
