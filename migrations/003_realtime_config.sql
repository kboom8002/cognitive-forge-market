-- =============================================================
-- MIGRATION: 003_realtime_config.sql
-- Project  : cognitive-forge-market
-- SDD Ref  : SDD-02 §4
-- Date     : 2026-04-17 (수정: 2026-04-18 — 중복 등록 방지)
-- 실행 순서: 002_rls_policies.sql 완료 후 실행
--
-- 목적: Supabase Realtime 채널 구독을 위한 테이블 설정
--       기본 REPLICA IDENTITY는 DEFAULT(PK만 포함)이므로
--       UPDATE 이벤트에서 변경 전/후 전체 행 데이터를 받으려면
--       REPLICA IDENTITY FULL로 변경 필요.
--
-- 채널 목록 (SDD-02 §4):
--   scl-updates     : agent_packs UPDATE (status=SCL_VERIFIED) → 마켓 배지 갱신
--   featured-updates: agent_packs UPDATE (status=FEATURED)     → 홈 Featured 섹션
--   quest-updates   : quest_board INSERT                       → 홈 Today's Quest
--
-- ⚠️  수정 이력:
--   2026-04-18 — ALTER PUBLICATION ... ADD TABLE을 DO $$ 블록으로 감싸
--                pg_publication_tables 확인 후 미등록 시에만 추가하도록 변경
--                (ERROR: 42710: already member of publication 방지)
-- =============================================================


-- =============================================================
-- [1] Supabase Realtime Publication 등록 (멱등성 보장)
--
-- pg_publication_tables를 사전 확인하여 미등록 테이블만 추가
-- → 재실행 시 42710 에러 없이 안전하게 통과
-- =============================================================

DO $$
BEGIN
  -- agent_packs: SCL_VERIFIED/FEATURED 상태 변경 실시간 구독용
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname   = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename  = 'agent_packs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE agent_packs;
    RAISE NOTICE '✅ agent_packs → supabase_realtime 등록 완료';
  ELSE
    RAISE NOTICE 'ℹ️  agent_packs 이미 supabase_realtime에 등록됨 — 건너뜀';
  END IF;

  -- quest_board: 새 퀘스트 INSERT 실시간 구독용
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname   = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename  = 'quest_board'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE quest_board;
    RAISE NOTICE '✅ quest_board → supabase_realtime 등록 완료';
  ELSE
    RAISE NOTICE 'ℹ️  quest_board 이미 supabase_realtime에 등록됨 — 건너뜀';
  END IF;
END $$;


-- =============================================================
-- [2] REPLICA IDENTITY 설정
--
-- 기본값(DEFAULT): INSERT/DELETE 이벤트에서 PK만 전송
-- FULL           : UPDATE 이벤트에서 변경 전/후 전체 컬럼 전송
--
-- Supabase Realtime의 filter 기능(status=SCL_VERIFIED 등)은
-- REPLICA IDENTITY FULL이 필요합니다.
--
-- 참고: REPLICA IDENTITY 변경은 멱등성이 있어 중복 실행 안전
-- =============================================================

-- agent_packs: STATUS 변경을 감지해야 하므로 FULL 설정
-- - scl-updates 채널: status → 'SCL_VERIFIED' 감지
-- - featured-updates 채널: status → 'FEATURED' 감지
ALTER TABLE agent_packs REPLICA IDENTITY FULL;

-- quest_board: INSERT만 구독하므로 DEFAULT로 충분하지만
-- 향후 quest 상태 업데이트 구독 확장을 위해 FULL 설정
ALTER TABLE quest_board REPLICA IDENTITY FULL;


-- =============================================================
-- [3] 클라이언트 구독 예시 (TypeScript — 참고용, SQL 아님)
-- =============================================================
/*
import { supabaseClient } from '@/lib/supabase';

// ── 채널 1: scl-updates ────────────────────────────────────
// 마켓 팩 목록에서 SCL_VERIFIED 뱃지 실시간 갱신
const sclChannel = supabaseClient
  .channel('scl-updates')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'agent_packs',
      filter: 'status=eq.SCL_VERIFIED',
    },
    (payload) => {
      // payload.new: 업데이트된 agent_packs 행
      console.log('SCL Verified:', payload.new);
      // → 해당 packId 카드에 ✅ 배지 표시
    }
  )
  .subscribe();

// ── 채널 2: featured-updates ───────────────────────────────
// 홈 Featured Packs 섹션 실시간 갱신
const featuredChannel = supabaseClient
  .channel('featured-updates')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'agent_packs',
      filter: 'status=eq.FEATURED',
    },
    (payload) => {
      console.log('Featured Pack:', payload.new);
      // → 홈 화면 Featured 카드 갱신
    }
  )
  .subscribe();

// ── 채널 3: quest-updates ──────────────────────────────────
// 홈 Today's Quest 실시간 갱신
const questChannel = supabaseClient
  .channel('quest-updates')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'quest_board',
    },
    (payload) => {
      console.log('New Quest:', payload.new);
      // → 홈 화면 퀘스트 카드 추가
    }
  )
  .subscribe();

// 페이지 언마운트 시 구독 해제
// supabaseClient.removeChannel(sclChannel);
// supabaseClient.removeChannel(featuredChannel);
// supabaseClient.removeChannel(questChannel);
*/


-- =============================================================
-- [4] 설정 확인 쿼리 (실행 후 결과 검토용)
-- =============================================================
/*
-- Publication 등록 테이블 확인
SELECT
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('agent_packs', 'quest_board')
ORDER BY tablename;

-- REPLICA IDENTITY 설정 확인
SELECT
  c.relname AS table_name,
  CASE c.relreplident
    WHEN 'd' THEN 'DEFAULT (PK only)'
    WHEN 'f' THEN 'FULL (all columns)'
    WHEN 'i' THEN 'INDEX'
    WHEN 'n' THEN 'NOTHING'
  END AS replica_identity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('agent_packs', 'quest_board')
ORDER BY c.relname;
*/


-- =============================================================
-- [5] Supabase Dashboard 수동 설정 안내
-- SQL만으로 불가한 Realtime 설정은 Dashboard에서 수행:
--
-- 1. Supabase Dashboard → Database → Replication
-- 2. "supabase_realtime" publication 선택
-- 3. "agent_packs", "quest_board" 테이블 체크 확인
-- 4. Realtime → Inspect (채널 정상 구독 확인)
--
-- ⚠️ Supabase 무료 플랜: 동시 Realtime 구독 수 제한 있음 (200개)
-- =============================================================


-- =============================================================
-- 마이그레이션 완료 확인
-- =============================================================
DO $$
BEGIN
  RAISE NOTICE '✅ 003_realtime_config.sql 완료';
  RAISE NOTICE '   Publication : supabase_realtime에 agent_packs, quest_board 등록 (멱등성 보장)';
  RAISE NOTICE '   REPLICA IDENTITY FULL: agent_packs, quest_board';
  RAISE NOTICE '   채널 목록:';
  RAISE NOTICE '     scl-updates      → agent_packs UPDATE (status=SCL_VERIFIED)';
  RAISE NOTICE '     featured-updates → agent_packs UPDATE (status=FEATURED)';
  RAISE NOTICE '     quest-updates    → quest_board INSERT';
  RAISE NOTICE '   ✅ 전체 마이그레이션 완료 (001 → 002 → 003)';
END $$;
