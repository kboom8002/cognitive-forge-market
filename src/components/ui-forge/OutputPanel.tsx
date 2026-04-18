'use client';
/**
 * src/components/ui-forge/OutputPanel.tsx
 * SSE 스트리밍 결과 렌더링 — SDD-05 §6
 *
 * 기능:
 *   - 스트리밍 중: 커서 깜빡임 + 실시간 Markdown 렌더링
 *   - 완료 후: 복사 버튼 + DOCX 다운로드 버튼
 *   - format별: MARKDOWN→ReactMarkdown, JSON→pre 하이라이트, PLAIN/HTML→pre
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { OutputPanelProps } from '@/types/ui-forge';

// ── DOCX 다운로드 (docx 라이브러리 없음 → Markdown → plain text .txt 대체) ──
async function downloadAsDocx(content: string): Promise<void> {
  // Sprint 1-C에서 실제 DOCX 변환 구현 예정
  // 현재는 .txt로 대체 다운로드
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `output_${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Markdown 스타일 오버라이드 ──────────────────────────────
const markdownComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-xl font-black text-white mt-6 mb-3 pb-2 border-b border-white/10">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-lg font-bold text-slate-100 mt-5 mb-2">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-base font-bold text-slate-200 mt-4 mb-1.5">{children}</h3>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="text-slate-300 leading-relaxed mb-3 text-sm">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc list-inside space-y-1 mb-3 text-slate-300 text-sm">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal list-inside space-y-1 mb-3 text-slate-300 text-sm">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-2 border-violet-500/50 pl-4 py-1 my-3 text-slate-400 italic text-sm">{children}</blockquote>
  ),
  code: ({ children, className }: { children?: React.ReactNode; className?: string }) => {
    const isBlock = className?.startsWith('language-');
    if (isBlock) {
      return (
        <pre className="bg-white/[0.04] border border-white/10 rounded-xl p-4 overflow-x-auto my-3 text-xs font-mono text-emerald-300">
          <code>{children}</code>
        </pre>
      );
    }
    return <code className="bg-white/10 rounded px-1.5 py-0.5 text-xs font-mono text-violet-300">{children}</code>;
  },
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="overflow-x-auto my-4">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="text-left text-xs font-bold text-slate-400 py-2 px-3 border-b border-white/10 bg-white/[0.03]">{children}</th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="py-2 px-3 text-slate-300 text-xs border-b border-white/[0.06]">{children}</td>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-bold text-white">{children}</strong>
  ),
  hr: () => <hr className="border-white/10 my-4" />,
};

export function OutputPanel({ content, format, isStreaming, runId }: OutputPanelProps) {
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // 스트리밍 중 자동 스크롤
  useEffect(() => {
    if (isStreaming && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [content, isStreaming]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  // 비어 있으면 로딩 스켈레톤
  const isEmpty = content.trim() === '';

  return (
    <div
      id="output-panel"
      className="rounded-2xl border border-white/[0.08] bg-[#0d0d1a] overflow-hidden"
    >
      {/* ── 헤더 ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-2.5">
          {isStreaming ? (
            <>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-violet-500" />
              </span>
              <span className="text-sm font-semibold text-violet-300">AI 생성 중…</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true">
                <path d="M2.5 8.5l3.5 3.5 7.5-8" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="text-sm font-semibold text-emerald-300">생성 완료</span>
              {runId && (
                <span className="text-xs text-slate-600 font-mono">{runId.slice(0, 8)}</span>
              )}
            </>
          )}
        </div>

        {/* 액션 버튼 (완료 후에만) */}
        {!isStreaming && content && (
          <div className="flex items-center gap-2">
            <button
              id="output-copy-btn"
              type="button"
              onClick={handleCopy}
              className="
                flex items-center gap-1.5 text-xs font-bold
                px-3 py-1.5 rounded-lg
                bg-white/[0.06] hover:bg-white/10 text-slate-400 hover:text-slate-200
                transition-colors duration-150
              "
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true">
                    <path d="M2.5 8.5l3.5 3.5 7.5-8" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  복사됨!
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true">
                    <rect x="5" y="5" width="8" height="8" rx="1.5" strokeWidth="1.5" />
                    <path d="M3 11V3h8" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  복사
                </>
              )}
            </button>

            <button
              id="output-download-btn"
              type="button"
              onClick={() => downloadAsDocx(content)}
              className="
                flex items-center gap-1.5 text-xs font-bold
                px-3 py-1.5 rounded-lg
                bg-white/[0.06] hover:bg-white/10 text-slate-400 hover:text-slate-200
                transition-colors duration-150
              "
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true">
                <path d="M8 2v8m0 0l-3-3m3 3l3-3" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M2 13h12" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              다운로드
            </button>
          </div>
        )}
      </div>

      {/* ── 컨텐츠 ───────────────────────────────────────── */}
      <div className="px-6 py-5 max-h-[640px] overflow-y-auto scroll-smooth">
        {isEmpty && isStreaming ? (
          /* 로딩 스켈레톤 */
          <div className="space-y-3 animate-pulse">
            {[80, 60, 90, 50, 70].map((w, i) => (
              <div key={i} className="h-3 bg-white/[0.06] rounded-full" style={{ width: `${w}%` }} />
            ))}
          </div>
        ) : format === 'MARKDOWN' && content ? (
          <div className="prose prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {content}
            </ReactMarkdown>
          </div>
        ) : format === 'JSON' && content ? (
          <pre className="text-xs font-mono text-emerald-300 leading-relaxed whitespace-pre-wrap break-all">
            {(() => {
              try { return JSON.stringify(JSON.parse(content), null, 2); }
              catch { return content; }
            })()}
          </pre>
        ) : (
          <pre className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
            {content}
          </pre>
        )}

        {/* 스트리밍 커서 */}
        {isStreaming && !isEmpty && (
          <span
            className="inline-block w-0.5 h-4 bg-violet-400 ml-0.5 align-middle"
            style={{ animation: 'blink 1s step-start infinite' }}
            aria-label="입력 중"
          />
        )}

        <div ref={bottomRef} />
      </div>

      {/* 커서 애니메이션 CSS */}
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
