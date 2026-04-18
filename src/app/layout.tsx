import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";
import { ClerkLoading, ClerkProvider } from "@clerk/nextjs";

import { AuthWaitingScreen } from "@/components/auth/auth-waiting-screen";
import { WelcomePaletteGate } from "@/components/welcome-palette-gate";
import { weaveClerkAppearance } from "@/lib/clerk-appearance";
import { PALETTE_STORAGE_KEY, DEFAULT_PALETTE } from "@/lib/brand";

import "./globals.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-weave-ui",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-weave-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-weave-display",
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WeaveDrop",
  description: "Canvas-first workspace for project thinking.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [
      {
        url: "/apple-touch-icon.png",
        type: "image/png",
        sizes: "180x180",
      },
    ],
  },
};

// Runs before hydration to avoid a flash of the wrong palette.
// Landing (/welcome) is always light — no dark palette there, signed-in or not.
// Everywhere else: stored choice, or OS prefers-color-scheme, or default.
const paletteBootstrap = `
(function(){
  try {
    var path = typeof location !== "undefined" ? location.pathname : "";
    var onWelcome = path === "/welcome" || path.indexOf("/welcome/") === 0;
    if (onWelcome) {
      document.documentElement.dataset.palette = "loom";
      return;
    }
    var stored = localStorage.getItem(${JSON.stringify(PALETTE_STORAGE_KEY)});
    var palette;
    if (stored === "loom" || stored === "thread") {
      palette = stored;
    } else {
      var prefersDark = typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      palette = prefersDark ? "thread" : ${JSON.stringify(DEFAULT_PALETTE)};
    }
    document.documentElement.dataset.palette = palette;
  } catch (_) {
    document.documentElement.dataset.palette = ${JSON.stringify(DEFAULT_PALETTE)};
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-palette={DEFAULT_PALETTE}
      className={`${plexSans.variable} ${plexMono.variable} ${newsreader.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <Script id="weave-palette-bootstrap" strategy="beforeInteractive">
          {paletteBootstrap}
        </Script>
      </head>
      <body className="flex min-h-full flex-col">
        <ClerkProvider appearance={weaveClerkAppearance}>
          <ClerkLoading>
            <AuthWaitingScreen />
          </ClerkLoading>
          <Suspense fallback={null}>
            <WelcomePaletteGate />
          </Suspense>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
