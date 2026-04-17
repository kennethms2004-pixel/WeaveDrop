import { CtaBand } from "./cta-band";
import { FeatureRow } from "./feature-row";
import { ForWhoBand } from "./for-who-band";
import { HeroEditorial } from "./hero-editorial";
import { LandingFooter } from "./landing-footer";
import { LandingNav } from "./landing-nav";
import { QuoteBand } from "./quote-band";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />
      <main>
        <HeroEditorial />
        <FeatureRow />
        <ForWhoBand />
        <QuoteBand />
        <CtaBand />
      </main>
      <LandingFooter />
    </div>
  );
}
