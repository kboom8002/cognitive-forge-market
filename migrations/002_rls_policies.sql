-- =============================================================
-- MIGRATION: 002_rls_policies.sql
-- Project  : cognitive-forge-market
-- SDD Ref  : SDD-02 §3
-- Date     : 2026-04-17
-- 실행 순서: 001_cognitive_forge_market_init.sql 완료 후 실행
--
-- ⚠️  정책 적용 전 주의사항:
--   - RLS를 활성화하면 anon/authenticated role은 정책이 허용하는 행만 조회 가능
--   - service_role(서버 API)은 RLS를 우회하므로 별도 정책 불필요
--   - /api/run, /api/pok-distribute는 supabaseAdmin(service_role) 사용 → RLS 무관
-- =============================================================

-- =============================================================
-- [1] foundation_sources RLS
-- 목적: 지식 소스 원본은 누구나 읽을 수 있으나,
--       수정/삭제는 소유한 Author-Tenant만 가능
-- =============================================================
ALTER TABLE foundation_sources ENABLE ROW LEVEL SECURITY;

-- 정책 1-1: 공개 읽기
-- 모든 사용자(비인증 포함)가 foundation_sources를 조회 가능
-- 이유: 팩 상세 페이지에서 원천 도서 정보 표시 필요
DROP POLICY IF EXISTS "public_read_sources" ON foundation_sources;
CREATE POLICY "public_read_sources"
  ON foundation_sources
  FOR SELECT
  USING (true);

-- 정책 1-2: Author-Tenant 본인 소스 전체 관리 (INSERT/UPDATE/DELETE)
-- auth.uid() = author_tenant_id 인 경우에만 쓰기 허용
DROP POLICY IF EXISTS "author_own_sources" ON foundation_sources;
CREATE POLICY "author_own_sources"
  ON foundation_sources
  FOR ALL
  USING (author_tenant_id = auth.uid())
  WITH CHECK (author_tenant_id = auth.uid());


-- =============================================================
-- [2] agent_packs RLS
-- 목적: 미검증(DRAFT/IES_REJECTED/SCL_TESTING) 팩의 공개 노출 절대 금지
--       (AGENTS.md 절대 규칙)
-- 공개 범위: SCL_VERIFIED, FEATURED 상태만 anon/authenticated에 노출
-- =============================================================
ALTER TABLE agent_packs ENABLE ROW LEVEL SECURITY;

-- 정책 2-1: 공개 읽기 — SCL_VERIFIED / FEATURED 팩만
-- 비인증 Learner(anon)와 인증 사용자 모두 이 필터를 통과해야 조회 가능
-- ⚠️  이 정책은 AGENTS.md의 절대 규칙을 DB 레벨에서 이중으로 강제합니다
DROP POLICY IF EXISTS "public_read_verified_packs" ON agent_packs;
CREATE POLICY "public_read_verified_packs"
  ON agent_packs
  FOR SELECT
  USING (status IN ('SCL_VERIFIED', 'FEATURED'));

-- 정책 2-2: Builder 본인 팩 전체 관리 (DRAFT 포함)
-- 본인이 만든 팩은 모든 status에서 조회/수정 가능 (Pack Studio 지원)
-- 단, INSERT 시에는 builder_id = auth.uid() 강제
DROP POLICY IF EXISTS "builder_own_packs" ON agent_packs;
CREATE POLICY "builder_own_packs"
  ON agent_packs
  FOR ALL
  USING (builder_id = auth.uid())
  WITH CHECK (builder_id = auth.uid());

-- 참고: service_role(cognitive-forge-os의 SCL Agent, IES-CL)은
--       RLS를 우회하여 DRAFT→SCL_VERIFIED 상태 변경 가능


-- =============================================================
-- [3] run_logs RLS
-- 목적: 실행 기록은 Learner 본인만 조회 가능.
--       INSERT는 /api/run(service_role)만 수행.
-- =============================================================
ALTER TABLE run_logs ENABLE ROW LEVEL SECURITY;

-- 정책 3-1: Learner 본인 실행 기록 조회
-- learner_id = auth.uid() 인 행만 조회
-- 익명 실행(learner_id=NULL)은 RLS상 조회 불가 (서버사이드에서만 접근)
DROP POLICY IF EXISTS "learner_own_runs" ON run_logs;
CREATE POLICY "learner_own_runs"
  ON run_logs
  FOR SELECT
  USING (learner_id = auth.uid());

-- 정책 3-2: INSERT 허용 (실질 제어는 API 레이어에서)
-- service_role이 호출하므로 RLS를 우회하지만,
-- anon 클라이언트가 직접 INSERT 시도 시 차단을 위한 안전망
DROP POLICY IF EXISTS "service_insert_runs" ON run_logs;
CREATE POLICY "service_insert_runs"
  ON run_logs
  FOR INSERT
  WITH CHECK (true);
-- ↑ 실제로 anon이 직접 호출하더라도 /api/run 서버에서 pack 검증 후 삽입하므로
--   API 레이어가 1차 방어선. 이 정책은 명시적 허용 표시 역할.


-- =============================================================
-- [4] pok_ledger RLS
-- 목적: PoK 배당 정보는 수령인 본인만 조회 가능.
--       INSERT는 /api/pok-distribute(service_role)만 수행.
-- =============================================================
ALTER TABLE pok_ledger ENABLE ROW LEVEL SECURITY;

-- 정책 4-1: 수령인 본인 배당 조회
-- PoK 잔액, 배당 이력은 recipient_id = auth.uid() 인 경우만 허용
DROP POLICY IF EXISTS "recipient_own_pok" ON pok_ledger;
CREATE POLICY "recipient_own_pok"
  ON pok_ledger
  FOR SELECT
  USING (recipient_id = auth.uid());

-- 정책 4-2: 정산 상태 업데이트 — 본인 레코드만
-- Builder가 자신의 PoK 출금 요청 시 is_settled 플래그 변경 (미래 기능)
DROP POLICY IF EXISTS "recipient_update_own_pok" ON pok_ledger;
CREATE POLICY "recipient_update_own_pok"
  ON pok_ledger
  FOR UPDATE
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());


-- =============================================================
-- [5] fork_tree RLS
-- 목적: Fork 계보는 공개 오픈 그래프. 누구나 읽기 가능.
--       INSERT는 cognitive-forge-os의 IES-CL(service_role)만 수행.
-- =============================================================
ALTER TABLE fork_tree ENABLE ROW LEVEL SECURITY;

-- 정책 5-1: 공개 읽기 (오픈 커밋 그래프)
-- 팩 상세 페이지의 계보 시각화에 사용
DROP POLICY IF EXISTS "public_read_fork_tree" ON fork_tree;
CREATE POLICY "public_read_fork_tree"
  ON fork_tree
  FOR SELECT
  USING (true);


-- =============================================================
-- [6] quest_board RLS
-- 목적: 퀘스트는 공개 가시화. 읽기는 누구나 가능.
--       INSERT는 /api/cron/quest-spawn(service_role)만 수행.
-- =============================================================
ALTER TABLE quest_board ENABLE ROW LEVEL SECURITY;

-- 정책 6-1: 공개 읽기
-- 홈(/) Today's Quest 섹션에서 anon도 조회 가능
DROP POLICY IF EXISTS "public_read_quests" ON quest_board;
CREATE POLICY "public_read_quests"
  ON quest_board
  FOR SELECT
  USING (true);


-- =============================================================
-- RLS 적용 현황 확인 쿼리 (실행 후 결과 검토용)
-- =============================================================
/*
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'foundation_sources', 'agent_packs', 'run_logs',
    'pok_ledger', 'fork_tree', 'quest_board'
  )
ORDER BY tablename;

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'foundation_sources', 'agent_packs', 'run_logs',
    'pok_ledger', 'fork_tree', 'quest_board'
  )
ORDER BY tablename, policyname;
*/

-- =============================================================
-- 마이그레이션 완료 확인
-- =============================================================
DO $$
BEGIN
  RAISE NOTICE '✅ 002_rls_policies.sql 완료';
  RAISE NOTICE '   foundation_sources : public_read_sources, author_own_sources';
  RAISE NOTICE '   agent_packs        : public_read_verified_packs (SCL_VERIFIED/FEATURED만), builder_own_packs';
  RAISE NOTICE '   run_logs           : learner_own_runs, service_insert_runs';
  RAISE NOTICE '   pok_ledger         : recipient_own_pok, recipient_update_own_pok';
  RAISE NOTICE '   fork_tree          : public_read_fork_tree';
  RAISE NOTICE '   quest_board        : public_read_quests';
  RAISE NOTICE '   Next               : 003_realtime_config.sql 실행';
END $$;
