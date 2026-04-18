# SDD-01: Architecture Overview
## cognitive-forge-market

**버전:** 1.0 | **날짜:** 2026-04-17

---

## 1. phalanx-media → cognitive-forge-market 컴포넌트 매핑

| phalanx-media 원본 | cognitive-forge-market 대응 | 재활용 방식 |
|:---|:---|:---|
| `/canon` 목록 페이지 | `/packs` 마켓플레이스 | Fork + Supabase 쿼리 교체 |
| `/canon/[chapterId]` 상세 | `/packs/[packId]` 상세 + 실행뷰 | Fork + UI Forge 렌더러 추가 |
| `/experts` 로스터 | `/authors` Author-Tenant Hub | Fork + BaaS 수익 패널 추가 |
| `/experts/[expertId]` | `/authors/[authorId]` | Fork + 팩 목록 추가 |
| `/api/og` | `/api/og` (Pack/Author 전용 확장) | 직접 이식 |
| `TelemetryProvider` | `TelemetryProvider` (Run 이벤트 추가) | 직접 이식 |
| *(없음)* | `/api/run` | 🆕 신규 구현 |
| *(없음)* | `/api/pok-distribute` | 🆕 신규 구현 |
| *(없음)* | `/api/cron/quest-spawn` | 🆕 신규 구현 |
| *(없음)* | `UIForgeRenderer` 컴포넌트 | 🆕 신규 구현 |

---

## 2. 전체 시스템 아키텍처

```mermaid
graph TB
    subgraph MARKET["🌐 cognitive-forge-market (Public, :3001)"]
        MKT_HOME["/ 홈<br/>(Today's Quest + Featured Packs)"]
        MKT_PACK["/packs<br/>AgentPack 마켓플레이스<br/>(SCL_VERIFIED 필터)"]
        MKT_DETAIL["/packs/[packId]<br/>UI Forge 렌더링뷰<br/>(Learner 전용 Micro-SaaS)"]
        MKT_AUTHORS["/authors<br/>Author-Tenant Hub"]
        MKT_AUTHOR_DETAIL["/authors/[authorId]<br/>저자 프로필 + Official Packs"]
        MKT_RUN["/api/run<br/>CasePack 실행엔진 (SSE)"]
        MKT_POK["/api/pok-distribute<br/>PoK 배당 트리거"]
        MKT_OG["/api/og<br/>Dynamic OG Image"]
        MKT_CRON["/api/cron/quest-spawn<br/>베스트셀러 퀘스트 스폰"]
        MKT_TELE["TelemetryProvider<br/>(Run 횟수 → PoK 트래킹)"]
    end

    subgraph OS["🛡️ cognitive-forge-os (Internal, :3000)"]
        OS_STUDIO["/studio/blueprint<br/>Pack Studio (에디터)"]
        OS_IES["/api/ies-cl<br/>Pre-Commit 검증"]
        OS_SCL["/api/scl-agent<br/>SCL Stress Test"]
        OS_ADMIN["/admin<br/>승인·PoK 관리"]
    end

    subgraph DATA["🗃️ 데이터 레이어"]
        DB[("🐘 Supabase<br/>agent_packs<br/>run_logs<br/>pok_ledger<br/>fork_tree<br/>foundation_sources<br/>quest_board")]
        DB_RT["⚡ Supabase Realtime"]
        KV["🔑 Vercel KV<br/>Rate Limiting"]
        OPENAI["🧠 OpenAI GPT-4o"]
    end

    %% Learner Flow
    MKT_DETAIL -->|"[Run] 클릭"| MKT_RUN
    MKT_RUN --> OPENAI
    MKT_RUN -->|"run_logs INSERT"| DB
    MKT_RUN -->|"PoK 트리거"| MKT_POK
    MKT_POK -->|"pok_ledger INSERT"| DB
    MKT_TELE -->|"view/run 이벤트"| DB

    %% Pack 상태 구독
    DB_RT -->|"SCL_VERIFIED 업데이트"| MKT_PACK
    DB_RT -->|"Quest 갱신"| MKT_HOME

    %% OS → Market 상태 흐름
    OS_SCL -->|"status=SCL_VERIFIED"| DB
    OS_ADMIN -->|"status=FEATURED"| DB

    %% Cron
    MKT_CRON -->|"quest_board INSERT"| DB
    DB -->|"퀘스트 데이터"| MKT_HOME

    %% Rate Limiting
    MKT_RUN --> KV
```

---

## 3. Learner 실행 전주기 플로우

```mermaid
sequenceDiagram
    participant L as 🎓 Learner
    participant MKT as 🌐 Market UI
    participant RUN as /api/run
    participant LLM as 🧠 OpenAI GPT-4o
    participant DB as 🐘 Supabase
    participant POK as /api/pok-distribute

    L->>MKT: /packs 접속 (SCL_VERIFIED 팩 탐색)
    L->>MKT: /packs/[packId] 클릭 (UI Forge 로드)
    MKT->>MKT: micro_saas_ui_schema 파싱 → 동적 폼 렌더링
    L->>MKT: 폼 입력 (K_In, S_Situation, A_Role 등)
    L->>RUN: [Run] 클릭 → POST /api/run
    RUN->>DB: agent_packs 조회 (status=SCL_VERIFIED 검증)
    RUN->>LLM: 8-Block 프롬프트 조립 + 변수 주입 → stream
    LLM-->>RUN: SSE 청크 스트리밍
    RUN-->>MKT: SSE → OutputPanel 실시간 렌더링
    RUN->>DB: run_logs INSERT (비동기)
    RUN->>POK: /api/pok-distribute 트리거 (비동기)
    POK->>DB: pok_ledger INSERT (Builder 40% / PR기여자 30% / Author 20% / Platform 10%)
    LLM-->>L: 완성된 Output (Markdown/DOCX)
```

---

## 4. 라우트 전체 목록

| 라우트 | 타입 | 설명 |
|:---|:---:|:---|
| `/` | Page (SC) | 홈: Today's Quest + Featured Packs |
| `/packs` | Page (SC) | 마켓 리스트 (필터/정렬) |
| `/packs/[packId]` | Page (SC+CC) | UI Forge 렌더링 + Run |
| `/authors` | Page (SC) | Author-Tenant 로스터 |
| `/authors/[authorId]` | Page (SC) | 저자 프로필 + Official Packs |
| `/api/run` | Route Handler | CasePack 실행 (SSE) |
| `/api/pok-distribute` | Route Handler | PoK 배당 (Internal) |
| `/api/og` | Route Handler | Dynamic OG Image (Edge) |
| `/api/cron/quest-spawn` | Route Handler | 퀘스트 스폰 (Cron) |

> SC = Server Component, CC = Client Component

---

## 5. 인프라 스펙

| 서비스 | 플랫폼 | 예상 도메인 |
|:---|:---|:---|
| `cognitive-forge-market` | Vercel Edge | `market.cognitiveforge.io` |
| Supabase | Supabase Cloud | 기존 phalanx-os와 동일 프로젝트 또는 신규 |
| OpenAI | OpenAI API | GPT-4o |
| Rate Limit | Vercel KV | Learner IP 기준 분당 10회 |
