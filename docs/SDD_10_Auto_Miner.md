# SDD-10: Auto-Miner (Market 연동 명세)
## cognitive-forge-market

**버전:** 1.0 | **날짜:** 2026-04-17

> ⚠️ **Auto-Miner 실행 주체는 `cognitive-forge-os`입니다.**  
> 이 문서는 Market이 Auto-Mined 팩을 어떻게 **분류·표시**하는지를 정의합니다.

---

## 1. Auto-Miner란?

**Auto-Miner Transpiler**: Builder가 책 원고(PDF/DOCX)를 드래그앤드롭하면  
OpenAI가 역공학(K-REF 역추출)하여 8-Block AgentPack 초안을 자동 생성하는 파이프라인.  
`cognitive-forge-os`의 `/studio/auto-mine` + `/api/auto-extract`에서 실행.

---

## 2. Market의 역할

Auto-Mined 팩은 `foundation_sources.source_type = 'BOOK'`으로 태깅됩니다.  
Market은 이를 필터·분류하여 사용자에게 **"책 기반 AI 팩"** 카테고리로 노출합니다.

---

## 3. Market 표시 명세

### PackCard에 source_type 배지 추가
```typescript
// source_type에 따른 배지
const SOURCE_BADGE = {
  BOOK: { emoji: '📚', label: '책 기반', color: '#f59e0b' },
  EXPERT_DOC: { emoji: '🎓', label: '전문가 문서', color: '#3b82f6' },
  INTERNAL: { emoji: '🔧', label: '자체 제작', color: '#6b7280' },
} as const;
```

### 필터 옵션
```typescript
// /packs?source_type=BOOK
// "검증된 베스트셀러 AI 팩" 카테고리로 특별 노출
```

### 홈 페이지 섹션
```
HomPage
└── "📚 베스트셀러 기반 팩" 섹션
    └── source_type=BOOK인 FEATURED 팩 최대 4개
```

---

## 4. Auto-Mined 팩 식별 쿼리

```typescript
// 책 기반 팩 필터
const { data: bookPacks } = await supabase
  .from('agent_packs')
  .select('*, foundation_sources!inner(title, source_type)')
  .eq('foundation_sources.source_type', 'BOOK')
  .in('status', ['SCL_VERIFIED', 'FEATURED'])
  .order('run_count', { ascending: false })
  .limit(4);
```
