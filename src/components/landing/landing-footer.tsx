import { WeaveMark } from "@/components/weave-mark";

export function LandingFooter() {
  return (
    <footer id="changelog" className="bg-background">
      <div className="mx-auto grid max-w-[1240px] gap-10 px-6 py-14 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2 text-foreground">
            <WeaveMark size={20} className="text-brand" />
            <span className="font-serif text-[18px] font-light tracking-[-0.02em]">
              weave<span className="italic text-brand">Drop</span>
            </span>
          </div>
          <p className="mt-3 max-w-[38ch] text-[13px] leading-relaxed text-fg-muted">
            A loom for ideas. A canvas for serious research. An early tool for
            people who take thinking seriously.
          </p>
        </div>

        <FooterColumn
          label="Product"
          links={[
            { href: "#product", label: "Overview" },
            { href: "#canvas", label: "Canvas" },
            { href: "#pricing", label: "Early access" },
          ]}
        />
        <FooterColumn
          label="Company"
          links={[
            { href: "#", label: "About" },
            { href: "#", label: "Craft notes" },
            { href: "#", label: "Contact" },
          ]}
        />
        <FooterColumn
          label="Legal"
          links={[
            { href: "#", label: "Privacy" },
            { href: "#", label: "Terms" },
            { href: "#", label: "Security" },
          ]}
        />
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between px-6 py-5 text-[12px] text-fg-subtle">
          <span className="mono-label">© WeaveDrop · made with care</span>
          <span className="mono-label">v0.4 · early access</span>
        </div>
      </div>
    </footer>
  );
}

type FooterColumnProps = {
  label: string;
  links: { href: string; label: string }[];
};

function FooterColumn({ label, links }: FooterColumnProps) {
  return (
    <div>
      <span className="mono-label">{label}</span>
      <ul className="mt-4 space-y-2 text-[13px] text-fg-muted">
        {links.map((l) => (
          <li key={l.label}>
            <a href={l.href} className="hover:text-foreground">
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
