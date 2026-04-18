import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";
import { ClerkProvider } from "@clerk/nextjs";

import { WelcomePaletteGate } from "@/components/welcome-palette-gate";
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
// Public landing (/welcome) is always light ("loom"). Else: stored choice, or
// OS prefers-color-scheme (dark -> "thread"), else brand default.
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
        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary: "var(--brand)",
              colorBackground: "var(--bg)",
              colorInputBackground: "var(--surface)",
              colorInputText: "var(--fg)",
              colorText: "var(--fg)",
              colorTextSecondary: "var(--fg-muted)",
              colorDanger: "var(--danger)",
              colorSuccess: "var(--positive)",
              colorWarning: "var(--warning)",
              borderRadius: "var(--r-md)",
              fontFamily: "var(--font-ui)",
            },
          }}
        >
          <Suspense fallback={null}>
            <WelcomePaletteGate />
          </Suspense>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
