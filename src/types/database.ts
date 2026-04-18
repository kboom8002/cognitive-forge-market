/**
 * src/types/database.ts
 * Supabase 테이블 타입 정의
 *
 * 출처: SDD-02 §5 타입 정의
 * 이 파일은 SDD-02의 정의를 그대로 유지합니다. 변경 시 SDD-02도 동기화하세요.
 */

export type PackStatus = 'DRAFT' | 'IES_REJECTED' | 'SCL_TESTING' | 'SCL_VERIFIED' | 'FEATURED';
export type SourceType = 'BOOK' | 'EXPERT_DOC' | 'INTERNAL';
export type PoKRole = 'BUILDER' | 'CONTRIBUTOR' | 'AUTHOR' | 'PLATFORM';

export interface AgentPack {
  pack_id: string;
  foundation_source_id?: string | null;
  builder_id: string;
  taskflow_blocks: TaskflowBlocks;
  execution_proof_run_id?: string | null;
  status: PackStatus;
  lineage_commit_tree?: string[] | null;
  micro_saas_ui_schema?: MicroSaaSUISchema | null;
  run_count: number;
  created_at: string;
  updated_at: string;
}

export interface TaskflowBlocks {
  A?: string;  // Agent Role
  S?: string;  // Situation
  T?: string;  // Task
  K?: string;  // Knowledge (K-REF)
  W?: string;  // Watchouts
  F?: string;  // Flow (기승전결)
  L?: string;  // Length/Format
  O?: string;  // Output Contract
}

// MicroSaaSUISchema — 전체 정의는 src/types/ui-forge.ts 참조
export interface MicroSaaSUISchema {
  title: string;
  description: string;
  cover_emoji?: string;
  required_inputs: unknown[];
  output_format: 'MARKDOWN' | 'JSON' | 'HTML' | 'PLAIN';
  cta_label: string;
  estimated_time_seconds?: number;
}

export interface RunLog {
  run_id: string;
  pack_id: string;
  learner_id?: string;
  charge_amount: number;
  output_snapshot?: string;
  created_at: string;
}

export interface PoKLedger {
  id: string;
  run_id: string;
  recipient_id: string;
  role: PoKRole;
  amount_won: number;
  is_settled: boolean;
  created_at: string;
}

export interface ForkTree {
  id: string;
  parent_pack_id: string;
  child_pack_id: string;
  contributor_id?: string;
  diff_summary?: string;
  quality_delta: number;
  created_at: string;
}

export interface FoundationSource {
  source_id: string;
  source_type: SourceType;
  title: string;
  author_tenant_id?: string;
  core_framework_json?: Record<string, unknown>;
  created_at: string;
}

export interface QuestBoard {
  quest_id: string;
  title: string;
  target_book_title?: string;
  reward_pok: number;
  deadline_at?: string;
  linked_pack_id?: string;
  created_at: string;
}
