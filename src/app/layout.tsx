import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import { TelemetryProvider } from "@/components/telemetry-provider";
import "./globals.css";

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
});

// Forge OS URL — 프로덕션에서는 실제 도메인, 로컈에서는 localhost:3000
const FORGE_OS_URL = process.env.NEXT_PUBLIC_FORGE_OS_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  title: "Cognitive Forge Market | AgentPack 마켓플레이스",
  description: "8-Block AgentPack 공개 마켓플레이스. SCL Verified AI 팩을 탐색하고 바로 실행하세요.",
  openGraph: {
    title: "Cognitive Forge Market",
    description: "SCL Verified AgentPack을 탐색하고 즉시 실행하는 Micro-SaaS 플랫폼.",
    url: "https://market.cognitiveforge.io",
    siteName: "Cognitive Forge Market",
    locale: "ko_KR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "url": "https://market.cognitiveforge.io",
    "name": "Cognitive Forge Market",
    "description": "8-Block AgentPack 공개 마켓플레이스 — SCL Verified AI 팩 실행 플랫폼",
    "sameAs": [],
  };

  return (
    <html lang="ko" className="scroll-smooth">
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        <Suspense fallback={null}>
          <TelemetryProvider />
        </Suspense>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />

        {/* ── Global Navigation Header ── */}
        <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md shadow-sm">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-7xl">

            {/* Logo */}
            <a href="/" className="flex items-center gap-2.5 font-black text-xl tracking-tighter text-blue-900 hover:opacity-80 transition-opacity flex-shrink-0">
              <span className="w-5 h-5 bg-blue-600 rounded-bl-xl rounded-tr-xl"></span>
              Cognitive Forge
              <span className="text-blue-400 font-light text-base hidden sm:inline">| Market</span>
            </a>

            {/* Center Nav Links */}
            <nav className="hidden md:flex items-center gap-1 text-sm font-semibold text-slate-600">
              <a href="/" className="px-3 py-2 rounded-lg hover:bg-blue-50 hover:text-blue-700 transition-colors">
                🏠 홈
              </a>
              <a href="/packs" className="px-3 py-2 rounded-lg hover:bg-blue-50 hover:text-blue-700 transition-colors">
                🤖 AgentPacks
              </a>
              <a href="/authors" className="px-3 py-2 rounded-lg hover:bg-blue-50 hover:text-blue-700 transition-colors">
                👥 Authors
              </a>
            </nav>

            {/* Right CTA */}
            <div className="flex items-center gap-3">
              <a
                  href={FORGE_OS_URL}
                className="hidden sm:flex items-center gap-2 bg-slate-900 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-full transition-colors shadow-md"
              >
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                Forge OS →
              </a>
              <button className="md:hidden p-2 rounded-lg hover:bg-slate-100" aria-label="메뉴 열기">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 w-full relative">
          {children}
        </main>

        {/* ── Global Footer ── */}
        <footer className="border-t bg-slate-900 text-slate-400 py-16 mt-20">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
              <div>
                <div className="flex items-center gap-2 font-black text-white text-lg mb-3">
                  <span className="w-4 h-4 bg-blue-500 rounded-bl-lg rounded-tr-lg"></span>
                  Cognitive Forge Market
                </div>
                <p className="text-sm leading-relaxed">
                  SCL Verified AgentPack만을 엄선하여 제공하는 AI 실행 마켓플레이스입니다.
                </p>
              </div>
              <div>
                <h4 className="text-white font-bold mb-3 text-xs uppercase tracking-widest">탐색</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="/" className="hover:text-white transition-colors">홈 (Today&apos;s Quest)</a></li>
                  <li><a href="/packs" className="hover:text-white transition-colors">AgentPack 마켓</a></li>
                  <li><a href="/authors" className="hover:text-white transition-colors">Author Hub</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-bold mb-3 text-xs uppercase tracking-widest">Forge OS</h4>
                <p className="text-sm mb-4">팩 제작·관리·SCL 검증은 Cognitive Forge OS에서 진행합니다.</p>
                <a
                    href={FORGE_OS_URL}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-4 py-2 rounded-full transition-colors"
                >
                  OS 입장 →
                </a>
              </div>
            </div>
            <div className="border-t border-slate-800 pt-6 text-center text-xs">
              © 2026 Cognitive Forge. All Rights Reserved.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
