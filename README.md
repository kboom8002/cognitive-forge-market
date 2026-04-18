# cognitive-forge-market

> AgentPack 공개 마켓플레이스 — Cognitive Forge 생태계의 퍼블릭 실행 레이어

## 개요

이 레포는 `phalanx-media`를 Fork하여 **AgentPack Marketplace**로 재컴파일한 프로젝트입니다.

- **역할:** SCL Verified AgentPack의 공개 마켓플레이스 (UI Forge 실행 플랫폼)
- **관제탑:** `cognitive-forge-os` (별도 레포) — Pack 제작, 검증, 승인 담당
- **베이스:** `phalanx-media` (직계 Fork)

## 시작하기

```bash
npm install
npm run dev
# http://localhost:3001
```

## 환경 변수

`.env.local.example`을 복사하여 `.env.local` 작성:

```bash
cp .env.local.example .env.local
```

## 문서

| 문서 | 위치 |
|:---|:---|
| 전체 SDD 문서 14종 | `docs/` |
| AI-pair 코딩 프롬프트 | `AI_PAIR_PROMPTS.md` |
| 아키텍처 원본 | `cognitive_forge_architecture.md` (phalanx-os 참조) |

## 기술 스택

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **DB:** Supabase (PostgreSQL + Realtime + RLS)
- **AI:** OpenAI GPT-4o
- **Deploy:** Vercel Edge
- **Rate Limit:** Vercel KV

## 레포 관계도

```
cognitive-forge-os (내부 관제탑)     cognitive-forge-market (퍼블릭)
├── /studio/blueprint              ← → ├── /packs (마켓 리스트)
├── /api/ies-cl (검증)                  ├── /packs/[packId] (UI Forge 실행)
├── /api/scl-agent (스트레스 테스트)      ├── /api/run (SSE 실행엔진)
└── /admin (승인·PoK 관리)              └── /api/pok-distribute (배당)
                    ↕ Supabase agent_packs.status
```

## AGENTS.md 규칙

이 레포는 `AGENTS.md`의 Next.js 규칙을 따릅니다.  
코드 작성 전 반드시 `node_modules/next/dist/docs/`를 확인하세요.
