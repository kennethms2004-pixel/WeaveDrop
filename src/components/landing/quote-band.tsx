export function QuoteBand() {
  return (
    <section className="relative border-b border-border">
      <div className="mx-auto max-w-[900px] px-6 py-20 text-center md:py-28">
        <span className="mono-label">Field note</span>
        <blockquote className="mt-6 font-serif text-[32px] font-light leading-[1.25] tracking-[-0.015em] text-foreground md:text-[44px]">
          “The first tool that let my research{" "}
          <span className="italic" style={{ color: "var(--brand)" }}>
            stay
          </span>{" "}
          — across months, not minutes.”
        </blockquote>
        <div className="stitch-rule mx-auto mt-8 w-40" />
        <p className="mono-label mt-4">
          L. Abernathy · independent researcher
        </p>
      </div>
    </section>
  );
}
