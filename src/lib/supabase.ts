/**
 * src/lib/supabase.ts
 * Supabase 클라이언트 유틸리티 — 서버/클라이언트 분리
 *
 * 참조: SDD-00 §5 환경변수, SDD-02 §3 RLS 정책
 * 규칙: agent_packs 쿼리에는 반드시 .in('status', ['SCL_VERIFIED', 'FEATURED']) 필터 적용
 */

import { createClient } from '@supabase/supabase-js';
import type { AgentPack, QuestBoard, FoundationSource } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? supabaseAnonKey;

// ───────────────────────────────────────────
// 클라이언트 사이드 Supabase (anon key)
// Learner 세션, 공개 데이터 읽기에 사용
// ───────────────────────────────────────────
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// ───────────────────────────────────────────
// 서버 사이드 Supabase (service_role key)
// API Route Handler (run, pok-distribute, cron) 전용
// RLS를 우회하므로 서버 환경에서만 사용할 것
// ───────────────────────────────────────────
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ───────────────────────────────────────────────────────────────
// 공개 페이지용 쿼리 헬퍼 (anon key — RLS 적용)
// 개발 환경에서 Supabase 연결 실패 시 null 반환 → fallback 처리
// ───────────────────────────────────────────────────────────────

/**
 * [서버용] Featured + SCL_VERIFIED 팩 목록 (홈 페이지)
 * SDD-04 §1 데이터 소스 기준
 */
export async function getFeaturedPacks(limit = 6) {
  try {
    const { data, error } = await supabaseClient
      .from('agent_packs')
      .select('*, foundation_sources(title, source_type)')
      .in('status', ['FEATURED', 'SCL_VERIFIED'])
      .order('run_count', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as (AgentPack & { foundation_sources: Pick<FoundationSource, 'title' | 'source_type'> | null })[];
  } catch {
    return null; // fallback to mock data
  }
}

/**
 * [서버용] 마켓 리스트 — 필터/정렬/페이지네이션
 * SDD-04 §2 기준
 */
export async function getMarketPacks({
  category,
  sourceType,
  sort = 'run_count',
  page = 1,
  pageSize = 12,
}: {
  category?: string;
  sourceType?: string;
  sort?: 'run_count' | 'latest' | 'featured';
  page?: number;
  pageSize?: number;
}) {
  try {
    let query = supabaseClient
      .from('agent_packs')
      .select('pack_id, status, run_count, micro_saas_ui_schema, created_at, foundation_sources(title, source_type)', { count: 'exact' })
      .in('status', ['SCL_VERIFIED', 'FEATURED']);

    // category 필터 (micro_saas_ui_schema->category 기반, 향후 컬럼 추가 시 교체)
    if (category) {
      query = query.ilike('micro_saas_ui_schema->>category', `%${category}%`);
    }
    if (sourceType) {
      query = query.eq('foundation_sources.source_type', sourceType);
    }

    // 정렬
    if (sort === 'featured') {
      query = query.order('status', { ascending: false }).order('run_count', { ascending: false });
    } else if (sort === 'latest') {
      query = query.order('created_at', { ascending: false });
    } else {
      query = query.order('run_count', { ascending: false });
    }

    // 페이지네이션
    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    return { data: data ?? [], count: count ?? 0 };
  } catch {
    return { data: null, count: 0 };
  }
}

/**
 * [서버용] 개별 팩 조회 — SCL_VERIFIED/FEATURED 검증 포함
 */
export async function getVerifiedPackById(packId: string) {
  try {
    const { data, error } = await supabaseClient
      .from('agent_packs')
      .select('*, foundation_sources(*)')
      .eq('pack_id', packId)
      .in('status', ['SCL_VERIFIED', 'FEATURED'])
      .single();

    if (error) return null;
    return data as AgentPack & { foundation_sources: FoundationSource | null };
  } catch {
    return null;
  }
}

/**
 * [서버용] Today's Quest — 마감일이 남은 최신 1건
 * SDD-04 §1, SDD-12
 */
export async function getTodayQuest(): Promise<QuestBoard | null> {
  try {
    const { data, error } = await supabaseClient
      .from('quest_board')
      .select('*')
      .gt('deadline_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) return null;
    return data as QuestBoard;
  } catch {
    return null;
  }
}

/**
 * [서버용] Author Hub — foundation_sources 기반
 * SDD-04 §4
 */
export async function getAuthors() {
  try {
    const { data, error } = await supabaseClient
      .from('foundation_sources')
      .select('author_tenant_id, title, source_type, created_at')
      .not('author_tenant_id', 'is', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Pick<FoundationSource, 'author_tenant_id' | 'title' | 'source_type' | 'created_at'>[];
  } catch {
    return null;
  }
}

/**
 * [서버용] Author별 팩 목록 (SCL_VERIFIED/FEATURED 만)
 */
export async function getPacksByAuthor(authorTenantId: string) {
  try {
    const { data, error } = await supabaseClient
      .from('agent_packs')
      .select('*, foundation_sources(title, source_type)')
      .eq('foundation_sources.author_tenant_id', authorTenantId)
      .in('status', ['SCL_VERIFIED', 'FEATURED'])
      .order('run_count', { ascending: false });

    if (error) throw error;
    return data as AgentPack[];
  } catch {
    return null;
  }
}

/**
 * [서버용] 오늘의 퀘스트 목록 (quest_board)
 */
export async function getActiveQuests(limit = 3) {
  try {
    const { data, error } = await supabaseClient
      .from('quest_board')
      .select('*')
      .gte('deadline_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data ?? []) as QuestBoard[];
  } catch {
    return [];
  }
}

