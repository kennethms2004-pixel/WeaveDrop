import { Check } from "lucide-react";

type Audience = {
  title: string;
  blurb: string;
  bullets: string[];
};

const AUDIENCES: Audience[] = [
  {
    title: "Researchers & long‑form writers",
    blurb:
      "Keep sources, outlines, and drafts in the same field of view. Trade doc‑chaos for a canvas.",
    bullets: [
      "Persistent canvases per project",
      "Source cards with inline citations",
      "Branches and alternate drafts",
    ],
  },
  {
    title: "Builders of agents & tools",
    blurb:
      "Pin an agent to a region. Watch it work on the canvas itself — every move inspectable.",
    bullets: [
      "Scoped autonomy by region",
      "Full audit trail of agent edits",
      "Hand‑off between you and the model",
    ],
  },
];

export function ForWhoBand() {
  return (
    <section
      id="for-who"
      className="relative border-b border-border bg-card"
    >
      <div className="mx-auto grid max-w-[1240px] gap-12 px-6 py-20 md:grid-cols-2 md:py-24">
        {AUDIENCES.map((a) => (
          <article key={a.title} className="flex flex-col">
            <span className="mono-label">For whom</span>
            <h3 className="mt-3 font-serif text-[28px] font-light leading-[1.15] tracking-[-0.01em] text-foreground md:text-[34px]">
              {a.title}
            </h3>
            <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-fg-muted">
              {a.blurb}
            </p>
            <ul className="mt-6 space-y-2 text-[14px] text-fg-muted">
              {a.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <Check
                    className="mt-0.5 h-4 w-4 shrink-0"
                    style={{ color: "var(--brand)" }}
                  />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
