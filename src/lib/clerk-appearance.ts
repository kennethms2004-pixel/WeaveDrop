/**
 * Shared Clerk UI styling. Uses Weave CSS variables where safe.
 *
 * `colorTextOnPrimaryBackground` must stay a high-contrast value for filled
 * primary buttons. Using `var(--paper)` (cream) caused OAuth block rows to
 * inherit near-invisible label text on light surfaces.
 */
export const weaveClerkAppearance = {
  layout: {
    socialButtonsVariant: "blockButton",
    shimmer: true,
  },
  variables: {
    colorPrimary: "var(--brand)",
    colorBackground: "var(--bg)",
    colorInputBackground: "var(--surface)",
    colorInputText: "var(--fg)",
    colorText: "var(--fg)",
    colorTextSecondary: "var(--fg-muted)",
    colorTextOnPrimaryBackground: "#ffffff",
    colorNeutral: "var(--rule)",
    colorDanger: "var(--danger)",
    colorSuccess: "var(--positive)",
    colorWarning: "var(--warning)",
    borderRadius: "var(--r-md)",
    fontFamily: "var(--font-ui)",
    fontSize: "0.9375rem",
    fontWeight: {
      bold: "600",
      medium: "500",
      normal: "400",
    },
    spacingUnit: "1rem",
  },
  elements: {
    cardBox: "shadow-[0_18px_40px_rgba(60,30,10,0.12)]",
    modalContent: "sm:rounded-xl",
    formButtonPrimary:
      "font-medium shadow-none transition-opacity hover:opacity-95 active:opacity-90",
    userButtonPopoverCard: "rounded-xl border border-border",
    socialButtonsBlockButton:
      "border border-border !bg-card !text-card-foreground hover:!bg-muted [&_span]:!text-card-foreground",
  },
} as const;
