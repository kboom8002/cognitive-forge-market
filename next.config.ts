import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ── 이미지 최적화 ────────────────────────────────────────────
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 3600, // 1시간 캐싱
    deviceSizes: [640, 768, 1024, 1280, 1536],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },

  // ── HTTP 응답 헤더 최적화 ────────────────────────────────────
  async headers() {
    return [
      // 정적 자산 — 1년 캐싱
      {
        source: "/(.*\\.(?:svg|png|jpg|jpeg|gif|ico|woff|woff2|ttf|otf))",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      // OG 이미지 — Edge에서 60초 stale-while-revalidate
      {
        source: "/api/og",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=600",
          },
        ],
      },
      // API 라우트 — no-cache (인증 필요 엔드포인트)
      {
        source: "/api/(pok-distribute|cron/:path*|run)",
        headers: [
          { key: "Cache-Control", value: "no-store" },
        ],
      },
      // 보안 헤더 — 전체 라우트
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },

  // ── 실험적 기능 ──────────────────────────────────────────────
  experimental: {
    // 서버 컴포넌트 번들 최적화
    optimizePackageImports: ["@supabase/supabase-js"],
  },
};

export default nextConfig;
