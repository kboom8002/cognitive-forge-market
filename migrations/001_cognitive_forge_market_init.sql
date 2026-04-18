-- =============================================================
-- MIGRATION: 001_cognitive_forge_market_init.sql
-- Project  : cognitive-forge-market
-- SDD Ref  : SDD-02 §2
-- Date     : 2026-04-17
-- Supabase : Dashboard > SQL Editor에 붙여넣어 직접 실행 가능
--
-- ⚠️  네임스페이스 전략:
--   모든 테이블은 public 스키마에 생성합니다.
--   phalanx-media/phalanx-os의 기존 테이블(fact_cards, garrison_posts,
--   telemetry_events 등)과 이름이 겹치지 않도록 아래 테이블명을 사용합니다.
--     foundation_sources  (phalanx 미사용)
--     agent_packs         (phalanx 미사용)
--     run_logs            (phalanx 미사용)
--     pok_ledger          (phalanx 미사용)
--     fork_tree           (phalanx 미사용)
--     quest_board         (phalanx 미사용)
--   충돌 위험이 있을 경우 아래 네임스페이스 전략을 따르세요:
--     1) 공유 Supabase 프로젝트라면 별도 스키마 생성 후 이동:
--          CREATE SCHEMA IF NOT EXISTS cfm;
--          SET search_path = cfm, public;
--     2) 신규 Supabase 프로젝트를 권장 (SDD-01 §5 참조)
-- =============================================================

-- -------------------------------------------------------------
-- [선택] 별도 스키마를 사용하려면 아래 주석을 해제하세요.
-- CREATE SCHEMA IF NOT EXISTS cfm;
-- SET search_path = cfm, public;
-- -------------------------------------------------------------


-- =============================================================
-- 테이블 1: foundation_sources
-- 역할: 8-Block AgentPack의 원천 지식 소스 (도서, 전문가 문서, 내부 자료)
-- 관계: 1개의 source → 여러 agent_packs
-- =============================================================
CREATE TABLE IF NOT EXISTS foundation_sources (
  source_id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 소스 유형: BOOK(도서), EXPERT_DOC(전문가 문서), INTERNAL(내부 자료)
  source_type       TEXT        NOT NULL
                    CHECK (source_type IN ('BOOK', 'EXPERT_DOC', 'INTERNAL')),
  title             TEXT        NOT NULL,
  -- Author-Tenant (RBAC 300) — 소스 소유자
  author_tenant_id  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  -- 핵심 프레임워크 메타데이터 (Chapter 구조, 핵심 개념 등)
  core_framework_json JSONB,
  created_at        TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE foundation_sources IS
  'AgentPack의 원천 지식 소스. Author-Tenant가 소유하며 공개 읽기 허용.';
COMMENT ON COLUMN foundation_sources.source_type IS
  'BOOK / EXPERT_DOC / INTERNAL';
COMMENT ON COLUMN foundation_sources.core_framework_json IS
  '도서 챕터 구조, 핵심 개념, 인용 가능 절 등 비정형 메타데이터';


-- =============================================================
-- 테이블 2: agent_packs
-- 역할: 8-Block TaskFlow 구조를 담은 AgentPack 핵심 자산
-- 관계: foundation_sources 1:N, run_logs 1:N, fork_tree 1:N, quest_board 0:N
-- 노출 규칙: status IN ('SCL_VERIFIED', 'FEATURED') 만 공개 (AGENTS.md 절대 규칙)
-- =============================================================
CREATE TABLE IF NOT EXISTS agent_packs (
  pack_id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 원천 지식 소스 연결 (선택)
  foundation_source_id  UUID        REFERENCES foundation_sources(source_id) ON DELETE SET NULL,
  -- 팩 제작자 (RBAC 100 Builder)
  builder_id            UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- 8-Block: A(Agent Role) S(Situation) T(Task) K(Knowledge)
  --           W(Watchouts) F(Flow) L(Length/Format) O(Output Contract)
  taskflow_blocks       JSONB       NOT NULL,
  -- SCL Stress Test 실행 증빙 run_id (SCL_VERIFIED 승급 시 기록)
  execution_proof_run_id UUID,
  -- 팩 상태 머신: DRAFT → IES_REJECTED / SCL_TESTING → SCL_VERIFIED → FEATURED
  status                TEXT        NOT NULL DEFAULT 'DRAFT'
                        CHECK (status IN (
                          'DRAFT', 'IES_REJECTED', 'SCL_TESTING', 'SCL_VERIFIED', 'FEATURED'
                        )),
  -- Fork 계보 커밋 트리 (parent pack_id 배열)
  lineage_commit_tree   UUID[],
  -- UI Forge 렌더링용 동적 폼 스키마 (SDD-05 MicroSaaSUISchema)
  micro_saas_ui_schema  JSONB,
  -- 누적 실행 횟수 (run_logs INSERT 트리거로 자동 증가)
  run_count             INT         DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE agent_packs IS
  'AgentPack 핵심 자산. SCL_VERIFIED/FEATURED 상태만 공개 마켓에 노출.';
COMMENT ON COLUMN agent_packs.taskflow_blocks IS
  '8-Block JSON: {A, S, T, K, W, F, L, O}';
COMMENT ON COLUMN agent_packs.micro_saas_ui_schema IS
  'UI Forge 동적 폼 스키마 — src/types/ui-forge.ts MicroSaaSUISchema 참조';
COMMENT ON COLUMN agent_packs.status IS
  'DRAFT | IES_REJECTED | SCL_TESTING | SCL_VERIFIED | FEATURED';

-- 인덱스: 마켓 리스트 쿼리 최적화 (status 필터 + run_count 정렬)
CREATE INDEX IF NOT EXISTS idx_agent_packs_status
  ON agent_packs (status);
CREATE INDEX IF NOT EXISTS idx_agent_packs_run_count
  ON agent_packs (run_count DESC);
CREATE INDEX IF NOT EXISTS idx_agent_packs_builder_id
  ON agent_packs (builder_id);


-- =============================================================
-- 테이블 3: run_logs
-- 역할: Learner의 Pack 실행 이력 기록. PoK 배당의 원천 데이터.
-- 관계: agent_packs 1:N, pok_ledger 1:N
-- 쓰기: /api/run (service_role 전용, Learner 직접 쓰기 불가)
-- =============================================================
CREATE TABLE IF NOT EXISTS run_logs (
  run_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id         UUID        NOT NULL REFERENCES agent_packs(pack_id) ON DELETE CASCADE,
  -- 실행한 Learner (익명 실행 시 NULL)
  learner_id      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  -- 과금 금액 (PoK 단위, 현재 단계에서는 0으로 고정 가능)
  charge_amount   INT         DEFAULT 0,
  -- LLM 출력 스냅샷 (최대 표시 용량 고려 — 필요 시 truncate)
  output_snapshot TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE run_logs IS
  'Pack 실행 로그. /api/run이 service_role로 INSERT. Learner는 본인 기록만 SELECT 가능.';
COMMENT ON COLUMN run_logs.charge_amount IS
  'PoK 단위 과금액. Sprint 1에서는 0 고정, 이후 정책에 따라 활성화.';

-- 인덱스: PoK 배당 집계, Learner 마이페이지 조회
CREATE INDEX IF NOT EXISTS idx_run_logs_pack_id
  ON run_logs (pack_id);
CREATE INDEX IF NOT EXISTS idx_run_logs_learner_id
  ON run_logs (learner_id);


-- =============================================================
-- 테이블 4: pok_ledger
-- 역할: PoK(Proof of Knowledge) 배당 원장
-- 배분 비율: Builder 40% / Contributor 30% / Author 20% / Platform 10%
-- 관계: run_logs 1:N
-- =============================================================
CREATE TABLE IF NOT EXISTS pok_ledger (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id        UUID        NOT NULL REFERENCES run_logs(run_id) ON DELETE CASCADE,
  -- PoK 수령인 (auth.users UUID)
  recipient_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- 수령인 역할: BUILDER(40%) CONTRIBUTOR(30%) AUTHOR(20%) PLATFORM(10%)
  role          TEXT        NOT NULL
                CHECK (role IN ('BUILDER', 'CONTRIBUTOR', 'AUTHOR', 'PLATFORM')),
  -- 배당 금액 (PoK 단위 정수)
  amount_won    INT         NOT NULL,
  -- 정산 완료 여부 (배치 정산 후 true로 업데이트)
  is_settled    BOOLEAN     DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE pok_ledger IS
  'PoK 배당 원장. 1건의 run_log당 최대 4건(BUILDER/CONTRIBUTOR/AUTHOR/PLATFORM) 생성.';
COMMENT ON COLUMN pok_ledger.role IS
  'BUILDER(40%) | CONTRIBUTOR(30%) | AUTHOR(20%) | PLATFORM(10%)';

-- 인덱스: 수령인별 잔액 집계 (마이페이지 PoK 잔액 조회)
CREATE INDEX IF NOT EXISTS idx_pok_ledger_recipient_id
  ON pok_ledger (recipient_id);
CREATE INDEX IF NOT EXISTS idx_pok_ledger_run_id
  ON pok_ledger (run_id);


-- =============================================================
-- 테이블 5: fork_tree
-- 역할: AgentPack 파생 계보 트리. Fork 기반 기여자의 PoK 근거.
-- 관계: agent_packs (parent) 1:N, agent_packs (child) 1:N
-- =============================================================
CREATE TABLE IF NOT EXISTS fork_tree (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 원본 팩
  parent_pack_id  UUID    NOT NULL REFERENCES agent_packs(pack_id) ON DELETE CASCADE,
  -- 파생 팩
  child_pack_id   UUID    NOT NULL REFERENCES agent_packs(pack_id) ON DELETE CASCADE,
  -- Fork 기여자 (RBAC 100, 선택)
  contributor_id  UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  -- IES-CL이 분석한 diff 요약 (변경된 Block, 개선 내용 등)
  diff_summary    TEXT,
  -- IES-CL이 측정한 품질 개선 점수 (0.0 ~ 1.0)
  quality_delta   FLOAT   DEFAULT 0.0,
  created_at      TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE fork_tree IS
  'AgentPack Fork 계보 트리. IES-CL Pre-Commit 검증 통과 후 cognitive-forge-os가 INSERT.';
COMMENT ON COLUMN fork_tree.quality_delta IS
  'IES-CL 품질 점수 개선분. 0.0~1.0 범위. CONTRIBUTOR PoK 가중치 계산에 사용.';

-- 인덱스: 계보 탐색
CREATE INDEX IF NOT EXISTS idx_fork_tree_parent_pack_id
  ON fork_tree (parent_pack_id);
CREATE INDEX IF NOT EXISTS idx_fork_tree_child_pack_id
  ON fork_tree (child_pack_id);


-- =============================================================
-- 테이블 6: quest_board
-- 역할: 베스트셀러 연동 퀘스트. /api/cron/quest-spawn이 자동 생성.
-- 관계: agent_packs 0:1 (퀘스트 해결 팩 연결)
-- =============================================================
CREATE TABLE IF NOT EXISTS quest_board (
  quest_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 퀘스트 제목 (예: "《그릿》 8-Block AgentPack을 가장 먼저 출시하세요!")
  title             TEXT        NOT NULL,
  -- 연동 베스트셀러 도서명
  target_book_title TEXT,
  -- 퀘스트 보상 PoK (기본 10,000 PoK)
  reward_pok        INT         DEFAULT 10000,
  -- 퀘스트 마감 기한
  deadline_at       TIMESTAMPTZ,
  -- 퀘스트를 먼저 달성한 팩 (SCL_VERIFIED 통과 팩이 연결)
  linked_pack_id    UUID        REFERENCES agent_packs(pack_id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE quest_board IS
  'Today''s Quest 목록. /api/cron/quest-spawn이 자동 INSERT. 홈(/)에 Realtime 표시.';
COMMENT ON COLUMN quest_board.reward_pok IS
  '퀘스트 달성 시 지급할 PoK. 기본 10,000 PoK.';

-- 인덱스: 홈 화면 마감 기한 기준 정렬
CREATE INDEX IF NOT EXISTS idx_quest_board_deadline_at
  ON quest_board (deadline_at DESC);
CREATE INDEX IF NOT EXISTS idx_quest_board_linked_pack_id
  ON quest_board (linked_pack_id);


-- =============================================================
-- 트리거 1: run_count 자동 증가
-- run_logs에 INSERT 발생 시 해당 agent_packs.run_count를 +1
-- =============================================================
CREATE OR REPLACE FUNCTION increment_run_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE agent_packs
  SET    run_count  = run_count + 1,
         updated_at = now()
  WHERE  pack_id = NEW.pack_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 기존 트리거 있으면 교체
DROP TRIGGER IF EXISTS trg_increment_run_count ON run_logs;
CREATE TRIGGER trg_increment_run_count
  AFTER INSERT ON run_logs
  FOR EACH ROW
  EXECUTE FUNCTION increment_run_count();

COMMENT ON FUNCTION increment_run_count() IS
  'run_logs INSERT 시 agent_packs.run_count를 원자적으로 증가시키는 트리거 함수.';


-- =============================================================
-- 트리거 2: agent_packs.updated_at 자동 갱신
-- =============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agent_packs_updated_at ON agent_packs;
CREATE TRIGGER trg_agent_packs_updated_at
  BEFORE UPDATE ON agent_packs
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

COMMENT ON FUNCTION set_updated_at() IS
  'UPDATE 전 updated_at을 현재 시각으로 자동 설정.';


-- =============================================================
-- 마이그레이션 완료 확인
-- =============================================================
DO $$
BEGIN
  RAISE NOTICE '✅ 001_cognitive_forge_market_init.sql 완료';
  RAISE NOTICE '   Tables  : foundation_sources, agent_packs, run_logs,';
  RAISE NOTICE '             pok_ledger, fork_tree, quest_board';
  RAISE NOTICE '   Triggers: trg_increment_run_count, trg_agent_packs_updated_at';
  RAISE NOTICE '   Next     : 002_rls_policies.sql 실행';
END $$;
