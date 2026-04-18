# AI-Pair Coding Prompt Kit
## cognitive-forge-market

> **사용법:**  
> 1. 새 AI 세션을 열 때 해당 SDD 문서를 첨부합니다.  
> 2. 아래 프롬프트를 그대로 세션 첫 메시지로 사용합니다.  
> 3. 각 Sprint가 완료되면 다음 Sprint 프롬프트로 이동합니다.

---

## 📋 Sprint 진행 순서

| Sprint | 기간 | 프롬프트 | 완료 체크 |
|:-------|:-----|:---------|:---------:|
| 1 | Day 1~10 | PROMPT-01, 02 | [ ] |
| 2 | Day 11~20 | PROMPT-03, 07 | [ ] |
| 3 | Day 21~30 | PROMPT-04, 05 | [ ] |
| 4 | Day 31~45 | PROMPT-06, 08 | [ ] |
| 5 | Day 46~60 | PROMPT-09 | [ ] |

---

## [PROMPT-01] Sprint 1-A: 프로젝트 초기화

**첨부 문서:** `docs/SDD_00_Project_Charter.md`, `docs/SDD_01_Architecture_Overview.md`  
**참조 코드:** (현재 레포 전체)

```
당신은 Next.js 15 App Router 전문가입니다.
현재 레포(`cognitive-forge-market`)는 `phalanx-media`를 Fork하여 초기 파일 구조가 세팅된 상태입니다.
첨부된 SDD-00, SDD-01 문서를 기반으로 다음 작업을 수행해주세요.

[작업 목록]
1. `package.json`:
   - name을 "cognitive-forge-market"으로 변경
   - 다음 의존성 추가 필요 여부 확인 후 추가:
     - `@supabase/supabase-js` (최신)
     - `@supabase/auth-helpers-nextjs`
     - `@vercel/kv`
     - `react-markdown`
     - `remark-gfm`

2. `src/app/` 디렉토리 재구성:
   - `/canon` 폴더 → `/packs`로 이름 변경
   - `/experts` 폴더 → `/authors`로 이름 변경
   - 각 내부 파일의 import 경로 수정

3. `src/app/layout.tsx`:
   - TelemetryProvider 유지 (phalanx-media에서 이식된 그대로)
   - title 태그 → "Cognitive Forge Market"
   - Inter 폰트 유지

4. `.env.local.example` 신규 작성 (SDD-00 §5 환경변수 목록 기준)

5. `src/lib/supabase.ts` — 서버/클라이언트 분리 Supabase 클라이언트 유틸리티 작성

6. `src/types/` 폴더 신규 생성:
   - `database.ts` (SDD-02 §5 타입 정의 그대로 복사)
   - `ui-forge.ts` (SDD-05 §2 타입 정의 그대로 복사)

[주의사항]
- node_modules/next/dist/docs/ 를 먼저 확인하여 현재 Next.js 버전 API 검증
- phalanx-media의 TelemetryProvider, globals.css, api/og는 건드리지 말고 보존
- 각 파일 변경 전 현재 내용을 먼저 보여주고 변경안을 제시할 것
```

---

## [PROMPT-02] Sprint 1-B: Supabase 마이그레이션

**첨부 문서:** `docs/SDD_02_Database_Schema.md`

```
당신은 Supabase PostgreSQL 전문가입니다.
첨부된 SDD-02 문서를 기반으로 마이그레이션 파일 2개를 작성해주세요.

[작업 목록]
1. `migrations/001_cognitive_forge_market_init.sql` 작성
   - SDD-02 §2의 SQL을 그대로 사용
   - 실행 가능한 완전한 SQL 파일로 작성
   - 각 테이블 상단에 한글 주석 추가

2. `migrations/002_rls_policies.sql` 작성
   - SDD-02 §3의 RLS 정책 전체 작성
   - 각 정책에 목적 설명 주석 추가

3. `migrations/003_realtime_config.sql` 작성
   - SDD-02 §4의 Realtime 채널 구독을 위한
     테이블 REPLICA IDENTITY 설정

[출력 형식]
- 각 .sql 파일의 완전한 코드
- Supabase Dashboard에서 직접 실행 가능해야 함
- 기존 phalanx 테이블(fact_cards, garrison_posts 등)과 충돌하지 않도록
  별도 스키마 또는 명확한 네임스페이스 전략 제시
```

---

## [PROMPT-03] Sprint 2-A: 공개 마켓플레이스 페이지 3종

**첨부 문서:** `docs/SDD_04_Public_Marketplace.md`, `docs/SDD_08_SCL_Agent.md`  
**참조 코드:** 현재 `src/app/packs/` (이전 `/canon/` Fork 결과물)

```
당신은 Next.js 15 App Router + TypeScript 전문가입니다.
첨부된 SDD-04, SDD-08을 기반으로 공개 마켓플레이스 페이지 3종을 구현해주세요.

[작업 목록]

1. `src/app/page.tsx` — 홈 페이지 (Server Component)
   - QuestHero 섹션: Supabase에서 quest_board 최신 1건 조회
   - FeaturedPacksGrid: status IN ('FEATURED', 'SCL_VERIFIED'), run_count DESC, 6개
   - 디자인: 다크 테마, glassmorphism 카드, Inter 폰트 유지
   - JSON-LD 스키마 추가 (SEO)

2. `src/components/pack-card.tsx` — PackCard 컴포넌트
   - SDD-04 §2의 PackCardProps 인터페이스 기준
   - SCL Verified 배지 (Emerald, 우상단 고정)
   - Featured 배지 추가
   - hover 시 scale(1.02) 트랜지션
   - run_count 표시

3. `src/components/scl-badge.tsx` — SCL 배지 컴포넌트
   - SDD-08 §2 기준

4. `src/app/packs/page.tsx` — 마켓 리스트 (Server Component)
   - URL 쿼리 파라미터 필터 (category, sort, source_type)
   - 12개씩 페이지네이션
   - 미인증 상태에서도 완전 접근 가능

5. `src/app/authors/page.tsx` — Author Hub (Server Component)
   - phalanx-media의 /experts/page.tsx 구조 참고 Fork

[주의사항]
- SCL_VERIFIED / FEATURED 두 status만 쿼리에 포함 (절대 규칙)
- Supabase 클라이언트는 src/lib/supabase.ts 유틸 사용
- 개발 환경: Supabase 연결 없어도 더미 데이터 fallback으로 UI 확인 가능하게
```

---

## [PROMPT-04] Sprint 2-B: TelemetryProvider + Dynamic OG 이식

**첨부 문서:** `docs/SDD_11_Telemetry_OG.md`  
**참조 코드:** `src/components/telemetry-provider.tsx`, `src/app/api/og/route.tsx` (기존 파일)

```
당신은 Next.js @vercel/og + 성능 최적화 전문가입니다.
phalanx-media에서 이식된 기존 파일들을 cognitive-forge-market 용도에 맞게 확장해주세요.

[작업 목록]

1. `src/components/telemetry-provider.tsx` 확장
   - SDD-11 §1의 MarketEvent 타입 추가
   - pack_view, pack_run_start, pack_run_complete 이벤트 지원
   - 기존 Base 이벤트 로직은 건드리지 않음

2. `src/app/api/og/route.tsx` 확장
   - 기존 phalanx-media OG 로직 유지
   - `?type=pack&packId={uuid}` 분기 추가
   - `?type=author&authorId={uuid}` 분기 추가
   - SDD-11 §2의 Pack OG 디자인 명세 적용
     (다크 배경, 팩 제목, SCL 배지, Run 카운트)

3. `src/app/packs/[packId]/page.tsx` generateMetadata 추가
   - SDD-11 §3 패턴 그대로 구현

[주의사항]
- OG는 Edge Runtime에서 실행 (export const runtime = 'edge' 유지)
- 기존 동작 깨지지 않게 기존 코드 먼저 분석 후 확장
```

---

## [PROMPT-05] Sprint 3-A: UI Forge 렌더링 엔진

**첨부 문서:** `docs/SDD_05_UI_Forge_Engine.md`

```
당신은 React + TypeScript 전문가입니다.
첨부된 SDD-05 전체를 기반으로 UI Forge 렌더링 엔진을 구현해주세요.

[작업 목록]

1. `src/types/ui-forge.ts` — 타입 정의 (SDD-05 §2 그대로)

2. `src/components/ui-forge/fields/`:
   - `FileUploadField.tsx` — 드래그앤드롭 + 파일 미리보기
   - `DropdownField.tsx` — 커스텀 스타일 Select
   - `TextAreaField.tsx` — 자동 리사이즈
   - `TextInputField.tsx` — 단일 라인
   - `SliderField.tsx` — 범위 슬라이더 + 현재값 표시

3. `src/components/ui-forge/RunButton.tsx`
   - 비활성(입력 미완료), 로딩(스트리밍 중), 완료 3가지 상태
   - 예상 실행 시간 표시 (estimated_time_seconds)
   - 진행 바 애니메이션

4. `src/components/ui-forge/OutputPanel.tsx`
   - SSE 청크 실시간 스트리밍 렌더링
   - react-markdown + remark-gfm으로 Markdown 렌더링
   - 완료 후: 복사 버튼 + DOCX 다운로드 버튼
   - 커서 깜빡임 애니메이션 (스트리밍 중)

5. `src/components/ui-forge/UIForgeRenderer.tsx`
   - SDD-05 §5 명세 그대로 구현
   - Client Component ('use client')

6. `src/lib/run-pack.ts`
   - SDD-05 §7 SSE 클라이언트 로직 구현

[주의사항]
- UIForgeRenderer는 Client Component, 나머지 Field들도 CC
- 파일 업로드는 실제 Supabase Storage 업로드 후 URL 반환 (또는 개발 중엔 base64)
- 모바일 반응형 고려 (input 필드 터치 친화적)
- SDD-05 §8의 예시 스키마로 테스트 가능하게
```

---

## [PROMPT-06] Sprint 3-B: Pack Run API (SSE)

**첨부 문서:** `docs/SDD_06_Pack_Run_API.md`  
**참조 코드:** `phalanx-os/src/app/api/forge-content/route.ts` (구조 참고)

```
당신은 Next.js 15 Route Handlers + OpenAI Streaming 전문가입니다.
첨부된 SDD-06 전체를 기반으로 /api/run 엔드포인트를 구현해주세요.

[작업 목록]

1. `src/lib/rate-limit.ts`
   - Vercel KV 기반 Rate Limiting (SDD-03 §5)
   - IP + userId 기반 복합 identifier

2. `src/lib/assemble-prompt.ts`
   - SDD-06 §4 assembleSystemPrompt, assembleUserMessage 구현
   - {variable_key} 플레이스홀더 치환 로직

3. `src/app/api/run/route.ts`
   - SDD-06 §5 전체 구조 구현
   - SSE ReadableStream 방식
   - OPENAI_API_KEY 없으면 Mock 스트리밍 fallback (SDD-06 §6)
   - run_logs INSERT (비동기)
   - /api/pok-distribute 트리거 (비동기, fire-and-forget)

[주의사항]
- Node.js Runtime (edge 아님) — 파일 처리 필요
- SSE 스트림이 Vercel Serverless 타임아웃(30s) 내 완료되도록
- chargeAmount 로직은 일단 하드코딩 (200원)으로 시작, TODO 주석 달기
- 첫 청크 응답 < 1s 목표
```

---

## [PROMPT-07] Sprint 4-A: PoK 배당 API

**첨부 문서:** `docs/SDD_09_PoK_Royalty.md`

```
당신은 Supabase + TypeScript 전문가입니다.
첨부된 SDD-09 전체를 기반으로 /api/pok-distribute를 구현해주세요.

[작업 목록]

1. `src/lib/pok.ts`
   - SDD-09 §4 calculateContributorShares 구현
   - Fork Tree 역추적 + quality_delta 가중 분배

2. `src/app/api/pok-distribute/route.ts`
   - SDD-09 §5 전체 구조 구현
   - x-internal-secret 헤더 인증
   - pok_ledger 일괄 INSERT
   - Builder + Contributors + Author + Platform 분배

3. `src/app/authors/dashboard/page.tsx`
   - Author-Tenant 전용 수익 대시보드 (Level 300+)
   - 미정산(pending), 정산완료(settled) 탭
   - 월별 누적 차트 (간단한 table 형태도 OK)

[주의사항]
- PLATFORM_RECIPIENT_ID는 .env.local에 설정
- Foundation_sources에 author_tenant_id가 null인 팩의 Author 20% → Platform으로 귀속
- 원자성: 전체 INSERT 실패 시 롤백 (Supabase RPC 활용)
```

---

## [PROMPT-08] Sprint 4-B: Cron Quest 스폰

**첨부 문서:** `docs/SDD_12_Cron_Quest.md`  
**참조 코드:** `phalanx-os/src/app/api/cron/sometrend/route.ts`

```
당신은 Next.js Vercel Cron + Supabase 전문가입니다.
첨부된 SDD-12를 기반으로 퀘스트 스폰 시스템을 구현해주세요.

[작업 목록]

1. `vercel.json`
   - Cron 설정 추가 (SDD-12 §2)

2. `src/app/api/cron/quest-spawn/route.ts`
   - SDD-12 §3 전체 구조 구현
   - CRON_SECRET 인증
   - 베스트셀러 파싱: 초기에는 hardcoded fallback, 실제 API는 TODO
   - quest_board INSERT

3. `src/components/quest-hero.tsx`
   - SDD-12 §4 QuestHero 컴포넌트
   - Supabase Realtime 구독으로 자동 갱신
   - 마감countdown 타이머

4. 홈 페이지(`src/app/page.tsx`)에 QuestHero 컴포넌트 배치

[주의사항]
- Cron 수동 실행으로 테스트 가능하게 (GET /api/cron/quest-spawn with proper auth)
```

---

## [PROMPT-09] Sprint 5: E2E 검증 & 통합 테스트

**첨부 문서:** 전체 SDD 14종

```
cognitive-forge-market의 핵심 플로우를 E2E로 검증해주세요.

[검증 시나리오 1: Learner Pack 실행 전주기]
1. 홈 페이지(/) 접속 → SCL_VERIFIED 팩 카드 표시 확인
2. PackCard 클릭 → /packs/[packId] → UI Forge 동적 폼 렌더링 확인
   - 더미 pack_id: 테스트용 SCL_VERIFIED 상태 팩 Supabase에 직접 INSERT
3. 폼 입력 후 [Run] 클릭 → SSE 스트리밍 Output 확인
4. Supabase에서 run_logs 행 생성 확인
5. Supabase에서 pok_ledger 행 생성 확인

[검증 시나리오 2: OG 이미지]
1. GET /api/og?type=pack&packId={test-uuid}
2. 이미지 정상 반환 확인 (200, image/png)
3. /packs/[packId] 페이지 소스에서 og:image 메타태그 확인

[검증 시나리오 3: Cron Quest]
1. GET /api/cron/quest-spawn (Authorization 헤더 포함)
2. quest_board 행 생성 확인
3. 홈 페이지 Today's Quest 갱신 확인

[검증 시나리오 4: 미검증 팩 접근 차단]
1. status=DRAFT인 팩의 packId로 직접 URL 접근
2. 404 페이지 반환 확인

[성능 체크리스트]
- [ ] LCP < 2.5s (홈, /packs, /packs/[packId])
- [ ] Run API SSE 첫 청크 < 1s
- [ ] OG 이미지 생성 < 500ms
- [ ] /packs 리스트 쿼리 < 200ms

각 시나리오 결과를 표 형태로 정리하고 실패 케이스에 대한 수정 방향을 제시해주세요.
```

---

## 📁 이 파일의 위치

```
cognitive-forge-market/
├── docs/
│   ├── SDD_00_Project_Charter.md
│   ├── SDD_01_Architecture_Overview.md
│   ├── SDD_02_Database_Schema.md
│   ├── SDD_03_RBAC_Auth.md
│   ├── SDD_04_Public_Marketplace.md
│   ├── SDD_05_UI_Forge_Engine.md
│   ├── SDD_06_Pack_Run_API.md
│   ├── SDD_07_IES_CL_Pipeline.md
│   ├── SDD_08_SCL_Agent.md
│   ├── SDD_09_PoK_Royalty.md
│   ├── SDD_10_Auto_Miner.md
│   ├── SDD_11_Telemetry_OG.md
│   ├── SDD_12_Cron_Quest.md
│   └── SDD_13_Personal_MCP_Bridge.md
└── AI_PAIR_PROMPTS.md   ← 이 파일
```
