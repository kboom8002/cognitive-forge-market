# SDD-04: Public Marketplace Pages
## cognitive-forge-market

**버전:** 1.0 | **날짜:** 2026-04-17

---

## 1. 홈 페이지 (`/`)

### 목적
Today's Quest (베스트셀러 연동 퀘스트) + Featured SCL Verified Packs 쇼케이스.  
**phalanx-media 계승:** AEO-First 구조 유지 (JSON-LD Schema, FAQ 구조화)

### 데이터 소스
```typescript
// Server Component에서 병렬 fetch
const [featuredPacks, todayQuest] = await Promise.all([
  supabase.from('agent_packs')
    .select('*, foundation_sources(title, source_type)')
    .in('status', ['FEATURED', 'SCL_VERIFIED'])
    .order('run_count', { ascending: false })
    .limit(6),
  supabase.from('quest_board')
    .select('*')
    .gt('deadline_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
]);
```

### UI 구성
```
HomPage
├── QuestHero          ← Today's Quest 히어로 배너
│   ├── 퀘스트 제목 + 대상 도서
│   ├── 마감 카운트다운
│   └── 리워드 PoK 표시
├── FeaturedPacksGrid  ← 6개 팩 카드 그리드
│   └── PackCard × 6   (SCL Verified 배지 포함)
├── AuthorSpotlight    ← Author-Tenant 추천 섹션
└── FAQ (JSON-LD)      ← AEO/GEO SEO 최적화
```

### JSON-LD Schema
```json
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "Cognitive Forge — AgentPack Marketplace",
  "description": "AI 검증 완료된 지식 패키지를 실행하는 마켓플레이스",
  "itemListElement": []
}
```

---

## 2. 마켓플레이스 리스트 (`/packs`)

### 필터 체계 (URL Query Params)
| 파라미터 | 타입 | 예시 |
|:---|:---|:---|
| `category` | string | `?category=legal` |
| `tag` | string | `?tag=계약서` |
| `sort` | `run_count \| latest \| featured` | `?sort=run_count` |
| `source_type` | `BOOK \| EXPERT_DOC` | `?source_type=BOOK` |

### 데이터 쿼리
```typescript
// SCL_VERIFIED + FEATURED만 노출 (절대 규칙)
const query = supabase
  .from('agent_packs')
  .select(`
    pack_id, status, run_count, micro_saas_ui_schema,
    foundation_sources(title, source_type),
    builder:builder_id(display_name, avatar_url)
  `)
  .in('status', ['SCL_VERIFIED', 'FEATURED']);

// 정렬 적용
if (sort === 'run_count') query.order('run_count', { ascending: false });
else if (sort === 'latest') query.order('created_at', { ascending: false });
```

### PackCard 컴포넌트 Props
```typescript
// src/components/pack-card.tsx
interface PackCardProps {
  packId: string;
  title: string;           // micro_saas_ui_schema.title
  description: string;     // micro_saas_ui_schema.description
  builderName: string;
  authorTenant?: string;   // foundation_sources.title
  sourceType?: 'BOOK' | 'EXPERT_DOC' | 'INTERNAL';
  runCount: number;
  isSCLVerified: boolean;
  isFeatured: boolean;
  coverImageUrl?: string;
}
```

### 페이지네이션
- 기본: 12개씩 표시
- URL 파라미터: `?page=2`
- Server-side pagination (Supabase `.range()`)

---

## 3. Pack 상세 + 실행 (`/packs/[packId]`)

### 데이터 소스
```typescript
const { data: pack } = await supabase
  .from('agent_packs')
  .select(`
    *,
    foundation_sources(*),
    fork_tree!parent_pack_id(
      child_pack_id, contributor_id, diff_summary, quality_delta,
      child:child_pack_id(micro_saas_ui_schema)
    )
  `)
  .eq('pack_id', params.packId)
  .in('status', ['SCL_VERIFIED', 'FEATURED'])
  .single();

// 미검증 팩 접근 시도 → 404
if (!pack) notFound();
```

### 페이지 레이아웃
```
PackDetailPage
├── PackHeader (Server Component)
│   ├── 제목 + 설명
│   ├── SCL Verified 배지 (Green ✓)
│   ├── Author-Tenant 태그
│   ├── 실행 횟수 + 생성일
│   └── Fork Tree 요약 (기여자 N명)
│
├── UIForgeSection (Client Component) ← SDD-05 참조
│   ├── UIForgeRenderer (동적 폼)
│   ├── RunButton → POST /api/run
│   └── OutputPanel (SSE 스트리밍)
│
├── ForkTreeTimeline (Server Component)
│   └── 기여 커밋 그래프 시각화
│
└── RelatedPacks (Server Component)
    └── 같은 foundation_source의 다른 팩
```

### generateMetadata (OG)
```typescript
export async function generateMetadata({ params }: { params: { packId: string } }) {
  const pack = await getPackById(params.packId);
  return {
    title: `${pack.title} | Cognitive Forge Market`,
    description: pack.description,
    openGraph: {
      images: [`/api/og?type=pack&packId=${params.packId}`],
    },
  };
}
```

---

## 4. Author Hub (`/authors`)

**phalanx-media `/experts` 페이지를 Fork하여 재구성**

### 데이터 소스
```typescript
// author_tenants는 auth.users.app_metadata.role_level >= 300인 사용자
// author 프로필은 별도 테이블 (author_profiles) 또는 user_metadata 활용
const authors = await supabase
  .from('foundation_sources')
  .select('author_tenant_id, title, source_type')
  .not('author_tenant_id', 'is', null)
  .order('created_at', { ascending: false });
```

### AuthorCard Props
```typescript
interface AuthorCardProps {
  authorId: string;
  displayName: string;
  affiliation?: string;
  bio?: string;
  avatarUrl?: string;
  packCount: number;
  totalRuns: number;
}
```

---

## 5. Author 상세 (`/authors/[authorId]`)

**phalanx-media `/experts/[expertId]` Fork**

### 추가 요소 (phalanx-media 대비 신규)
- 해당 Author의 Official Packs 그리드 (SCL Verified만)
- 총 Pack Run 횟수 (공개 통계)
- BaaS 수익 배지는 **비공개** (본인만 `/authors/dashboard`에서 확인)

---

## 6. 공통 디자인 원칙

- **다크 테마:** `#0a0a0f` 배경, 글래스모피즘 카드
- **액센트 컬러:** `#7c3aed` (보라) → SCL Verified 배지는 `#10b981` (에메랄드)
- **폰트:** Inter (phalanx-media 계승)  
- **애니메이션:** PackCard hover 시 scale(1.02) + 그림자 확장
- **SCL Verified 배지:** 항상 카드 우상단 고정, `AI Verified` 텍스트 + 체크 아이콘
