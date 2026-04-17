import type { Metadata } from "next";

import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "WeaveDrop — think in canvases, not chat windows",
  description:
    "A quiet workspace for serious research. Weave long-running context across sessions, drop sources and drafts onto a canvas, and let agents collaborate where your thinking already lives.",
};

export default function WelcomePage() {
  return <LandingPage />;
}
