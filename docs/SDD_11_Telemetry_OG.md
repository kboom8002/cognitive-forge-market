# SDD-11: Telemetry & Dynamic OG
## cognitive-forge-market

**버전:** 1.0 | **날짜:** 2026-04-17

> **phalanx-media에서 직접 이식.** 변경 사항은 명시된 항목만 적용.

---

## 1. TelemetryProvider

### 이식 원칙
`phalanx-media`의 `TelemetryProvider` 컴포넌트를 그대로 이식하되,  
**Market 전용 이벤트 타입**을 추가합니다.

### 추가 이벤트 타입

```typescript
// src/types/telemetry.ts

// phalanx-media 기존 이벤트 (유지)
type BaseEvent =
  | { type: 'page_view'; path: string }
  | { type: 'external_click'; url: string };

// cognitive-forge-market 신규 이벤트
type MarketEvent =
  | { type: 'pack_view'; packId: string; packTitle: string }
  | { type: 'pack_run_start'; packId: string }
  | { type: 'pack_run_complete'; packId: string; runId: string; durationMs: number }
  | { type: 'pack_run_error'; packId: string; errorType: string }
  | { type: 'author_profile_view'; authorId: string }
  | { type: 'quest_view'; questId: string };

export type TelemetryEvent = BaseEvent | MarketEvent;
```

### 적재 테이블 확장 (run_logs 연동)

```typescript
// src/lib/telemetry.ts
export async function trackEvent(event: TelemetryEvent) {
  // pack_run_complete 이벤트는 run_logs와 연동
  if (event.type === 'pack_run_complete') {
    await supabase.from('run_logs')
      .update({ /* run 완료 메타데이터 */ })
      .eq('run_id', event.runId);
  }

  // 기본 traffic_logs 적재 (phalanx-media 방식 유지)
  await supabase.from('traffic_logs').insert({
    event_type: event.type,
    metadata: event,
    created_at: new Date().toISOString()
  });
}
```

### 컴포넌트 사용법

```typescript
// src/app/layout.tsx (Root Layout)
import { TelemetryProvider } from '@/components/telemetry-provider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <TelemetryProvider>
          {children}
        </TelemetryProvider>
      </body>
    </html>
  );
}
```

---

## 2. Dynamic OG Image (`/api/og`)

### 이식 원칙
`phalanx-media`의 `/api/og/route.tsx`를 Fork하여 Pack/Author 전용 스타일 추가.

### 지원 타입

| 파라미터 | 설명 | 예시 |
|:---|:---|:---|
| `?type=pack&packId={uuid}` | Pack OG 이미지 | 팩 커버 + 제목 + SCL 배지 |
| `?type=author&authorId={uuid}` | Author OG 이미지 | 저자 아바타 + 이름 + 팩 수 |
| `?type=home` | 홈 기본 OG | 마켓 로고 + 슬로건 |

### route.tsx 구조

```typescript
// src/app/api/og/route.tsx
import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') ?? 'home';

  if (type === 'pack') {
    const packId = searchParams.get('packId');
    const pack = await fetchPackForOG(packId!);

    return new ImageResponse(
      <PackOGTemplate
        title={pack.title}
        description={pack.description}
        runCount={pack.run_count}
        isVerified={true}
        emoji={pack.cover_emoji}
      />,
      { width: 1200, height: 630 }
    );
  }

  if (type === 'author') {
    const authorId = searchParams.get('authorId');
    const author = await fetchAuthorForOG(authorId!);

    return new ImageResponse(
      <AuthorOGTemplate
        displayName={author.display_name}
        affiliation={author.affiliation}
        packCount={author.pack_count}
      />,
      { width: 1200, height: 630 }
    );
  }

  // default: home OG
  return new ImageResponse(<HomeOGTemplate />, { width: 1200, height: 630 });
}
```

### Pack OG 디자인 명세

```
┌────────────────────────────────────────────────────┐
│ 🌑 다크 배경 (#0a0a0f)                              │
│                                                      │
│  [EMOJI]  팩 제목 (大)                              │
│           팩 설명 요약 (中, 최대 60자)              │
│                                                      │
│  ✓ AI Verified    🔥 1,234회 실행                   │
│                                                      │
│                    Cognitive Forge Market 로고        │
└────────────────────────────────────────────────────┘
```

---

## 3. generateMetadata 패턴 (전 페이지 공통)

```typescript
// 각 Pack/Author 페이지에 반드시 적용
export async function generateMetadata({ params }) {
  const pack = await getPackById(params.packId);
  if (!pack) return {};

  const schema = pack.micro_saas_ui_schema as MicroSaaSUISchema;
  
  return {
    title: `${schema?.title ?? 'AgentPack'} | Cognitive Forge Market`,
    description: schema?.description?.slice(0, 160) ?? '',
    openGraph: {
      title: schema?.title ?? 'AgentPack',
      description: schema?.description?.slice(0, 160) ?? '',
      images: [
        {
          url: `/api/og?type=pack&packId=${params.packId}`,
          width: 1200,
          height: 630,
          alt: schema?.title,
        }
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      images: [`/api/og?type=pack&packId=${params.packId}`],
    },
  };
}
```
