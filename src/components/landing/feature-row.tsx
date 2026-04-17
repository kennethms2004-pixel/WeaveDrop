type Feature = {
  kicker: string;
  title: string;
  body: string;
};

const FEATURES: Feature[] = [
  {
    kicker: "Canvas",
    title: "A loom for ideas.",
    body: "Drag notes, sources, and drafts side by side. Draw stitches between them. WeaveDrop keeps the weave, not just the last message.",
  },
  {
    kicker: "Memory",
    title: "Context that stays.",
    body: "Sessions persist. Re‑open a canvas weeks later and pick up exactly where the thread left off — with every source and branch intact.",
  },
  {
    kicker: "Agents",
    title: "Collaborators, not chat bots.",
    body: "Invite agents into a specific corner of the canvas. They write, cite, and leave their work for you to inspect — not hidden in a chat scroll.",
  },
];

export function FeatureRow() {
  return (
    <section id="canvas" className="border-b border-border">
      <div className="mx-auto max-w-[1240px] px-6 py-20 md:py-24">
        <div className="max-w-[60ch]">
          <span className="mono-label">Principles</span>
          <h2 className="mt-4 font-serif text-[44px] font-light leading-[1.05] tracking-[-0.02em] text-foreground md:text-[56px]">
            Built for the long,{" "}
            <span className="italic" style={{ color: "var(--brand)" }}>
              patient
            </span>{" "}
            work.
          </h2>
        </div>

        <div className="mt-14 grid gap-10 md:grid-cols-3">
          {FEATURES.map((f) => (
            <article key={f.kicker} className="flex flex-col">
              <span className="mono-label">{f.kicker}</span>
              <div className="stitch-rule my-3" />
              <h3 className="font-serif text-[22px] font-light leading-[1.2] tracking-[-0.01em] text-foreground">
                {f.title}
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-fg-muted">
                {f.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
