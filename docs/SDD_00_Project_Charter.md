# SDD-00: Project Charter
## cognitive-forge-market

**버전:** 1.0  
**날짜:** 2026-04-17  
**연관 레포:** `cognitive-forge-os` (내부 관제탑), `cognitive-forge-market` (본 문서)  
**계승 출처:** `phalanx-media` (직계 Fork)

---

## 1. 프로젝트 정체성

| 항목 | 내용 |
|:---|:---|
| **레포명** | `cognitive-forge-market` |
| **역할** | AgentPack 공개 마켓플레이스 (Learner 전용 Micro-SaaS 실행 플랫폼) |
| **포트** | `:3001` (개발), Vercel Edge (프로덕션) |
| **기술 스택** | Next.js 15 (App Router), TypeScript, Supabase, Vercel Edge, `@vercel/og` |
| **계승** | `phalanx-media` → 직접 Fork (라우트 구조·OG·Telemetry 재활용) |

---

## 2. 비즈니스 목적

`phalanx-media`가 "정치 여론 퍼블릭 미디어"였다면,  
`cognitive-forge-market`은 **"8-Block AgentPack의 공개 마켓플레이스"**입니다.

### 대상 사용자 (RBAC)

| Level | 역할 | 이 레포에서 하는 일 |
|:---:|:---|:---|
| 0 | Learner (비회원/일반) | SCL Verified 팩 탐색→실행→Output 수령 |
| 100 | Builder | 내 팩 실행 통계, PoK 배당 확인 |
| 300 | Author-Tenant | 공식 팩 공개 프로필, BaaS 수익 확인 |

> Admin(400+), PlatformOwner(500)의 **관리 작업은 전부 `cognitive-forge-os` 담당**.  
> 이 레포는 **공개 소비 레이어**만 책임집니다.

---

## 3. 범위 (Scope)

### ✅ In-Scope (이 레포가 담당)

- 공개 마켓플레이스 페이지 (`/`, `/packs`, `/packs/[packId]`, `/authors`, `/authors/[authorId]`)
- **UI Forge 렌더링 엔진** — `micro_saas_ui_schema` JSON → 동적 Micro-SaaS 폼
- **Pack Run API** — `/api/run` (SSE 스트리밍, LLM 조율)
- **PoK 배당 트리거** — `/api/pok-distribute` (Run 완료 시 자동 호출)
- **Dynamic OG** — `/api/og` (Pack/Author별 소셜 미리보기 이미지)
- **TelemetryProvider** — Run 실행 이벤트 적재
- **Cron Quest 스폰** — `/api/cron/quest-spawn` (베스트셀러 퀘스트 자동 생성)

### ❌ Out-of-Scope (cognitive-forge-os 담당)

| 기능 | 담당 레포 |
|:---|:---|
| Pack Studio (8-Block 에디터) | `cognitive-forge-os` |
| IES-CL Pre-Commit 검증 실행 | `cognitive-forge-os` |
| SCL Stress Test 실행 서버 | `cognitive-forge-os` |
| Admin War Room (승인·배당 관리) | `cognitive-forge-os` |
| Auto-Miner (원고 → 8-Block 역공학) | `cognitive-forge-os` |

---

## 4. 성공 지표 (KPI)

| 지표 | 목표값 |
|:---|:---|
| Pack Run 완료율 | > 90% |
| SCL Verified 팩 노출 비율 | 100% (미검증 팩 노출 절대 금지) |
| LCP (Largest Contentful Paint) | < 2.5s |
| Run API SSE 첫 청크 응답 | < 1s |
| OG 이미지 생성 시간 | < 500ms |

---

## 5. 환경 변수 (필수)

`.env.local.example` 참조. 핵심 목록:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
KV_REST_API_URL=
KV_REST_API_TOKEN=
INTERNAL_API_SECRET=       # /api/pok-distribute 내부 호출 인증
CRON_SECRET=               # Vercel Cron 인증
```

---

## 6. 연관 문서

| 문서 | 설명 |
|:---|:---|
| `SDD_01_Architecture_Overview.md` | 전체 시스템 구조 다이어그램 |
| `SDD_02_Database_Schema.md` | Supabase ERD + RLS 정책 |
| `SDD_03_RBAC_Auth.md` | RBAC 인증 체계 |
| `SDD_04_Public_Marketplace.md` | 마켓 페이지 명세 |
| `SDD_05_UI_Forge_Engine.md` | 동적 렌더링 엔진 |
| `SDD_06_Pack_Run_API.md` | SSE 실행 API |
| `SDD_07_IES_CL_Pipeline.md` | 검증 상태 연동 (OS 담당) |
| `SDD_08_SCL_Agent.md` | SCL 배지 연동 (OS 담당) |
| `SDD_09_PoK_Royalty.md` | PoK 배당 시스템 |
| `SDD_10_Auto_Miner.md` | Auto-Miner 연동 (OS 담당) |
| `SDD_11_Telemetry_OG.md` | Telemetry + OG 이미지 |
| `SDD_12_Cron_Quest.md` | 베스트셀러 퀘스트 스폰 |
| `SDD_13_Personal_MCP_Bridge.md` | Personal MCP 컨텍스트 주입 |
