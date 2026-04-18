/**
 * src/app/authors/dashboard/page.tsx
 * Author-Tenant 수익 대시보드 — SDD-09 §6
 *
 * Server Component: Supabase에서 pok_ledger 데이터 조회
 * 주의: 실제 서비스에서는 세션 cookie에서 userId를 가져와야 함
 *       현재는 URL 파라미터 ?authorId=xxx 로 데모 처리
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import type { PoKLedger, PoKRole } from '@/types/database';

export const metadata: Metadata = {
  title: '수익 대시보드 | Cognitive Forge Market',
  description: 'Author-Tenant PoK 배당 수익 현황 및 정산 내역',
};

// 서버 클라이언트
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── 월별 그룹핑 헬퍼 ─────────────────────────────────────────
interface MonthlyRow {
  month: string;         // 'YYYY-MM'
  earned: number;
  settled: number;
  pending: number;
  count: number;
}

function groupByMonth(entries: PoKLedger[]): MonthlyRow[] {
  const map = new Map<string, MonthlyRow>();

  for (const e of entries) {
    const month = e.created_at.slice(0, 7);
    const existing = map.get(month) ?? { month, earned: 0, settled: 0, pending: 0, count: 0 };
    existing.earned  += e.amount_won;
    existing.count   += 1;
    if (e.is_settled) existing.settled += e.amount_won;
    else               existing.pending += e.amount_won;
    map.set(month, existing);
  }

  return Array.from(map.values()).sort((a, b) => b.month.localeCompare(a.month));
}

// ── 역할 라벨 ────────────────────────────────────────────────
const ROLE_LABEL: Record<PoKRole, string> = {
  BUILDER: '원작자',
  CONTRIBUTOR: 'Fork 기여자',
  AUTHOR: 'Author (출판사/저자)',
  PLATFORM: '플랫폼',
};

const ROLE_COLOR: Record<PoKRole, string> = {
  BUILDER:     'text-violet-300 bg-violet-500/15 border-violet-500/20',
  CONTRIBUTOR: 'text-blue-300 bg-blue-500/15 border-blue-500/20',
  AUTHOR:      'text-emerald-300 bg-emerald-500/15 border-emerald-500/20',
  PLATFORM:    'text-slate-400 bg-white/[0.04] border-white/10',
};

// ─────────────────────────────────────────────────────────────
interface DashboardProps {
  searchParams: Promise<{ authorId?: string }>;
}

export default async function AuthorDashboard({ searchParams }: DashboardProps) {
  const { authorId } = await searchParams;

  // ── 데이터 패치 ─────────────────────────────────────────
  let entries: PoKLedger[] = [];
  let fetchError = false;

  if (authorId) {
    const { data, error } = await supabase
      .from('pok_ledger')
      .select('*')
      .eq('recipient_id', authorId)
      .order('created_at', { ascending: false });

    if (error) {
      fetchError = true;
    } else {
      entries = (data ?? []) as PoKLedger[];
    }
  }

  // ── 통계 계산 ────────────────────────────────────────────
  const totalEarned  = entries.reduce((s, e) => s + e.amount_won, 0);
  const totalPending = entries.filter((e) => !e.is_settled).reduce((s, e) => s + e.amount_won, 0);
  const totalSettled = entries.filter((e) =>  e.is_settled).reduce((s, e) => s + e.amount_won, 0);
  const monthlyRows  = groupByMonth(entries);

  const pendingEntries = entries.filter((e) => !e.is_settled);
  const settledEntries = entries.filter((e) =>  e.is_settled);

  // ── 최대 월 수익 (바 차트 비율 계산용) ─────────────────────
  const maxMonthlyEarned = Math.max(...monthlyRows.map((r) => r.earned), 1);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">

      {/* ── 내비게이션 ─────────────────────────────────────── */}
      <nav className="fixed top-0 w-full bg-[#0a0a0f]/80 backdrop-blur-md border-b border-white/[0.06] z-50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/authors"
            className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true">
              <path d="M10 4L6 8l4 4" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Author Hub
          </Link>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            PoK 수익 대시보드
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 pt-24 pb-24">

        {/* ── 헤더 ──────────────────────────────────────── */}
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/20 flex items-center justify-center text-xl">
              💎
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">PoK 수익 대시보드</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Proof of Knowledge — 지식 지분 배당 현황
              </p>
            </div>
          </div>

          {/* Demo: authorId 입력 폼 */}
          {!authorId && (
            <div className="mt-6 p-5 rounded-2xl bg-violet-950/20 border border-violet-500/15">
              <p className="text-sm text-slate-400 mb-3">
                🔑 데모: Author ID를 URL 파라미터로 전달하세요
              </p>
              <code className="text-xs text-violet-300 bg-white/5 px-3 py-2 rounded-lg block">
                /authors/dashboard?authorId=&#123;your-tenant-id&#125;
              </code>
            </div>
          )}
        </header>

        {/* ── AuthorId 없으면 안내 표시 ──────────────────────── */}
        {!authorId ? (
          <DemoStatCards />
        ) : fetchError ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-950/20 p-8 text-center">
            <p className="text-red-400 font-semibold">데이터 조회 중 오류가 발생했습니다.</p>
            <p className="text-slate-500 text-sm mt-2">Supabase 연결을 확인해주세요.</p>
          </div>
        ) : (
          <>
            {/* ── KPI 카드 ──────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
              <StatCard
                icon="💰"
                label="누적 수익"
                value={`${totalEarned.toLocaleString()}원`}
                sub={`총 ${entries.length}건`}
                accent="violet"
              />
              <StatCard
                icon="⏳"
                label="미정산 (Pending)"
                value={`${totalPending.toLocaleString()}원`}
                sub={`${pendingEntries.length}건 · 월말 정산 예정`}
                accent="amber"
              />
              <StatCard
                icon="✅"
                label="정산 완료 (Settled)"
                value={`${totalSettled.toLocaleString()}원`}
                sub={`${settledEntries.length}건`}
                accent="emerald"
              />
            </div>

            {/* ── 월별 수익 현황 바 차트 ──────────────────── */}
            {monthlyRows.length > 0 && (
              <section className="mb-10">
                <h2 className="text-base font-bold text-slate-300 mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4 text-violet-400" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path d="M2 12h2V8H2v4zm3 0h2V4H5v8zm3 0h2V6H8v6zm3 0h2V2h-2v10z" />
                  </svg>
                  월별 수익 현황
                </h2>
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                        <th className="text-left text-xs font-bold text-slate-500 py-3 px-5">월</th>
                        <th className="text-right text-xs font-bold text-slate-500 py-3 px-5">수익</th>
                        <th className="text-right text-xs font-bold text-slate-500 py-3 px-5">미정산</th>
                        <th className="text-right text-xs font-bold text-slate-500 py-3 px-5">정산완료</th>
                        <th className="text-right text-xs font-bold text-slate-500 py-3 px-5">건수</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyRows.map((row) => (
                        <tr key={row.month} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-5">
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-slate-300">{row.month}</span>
                              {/* 인라인 바 */}
                              <div className="flex-1 max-w-[120px] h-1.5 bg-white/[0.06] rounded-full overflow-hidden hidden md:block">
                                <div
                                  className="h-full bg-gradient-to-r from-violet-600 to-violet-400 rounded-full"
                                  style={{ width: `${(row.earned / maxMonthlyEarned) * 100}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-5 text-right font-bold text-violet-300">
                            {row.earned.toLocaleString()}원
                          </td>
                          <td className="py-3 px-5 text-right text-amber-400">
                            {row.pending.toLocaleString()}원
                          </td>
                          <td className="py-3 px-5 text-right text-emerald-400">
                            {row.settled.toLocaleString()}원
                          </td>
                          <td className="py-3 px-5 text-right text-slate-500">
                            {row.count}건
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-white/[0.02] border-t border-white/[0.08]">
                        <td className="py-3 px-5 text-xs font-bold text-slate-500">합계</td>
                        <td className="py-3 px-5 text-right font-black text-white">{totalEarned.toLocaleString()}원</td>
                        <td className="py-3 px-5 text-right font-bold text-amber-400">{totalPending.toLocaleString()}원</td>
                        <td className="py-3 px-5 text-right font-bold text-emerald-400">{totalSettled.toLocaleString()}원</td>
                        <td className="py-3 px-5 text-right text-slate-500">{entries.length}건</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>
            )}

            {/* ── 미정산 내역 탭 ─────────────────────────── */}
            <section className="mb-8">
              <h2 className="text-base font-bold text-slate-300 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                미정산 내역 ({pendingEntries.length}건)
              </h2>
              {pendingEntries.length === 0 ? (
                <EmptyState text="미정산 내역이 없습니다." />
              ) : (
                <LedgerTable entries={pendingEntries} />
              )}
            </section>

            {/* ── 정산완료 내역 탭 ───────────────────────── */}
            <section>
              <h2 className="text-base font-bold text-slate-300 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                정산 완료 내역 ({settledEntries.length}건)
              </h2>
              {settledEntries.length === 0 ? (
                <EmptyState text="정산된 내역이 없습니다." />
              ) : (
                <LedgerTable entries={settledEntries} />
              )}
            </section>
          </>
        )}

        {/* ── 정산 정책 안내 ─────────────────────────────────── */}
        <aside className="mt-12 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 text-sm text-slate-500">
          <h3 className="text-slate-400 font-bold mb-2 text-xs uppercase tracking-wider">정산 정책</h3>
          <ul className="space-y-1 list-disc list-inside text-xs leading-relaxed">
            <li>정산은 매월 말일에 Cognitive Forge OS 어드민이 일괄 처리합니다.</li>
            <li>미정산(Pending) 금액은 익월 말 실제 입금됩니다.</li>
            <li>PoK 비율: Builder 40% · Fork 기여자 30% · Author 20% · Platform 10%</li>
            <li>Author-Tenant 미설정 팩의 Author 20%는 Platform으로 귀속됩니다.</li>
          </ul>
        </aside>
      </main>
    </div>
  );
}

// ─── 서브 컴포넌트들 ──────────────────────────────────────────

interface StatCardProps {
  icon: string;
  label: string;
  value: string;
  sub: string;
  accent: 'violet' | 'amber' | 'emerald';
}

const ACCENT_STYLES: Record<string, string> = {
  violet:  'border-violet-500/15 bg-violet-950/15',
  amber:   'border-amber-500/15 bg-amber-950/10',
  emerald: 'border-emerald-500/15 bg-emerald-950/10',
};
const ACCENT_VALUE: Record<string, string> = {
  violet:  'text-violet-200',
  amber:   'text-amber-200',
  emerald: 'text-emerald-200',
};

function StatCard({ icon, label, value, sub, accent }: StatCardProps) {
  return (
    <div className={`rounded-2xl border p-5 ${ACCENT_STYLES[accent]}`}>
      <div className="text-2xl mb-3">{icon}</div>
      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-3xl font-black mb-1 ${ACCENT_VALUE[accent]}`}>{value}</div>
      <div className="text-xs text-slate-600">{sub}</div>
    </div>
  );
}

function LedgerTable({ entries }: { entries: PoKLedger[] }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06] bg-white/[0.02]">
            <th className="text-left text-xs font-bold text-slate-500 py-3 px-5">역할</th>
            <th className="text-left text-xs font-bold text-slate-500 py-3 px-5 hidden md:table-cell">Run ID</th>
            <th className="text-right text-xs font-bold text-slate-500 py-3 px-5">금액</th>
            <th className="text-right text-xs font-bold text-slate-500 py-3 px-5 hidden md:table-cell">날짜</th>
            <th className="text-center text-xs font-bold text-slate-500 py-3 px-5">상태</th>
          </tr>
        </thead>
        <tbody>
          {entries.slice(0, 50).map((entry) => (
            <tr key={entry.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
              <td className="py-3 px-5">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border ${ROLE_COLOR[entry.role]}`}>
                  {ROLE_LABEL[entry.role]}
                </span>
              </td>
              <td className="py-3 px-5 hidden md:table-cell">
                <span className="font-mono text-xs text-slate-600">{entry.run_id.slice(0, 8)}…</span>
              </td>
              <td className="py-3 px-5 text-right font-bold text-white">
                {entry.amount_won.toLocaleString()}원
              </td>
              <td className="py-3 px-5 text-right hidden md:table-cell">
                <span className="text-xs text-slate-500">
                  {new Date(entry.created_at).toLocaleDateString('ko-KR')}
                </span>
              </td>
              <td className="py-3 px-5 text-center">
                {entry.is_settled ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400">
                    <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" aria-hidden="true">
                      <path d="M2 6.5l2.5 2.5 5.5-5.5" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    정산완료
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    대기중
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {entries.length > 50 && (
        <div className="p-4 text-center text-xs text-slate-600 border-t border-white/[0.04]">
          최근 50건만 표시됩니다. 전체 {entries.length}건
        </div>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.04] bg-white/[0.01] p-8 text-center">
      <div className="text-3xl mb-3">📭</div>
      <p className="text-slate-600 text-sm">{text}</p>
    </div>
  );
}

// 데모용 더미 StatCard (authorId 없을 때)
function DemoStatCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {[
        { icon: '💰', label: '누적 수익', value: '—', sub: 'Author ID 입력 후 조회', accent: 'violet' as const },
        { icon: '⏳', label: '미정산 (Pending)', value: '—', sub: '월말 정산 예정', accent: 'amber' as const },
        { icon: '✅', label: '정산 완료 (Settled)', value: '—', sub: '입금 완료 금액', accent: 'emerald' as const },
      ].map((c) => (
        <StatCard key={c.label} {...c} />
      ))}
    </div>
  );
}
