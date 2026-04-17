import type { SVGProps } from "react";

type WeaveMarkProps = SVGProps<SVGSVGElement> & {
  /** Logical size in px (sets width + height). */
  size?: number;
  /** Stroke weight of the running stitch. Defaults to 1.6. */
  weight?: number;
};

/**
 * Weave brand glyph — a single running-stitch line with five peaks (W).
 * Drawn with `currentColor` so parents can set `color: var(--brand)` or similar.
 */
export function WeaveMark({
  size = 22,
  weight = 1.6,
  className,
  ...rest
}: WeaveMarkProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 22 22"
      width={size}
      height={size}
      className={className}
      {...rest}
    >
      <path
        d="M1 2 L5 20 L8 8 L11 20 L14 8 L17 20 L21 2"
        stroke="currentColor"
        strokeWidth={weight}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

type WeaveWordmarkProps = {
  /** Include the "Drop" product suffix, colored with the brand accent. */
  product?: boolean;
  /** Size scale. `sm` is for dense UI, `md` is the default sidebar size. */
  size?: "sm" | "md";
  className?: string;
};

/**
 * Wordmark lockup: glyph + lowercase "weave" display serif + optional "Drop"
 * suffix in the brand accent color. Matches the Weave design system lockup.
 */
export function WeaveWordmark({
  product = true,
  size = "md",
  className,
}: WeaveWordmarkProps) {
  const isSm = size === "sm";
  const fontSize = isSm ? "15px" : "18px";
  const glyphSize = isSm ? 16 : 20;

  return (
    <span
      className={[
        "inline-flex items-baseline gap-1 whitespace-nowrap font-serif font-light tracking-[-0.02em] leading-none text-foreground",
        className ?? "",
      ].join(" ")}
      style={{ fontSize }}
    >
      <WeaveMark
        size={glyphSize}
        weight={1.5}
        style={{ position: "relative", top: 2 }}
      />
      <span>weave</span>
      {product ? <span className="text-brand">Drop</span> : null}
    </span>
  );
}
