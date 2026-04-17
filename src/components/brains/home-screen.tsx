"use client";

import {
  ArrowRight,
  ChevronRight,
  Database,
  Folder,
  Home as HomeIcon,
  LogIn,
  LogOut,
  Moon,
  MoreVertical,
  PanelLeftClose,
  PanelLeftOpen,
  Plug,
  Plus,
  Search,
  Settings as SettingsIcon,
  Sun,
  Trash2,
  User,
  UserPlus,
  Workflow,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type KeyboardEvent,
  type ReactNode,
  type WheelEvent,
  useEffect,
  useLayoutEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  Show,
  SignInButton,
  SignOutButton,
  SignUpButton,
  useAuth,
  useUser,
} from "@clerk/nextjs";

import { SlimCanvasScreen } from "@/components/canvas/slim-canvas-screen";
import { WeaveMark } from "@/components/weave-mark";
import { setPalette, usePalette } from "@/lib/use-palette";
import {
  createBrain as createBrainAction,
  deleteBrain as deleteBrainAction,
} from "@/lib/actions/brain.actions";
import type { BrainDTO, EdgeDTO, NodeDTO } from "@/lib/actions/dto";

type Tab = "overview" | "personal";

type HomeScreenProps = {
  initialBrains: BrainDTO[];
  initialTab?: Tab;
  selectedBrain?: BrainDTO;
  selectedBrainNodes?: NodeDTO[];
  selectedBrainEdges?: EdgeDTO[];
};

const SIDEBAR_STORAGE_KEY = "weavedrop.sidebar";
/** Fits lockup + three header controls at a tight but usable width. */
const SIDEBAR_MIN_WIDTH = 220;
const SIDEBAR_MAX_WIDTH = 420;
const SIDEBAR_DEFAULT_WIDTH = 248;
const SIDEBAR_EXTENDED_THRESHOLD = 320;
const SIDEBAR_COLLAPSE_THRESHOLD = 110;

function clampWidth(value: number) {
  if (!Number.isFinite(value)) {
    return SIDEBAR_DEFAULT_WIDTH;
  }
  if (value < SIDEBAR_MIN_WIDTH) {
    return SIDEBAR_MIN_WIDTH;
  }
  if (value > SIDEBAR_MAX_WIDTH) {
    return SIDEBAR_MAX_WIDTH;
  }
  return value;
}

type OptimisticBrainAction =
  | { type: "add"; brain: BrainDTO }
  | { type: "remove"; id: string };

export function HomeScreen({
  initialBrains,
  initialTab = "overview",
  selectedBrain,
  selectedBrainNodes = [],
  selectedBrainEdges = [],
}: HomeScreenProps) {
  const router = useRouter();

  // `initialBrains` is the authoritative server value; optimistic overlay is
  // applied during pending transitions and auto-resets when the server state
  // catches up (via revalidatePath + router.refresh()).
  const [brains, applyBrainAction] = useOptimistic<
    BrainDTO[],
    OptimisticBrainAction
  >(initialBrains, (current, action) => {
    switch (action.type) {
      case "add":
        return [action.brain, ...current];
      case "remove":
        return current.filter((brain) => brain.id !== action.id);
      default:
        return current;
    }
  });
  const selectedBrainId = selectedBrain?.id ?? null;

  const [tab, setTab] = useState<Tab>(() => initialTab);
  const [quickName, setQuickName] = useState("");
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [brainError, setBrainError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [width, setWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [hasLoadedSidebarState, setHasLoadedSidebarState] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { user } = useUser();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const lastAuthStateRef = useRef<boolean | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const settingsPopoverRef = useRef<HTMLDivElement>(null);
  const palette = usePalette();
  const searchRef = useRef<HTMLInputElement>(null);
  const sidebarScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthLoaded) {
      return;
    }
    const current = Boolean(isSignedIn);
    const previous = lastAuthStateRef.current;
    if (previous === current) {
      return;
    }
    lastAuthStateRef.current = current;
    if (previous !== null) {
      window.location.reload();
    }
  }, [isAuthLoaded, isSignedIn]);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      try {
        const savedState = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
        if (savedState) {
          const parsedState = JSON.parse(savedState) as {
            collapsed?: boolean;
            width?: number;
          };
          if (typeof parsedState.collapsed === "boolean") {
            setCollapsed(parsedState.collapsed);
          }
          if (typeof parsedState.width === "number") {
            setWidth(clampWidth(parsedState.width));
          }
        }
      } catch {
        // Ignore malformed sidebar state.
      } finally {
        setHasLoadedSidebarState(true);
      }
    });
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!hasLoadedSidebarState || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      SIDEBAR_STORAGE_KEY,
      JSON.stringify({ collapsed, width }),
    );
  }, [collapsed, width, hasLoadedSidebarState]);

  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if (
        e.key === "[" &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        setCollapsed((v) => !v);
      }
      if (e.key === "Escape") {
        setSettingsOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!settingsOpen) {
      return;
    }
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }
      if (settingsPopoverRef.current?.contains(target)) {
        return;
      }
      if (settingsButtonRef.current?.contains(target)) {
        return;
      }
      setSettingsOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [settingsOpen]);

  useLayoutEffect(() => {
    if (!settingsOpen) {
      return;
    }
    const popover = settingsPopoverRef.current;
    const opener = settingsButtonRef.current;
    if (!popover) {
      return;
    }
    const root: HTMLDivElement = popover;

    function getFocusable(): HTMLElement[] {
      const selector =
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
      return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
        (el) =>
          !el.hasAttribute("disabled") &&
          !el.closest('[aria-hidden="true"]'),
      );
    }

    let rafId = 0;
    rafId = window.requestAnimationFrame(() => {
      const focusable = getFocusable();
      (focusable[0] ?? root).focus();
    });

    function onKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key !== "Tab") {
        return;
      }
      const focusable = getFocusable();
      if (focusable.length === 0) {
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (!active || !root.contains(active)) {
        e.preventDefault();
        first.focus();
        return;
      }
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.cancelAnimationFrame(rafId);
      document.removeEventListener("keydown", onKeyDown, true);
      opener?.focus({ preventScroll: true });
    };
  }, [settingsOpen]);

  useEffect(() => {
    if (!isResizing) {
      return;
    }

    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    function onMove(e: globalThis.MouseEvent) {
      const next = e.clientX;
      if (next < SIDEBAR_COLLAPSE_THRESHOLD) {
        setCollapsed(true);
        setIsResizing(false);
        return;
      }
      setCollapsed(false);
      setWidth(clampWidth(next));
    }

    function onUp() {
      setIsResizing(false);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
    };
  }, [isResizing]);

  function defaultBrainName() {
    return `Brain ${new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`;
  }

  function handleCreateBrain(options?: { allowEmptyQuickName?: boolean }) {
    const typed = quickName.trim();
    const name = typed || (options?.allowEmptyQuickName ? defaultBrainName() : "");
    if (!name || isPending) {
      return;
    }

    setBrainError(null);
    setQuickName("");

    startTransition(async () => {
      try {
        const created = await createBrainAction(name);
        applyBrainAction({ type: "add", brain: created });
        router.push(`/brains/${created.id}`);
        router.refresh();
      } catch (error) {
        console.error("[home] createBrain failed", error);
        setBrainError("Could not create brain.");
      }
    });
  }

  function handleDeleteBrain(id: string) {
    startTransition(async () => {
      applyBrainAction({ type: "remove", id });
      try {
        await deleteBrainAction(id);
        if (selectedBrainId === id) {
          router.replace("/");
        } else {
          router.refresh();
        }
      } catch (error) {
        console.error("[home] deleteBrain failed", error);
        router.refresh();
      }
    });
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreateBrain();
    }
    if (e.key === "Escape") {
      setQuickName("");
      inputRef.current?.blur();
    }
  }

  const selectedBrainName = selectedBrain?.name ?? null;
  const isCanvasView = Boolean(selectedBrain);
  const isExtended = !collapsed && width >= SIDEBAR_EXTENDED_THRESHOLD;

  const filtered =
    tab === "personal" && search
      ? brains.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()))
      : brains;

  const totalNodes = brains.reduce((s, b) => s + b.nodeCount, 0);
  const activeCount = brains.filter((b) => b.nodeCount > 0).length;

  function selectTab(nextTab: Tab) {
    setTab(nextTab);

    if (isCanvasView) {
      router.push(nextTab === "overview" ? "/" : "/?tab=personal");
    }
  }

  function openPersonalSearch() {
    selectTab("personal");
    window.requestAnimationFrame(() => {
      searchRef.current?.focus();
    });
  }

  function handleNewBrainShortcut() {
    if (isCanvasView) {
      setTab("overview");
      router.push("/");
      window.requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
      return;
    }

    if (tab !== "overview") {
      setTab("overview");
    }
    inputRef.current?.focus();
  }

  function goHome() {
    if (isCanvasView || tab !== "overview") {
      router.push("/");
    }
    setTab("overview");
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background font-sans text-foreground selection:bg-brand/30">
      <aside
        className="relative grid h-dvh min-h-0 shrink-0 grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden border-r border-border bg-card"
        style={{ width: collapsed ? 56 : width }}
      >
        <div
          className={`flex ${
            collapsed
              ? "flex-col items-center gap-1 px-1 py-1.5"
              : "w-full min-h-9 items-center gap-1 px-2 py-2"
          }`}
        >
          <button
            aria-label="Go to overview"
            className={`flex min-w-0 shrink-0 select-none rounded-md text-foreground transition hover:bg-foreground/5 ${
              collapsed
                ? "h-8 w-8 items-center justify-center p-0"
                : "h-9 min-w-0 items-center gap-2 px-1.5"
            }`}
            onClick={goHome}
            title="WeaveDrop home"
            type="button"
          >
            <WeaveMark
              className="shrink-0"
              size={collapsed ? 18 : 24}
              weight={1.5}
            />
            {!collapsed ? (
              <span className="translate-y-px whitespace-nowrap font-serif text-[22px] font-medium italic leading-none tracking-[-0.02em] text-brand">
                Drop
              </span>
            ) : null}
          </button>
          <div
            className={`flex shrink-0 items-center ${
              collapsed ? "flex-col gap-1" : "ml-auto gap-0.5"
            }`}
          >
            <button
              aria-label="New brain"
              className={`flex shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-foreground/10 hover:text-foreground ${
                collapsed ? "h-8 w-8" : "h-9 w-9"
              }`}
              onClick={handleNewBrainShortcut}
              title="New brain"
              type="button"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              aria-label="Search brains"
              className={`flex shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-foreground/10 hover:text-foreground ${
                collapsed ? "h-8 w-8" : "h-9 w-9"
              }`}
              onClick={openPersonalSearch}
              title="Search brains"
              type="button"
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={`flex shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-foreground/10 hover:text-foreground ${
                collapsed ? "h-8 w-8" : "h-9 w-9"
              }`}
              onClick={() => setCollapsed((v) => !v)}
              title={`${collapsed ? "Expand" : "Collapse"} sidebar  [`}
              type="button"
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <nav className="flex flex-col gap-1 p-2">
          <SidebarTab
            active={tab === "overview" && !isCanvasView}
            collapsed={collapsed}
            icon={<HomeIcon className="h-4 w-4" />}
            label="Overview"
            onClick={() => selectTab("overview")}
          />
          <SidebarTab
            active={tab === "personal" && !isCanvasView}
            collapsed={collapsed}
            icon={<Folder className="h-4 w-4" />}
            label="Personal"
            onClick={() => selectTab("personal")}
          />
        </nav>

        <div
          ref={sidebarScrollRef}
          className={`relative z-[1] min-h-0 touch-pan-y overflow-y-auto overscroll-contain pb-2 ${
            collapsed ? "px-1" : "px-2"
          }`}
          onWheel={(e: WheelEvent<HTMLDivElement>) => {
            if (!collapsed) {
              return;
            }
            const el = e.currentTarget;
            const { scrollTop, scrollHeight, clientHeight } = el;
            if (scrollHeight <= clientHeight + 1) {
              return;
            }
            const dy = e.deltaY;
            if (!dy) {
              return;
            }
            const canScrollUp = scrollTop > 0;
            const canScrollDown = scrollTop + clientHeight < scrollHeight - 1;
            if ((dy < 0 && canScrollUp) || (dy > 0 && canScrollDown)) {
              e.stopPropagation();
            }
          }}
        >
          {brains.length > 0 ? (
            <>
              {!collapsed ? (
                <p className="mb-1 mt-3 px-2 text-[10px] font-medium uppercase tracking-[0.14em] text-fg-subtle">
                  Brains
                </p>
              ) : null}
              <div className="flex flex-col gap-0.5">
                {brains.map((brain) => (
                  <Link
                    key={brain.id}
                    className={`flex rounded-md text-[12px] transition ${
                      brain.id === selectedBrainId
                        ? "bg-foreground/10 text-foreground"
                        : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                    } ${collapsed ? "justify-center px-1 py-2" : "items-center gap-2 px-2 py-1.5"}`}
                    href={`/brains/${brain.id}`}
                    prefetch={false}
                    title={brain.name}
                  >
                    {collapsed ? (
                      <span className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-foreground/[0.04] text-[11px] font-medium uppercase">
                        {brain.name.slice(0, 1)}
                      </span>
                    ) : (
                      <>
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand/70" />
                        <span className="min-w-0 flex-1 truncate">{brain.name}</span>
                        {isExtended ? (
                          <span className="shrink-0 rounded bg-foreground/[0.06] px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {brain.nodeCount}
                          </span>
                        ) : null}
                      </>
                    )}
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <div
              className={`flex h-full items-center justify-center ${
                collapsed ? "px-0" : "px-3"
              }`}
            >
              {!collapsed ? (
                <p className="text-center text-[11px] text-fg-subtle">
                  No brains yet.
                </p>
              ) : null}
            </div>
          )}
        </div>

        <div
          className={`border-t border-border ${collapsed ? "px-1 py-2" : "px-2 py-2"}`}
        >
          <button
            aria-expanded={settingsOpen}
            aria-label="Settings"
            className={`flex w-full items-center rounded-md text-[13px] transition ${
              settingsOpen
                ? "bg-foreground/10 text-foreground"
                : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
            } ${collapsed ? "justify-center px-2 py-2" : "gap-2 px-2 py-2"}`}
            onClick={() => setSettingsOpen((v) => !v)}
            ref={settingsButtonRef}
            title="Settings"
            type="button"
          >
            <SettingsIcon className="h-4 w-4 shrink-0" />
            {!collapsed ? (
              <>
                <span className="min-w-0 flex-1 truncate text-left">Settings</span>
                {isExtended ? (
                  <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" />
                ) : null}
              </>
            ) : null}
          </button>
        </div>

        <div
          aria-label="Resize sidebar"
          aria-valuemax={SIDEBAR_MAX_WIDTH}
          aria-valuemin={SIDEBAR_MIN_WIDTH}
          aria-valuenow={collapsed ? 56 : width}
          className="group absolute right-0 top-0 z-30 flex h-full w-2 cursor-col-resize items-stretch justify-end"
          onDoubleClick={() => {
            setCollapsed(false);
            setWidth(SIDEBAR_DEFAULT_WIDTH);
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsResizing(true);
          }}
          role="separator"
        >
          <span
            aria-hidden="true"
            className={`h-full w-px transition-colors ${
              isResizing ? "bg-brand/60" : "bg-transparent group-hover:bg-foreground/15"
            }`}
          />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {isCanvasView ? (
          <header className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
            <div className="flex min-w-0 items-center gap-2 text-[12px] text-muted-foreground">
              <span>Personal</span>
              <span className="text-fg-subtle">/</span>
              <span className="truncate font-medium text-foreground">{selectedBrainName ?? "Brain"}</span>
            </div>
          </header>
        ) : null}

        <div
          className={`flex min-h-0 flex-1 flex-col ${
            isCanvasView ? "overflow-hidden" : "overflow-y-auto px-8 py-8"
          }`}
        >
          {isCanvasView && selectedBrain ? (
            <div className="min-h-0 flex-1 bg-background">
              <SlimCanvasScreen
                key={selectedBrain.id}
                brainId={selectedBrain.id}
                brainName={selectedBrain.name}
                initialNodes={selectedBrainNodes}
                initialEdges={selectedBrainEdges}
              />
            </div>
          ) : (
            <>
              {tab === "overview" && (
                <section className="mb-10 max-w-3xl border-b border-border pb-8">
                  <div className="mb-5 flex items-center gap-3">
                    <span aria-hidden="true" className="h-2 w-2 rounded-full bg-brand" />
                    <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
                      Your brains
                    </span>
                  </div>
                  <h1 className="font-serif text-[44px] font-light leading-[1.02] tracking-[-0.035em] text-foreground">
                    Recent <em className="italic font-light text-brand">thinking</em>.
                  </h1>
                  <p className="mt-4 max-w-[52ch] font-serif text-[18px] font-light italic leading-[1.45] text-fg-muted">
                    The canvases you have touched lately, plus a quick way to start another.
                  </p>
                </section>
              )}

              {tab === "overview" && (
                <div className="mb-10 grid max-w-3xl grid-cols-3 gap-4">
                  <StatTile
                    kicker="Total brains"
                    value={brains.length}
                    hint="across this workspace"
                  />
                  <StatTile
                    kicker="Total nodes"
                    value={totalNodes}
                    hint="drawn so far"
                  />
                  <StatTile
                    kicker="Active"
                    value={activeCount}
                    hint={activeCount === 1 ? "brain with nodes" : "brains with nodes"}
                    accent={activeCount > 0}
                  />
                </div>
              )}

              <div className="mb-8 max-w-2xl">
                {tab === "overview" ? (
                  <label
                    className="mb-2 block font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle"
                    htmlFor="new-brain-input"
                  >
                    Name a new brain
                  </label>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative min-w-[240px] flex-1">
                    <input
                      id="new-brain-input"
                      ref={inputRef}
                      aria-label="New brain name"
                      className="h-10 w-full rounded-sm border border-border bg-background px-3 pr-8 text-[14px] text-foreground outline-none placeholder:text-fg-subtle focus:border-brand focus:ring-[3px] focus:ring-brand/20"
                      disabled={isPending}
                      onChange={(e) => setQuickName(e.target.value)}
                      onKeyDown={onKey}
                      placeholder="e.g. Research on agents, press Enter"
                      value={quickName}
                    />
                    {quickName ? (
                      <button
                        aria-label="Clear"
                        className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-fg-subtle hover:bg-foreground/10 hover:text-foreground"
                        onClick={() => setQuickName("")}
                        type="button"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                  {quickName.trim() ? (
                    <button
                      className="inline-flex h-10 items-center gap-2 rounded-sm bg-brand px-5 text-[14px] font-medium tracking-[-0.005em] text-primary-foreground transition hover:-translate-y-px hover:shadow-sm disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                      disabled={isPending}
                      onClick={() => handleCreateBrain()}
                      type="button"
                    >
                      {isPending ? "Creating…" : "Create"}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>

              {brainError ? (
                <p className="mb-4 text-sm text-destructive">{brainError}</p>
              ) : null}

              {tab === "overview" ? (
                <SectionHead
                  count={filtered.length}
                  kicker="Recent brains"
                  lede="The latest canvases you have touched."
                />
              ) : null}

              {filtered.length === 0 ? (
                <div className="flex min-h-[180px] max-w-2xl flex-col items-start justify-center rounded-md border border-dashed border-border bg-foreground/[0.02] px-6 py-10">
                  <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
                    Empty
                  </span>
                  <p className="mt-3 font-serif text-[24px] font-light italic leading-tight text-foreground">
                    No brains yet
                  </p>
                  <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.06em] text-fg-subtle">
                    {search
                      ? "No brains match your search"
                      : "Type a name above and press Enter to create one"}
                  </p>
                </div>
              ) : tab === "personal" ? (
                <div className="max-w-2xl space-y-4">
                  <SectionHead
                    count={filtered.length}
                    kicker="Brains"
                    lede="Everything in your personal workspace."
                  />
                  <div className="relative">
                    <input
                      ref={searchRef}
                      className="h-10 w-full max-w-xs rounded-sm border border-border bg-background pl-8 pr-3 text-[13px] text-foreground outline-none placeholder:text-fg-subtle focus:border-brand focus:ring-[3px] focus:ring-brand/20"
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search brains…"
                      value={search}
                    />
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
                  </div>
                  <div className="space-y-2">
                    {filtered.map((brain) => (
                      <BrainRow
                        key={brain.id}
                        brain={brain}
                        onDelete={() => handleDeleteBrain(brain.id)}
                        selected={brain.id === selectedBrainId}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="max-w-2xl space-y-2">
                  {filtered.map((brain) => (
                    <BrainRow
                      key={brain.id}
                      brain={brain}
                      onDelete={() => handleDeleteBrain(brain.id)}
                      selected={brain.id === selectedBrainId}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {settingsOpen ? (
        <div
          aria-label="Settings"
          aria-modal="true"
          className="fixed z-50 w-[280px] overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-2xl"
          ref={settingsPopoverRef}
          role="dialog"
          style={{ left: (collapsed ? 56 : width) + 8, bottom: 12 }}
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-[12px] font-semibold text-foreground">
              Settings
            </span>
            <button
              aria-label="Close settings"
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition hover:bg-foreground/10 hover:text-foreground"
              onClick={() => setSettingsOpen(false)}
              type="button"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex flex-col py-2">
            <SettingsGroupHeader>Appearance</SettingsGroupHeader>
            <SettingsMenuRow
              icon={
                palette === "thread" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )
              }
              label={palette === "thread" ? "Light mode" : "Dark mode"}
              onClick={() =>
                setPalette(palette === "thread" ? "loom" : "thread")
              }
              right={
                <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-fg-subtle">
                  {palette === "thread" ? "Thread" : "Loom"}
                </span>
              }
            />

            <SettingsGroupHeader>Account</SettingsGroupHeader>
            <Show when="signed-out">
              <SignInButton fallbackRedirectUrl="/">
                <SettingsMenuRow
                  icon={<LogIn className="h-4 w-4" />}
                  label="Sign in"
                />
              </SignInButton>
              <SignUpButton fallbackRedirectUrl="/">
                <SettingsMenuRow
                  icon={<UserPlus className="h-4 w-4" />}
                  label="Create account"
                />
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <div className="mx-2 mb-1 rounded-md border border-border bg-foreground/[0.03] px-3 py-2">
                <p className="truncate text-[12px] font-medium text-foreground">
                  {user?.fullName ||
                    user?.firstName ||
                    user?.username ||
                    "Account"}
                </p>
                {user?.primaryEmailAddress?.emailAddress ? (
                  <p className="truncate text-[11px] text-fg-subtle">
                    {user.primaryEmailAddress.emailAddress}
                  </p>
                ) : null}
              </div>
              <SignOutButton redirectUrl="/welcome">
                <SettingsMenuRow
                  icon={<LogOut className="h-4 w-4" />}
                  label="Sign out"
                  onClick={() => setSettingsOpen(false)}
                />
              </SignOutButton>
            </Show>

            <SettingsGroupHeader>Coming soon</SettingsGroupHeader>
            <SettingsMenuRow
              disabled
              icon={<Workflow className="h-4 w-4" />}
              label="Workspace"
              right={<SoonPill />}
            />
            <SettingsMenuRow
              disabled
              icon={<Database className="h-4 w-4" />}
              label="Data & export"
              right={<SoonPill />}
            />
            <SettingsMenuRow
              disabled
              icon={<Plug className="h-4 w-4" />}
              label="Integrations"
              right={<SoonPill />}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatTile({
  kicker,
  value,
  hint,
  accent = false,
}: {
  kicker: string;
  value: number;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col rounded-md border border-border bg-card p-5">
      <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
        {kicker}
      </span>
      <span
        className={`mt-3 font-serif text-[40px] font-light leading-none tracking-[-0.02em] ${
          accent ? "text-brand" : "text-foreground"
        }`}
      >
        {value}
      </span>
      {hint ? (
        <span className="mt-5 border-t border-border pt-3 text-[13px] text-fg-subtle">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

function SectionHead({
  kicker,
  lede,
  count,
}: {
  kicker: string;
  lede?: string;
  count?: number;
}) {
  return (
    <div className="mb-4 max-w-2xl border-b border-border pb-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
            {kicker}
          </p>
          {lede ? (
            <p className="mt-1.5 font-serif text-[18px] font-light italic leading-[1.35] text-fg-muted">
              {lede}
            </p>
          ) : null}
        </div>
        {typeof count === "number" ? (
          <span className="shrink-0 pt-0.5 font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
            {count} {count === 1 ? "brain" : "brains"}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function SidebarTab({
  active,
  collapsed,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  collapsed: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-current={active ? "page" : undefined}
      aria-label={label}
      className={`flex items-center gap-2 rounded-md px-2 py-2 text-[13px] transition ${
        active
          ? "bg-foreground/10 text-foreground"
          : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
      } ${collapsed ? "justify-center" : ""}`}
      onClick={onClick}
      title={label}
      type="button"
    >
      <span className="shrink-0">{icon}</span>
      {!collapsed ? <span className="truncate">{label}</span> : null}
    </button>
  );
}

const RELATIVE_TIME_THRESHOLDS: Array<{
  unit: Intl.RelativeTimeFormatUnit;
  seconds: number;
}> = [
  { unit: "year", seconds: 365 * 24 * 60 * 60 },
  { unit: "month", seconds: 30 * 24 * 60 * 60 },
  { unit: "week", seconds: 7 * 24 * 60 * 60 },
  { unit: "day", seconds: 24 * 60 * 60 },
  { unit: "hour", seconds: 60 * 60 },
  { unit: "minute", seconds: 60 },
];

const RELATIVE_TIME_FORMATTER = new Intl.RelativeTimeFormat(undefined, {
  numeric: "auto",
});

function formatRelativeTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSeconds);
  if (abs < 45) {
    return "just now";
  }
  for (const { unit, seconds } of RELATIVE_TIME_THRESHOLDS) {
    if (abs >= seconds) {
      const value = Math.round(diffSeconds / seconds);
      return RELATIVE_TIME_FORMATTER.format(value, unit);
    }
  }
  return RELATIVE_TIME_FORMATTER.format(diffSeconds, "second");
}

function formatCreatedDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
  });
}

function BrainRow({
  brain,
  onDelete,
  selected = false,
}: {
  brain: BrainDTO;
  onDelete: () => void;
  selected?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function outside(e: globalThis.MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as globalThis.Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", outside);
    }
    return () => document.removeEventListener("mousedown", outside);
  }, [open]);

  const lastUpdatedLabel = formatRelativeTime(brain.updatedAt);
  const createdLabel = formatCreatedDate(brain.createdAt);

  return (
    <div
      className={`flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3.5 transition ${
        selected ? "bg-foreground/[0.06]" : "hover:bg-foreground/[0.04]"
      }`}
    >
      <Link
        className="min-w-0 flex-1 outline-none"
        href={`/brains/${brain.id}`}
        prefetch={false}
      >
        <div className="truncate font-serif text-[17px] font-normal leading-snug tracking-[-0.01em] text-foreground">
          {brain.name}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-fg-subtle">
          {lastUpdatedLabel ? <span>Last updated {lastUpdatedLabel}</span> : null}
          {lastUpdatedLabel && createdLabel ? (
            <span aria-hidden="true" className="text-fg-subtle/60">·</span>
          ) : null}
          {createdLabel ? <span>Created {createdLabel}</span> : null}
        </div>
      </Link>
      <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.06em] text-fg-muted sm:inline-flex">
        <User className="h-3 w-3" />
        Personal
      </span>
      <div ref={ref} className="relative shrink-0">
        <button
          aria-label="Options"
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
          onClick={(e) => {
            e.preventDefault();
            setOpen((prev) => {
              const next = !prev;
              if (next && triggerRef.current) {
                const rect = triggerRef.current.getBoundingClientRect();
                const spaceBelow = window.innerHeight - rect.bottom;
                setOpenUp(spaceBelow < 180);
              }
              return next;
            });
          }}
          ref={triggerRef}
          type="button"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        {open ? (
          <div
            className={`absolute right-0 z-20 w-40 rounded-lg border border-border bg-popover p-1 shadow-xl ${
              openUp ? "bottom-full mb-1" : "top-full mt-1"
            }`}
          >
            <Link
              className="block rounded-md px-3 py-2 text-[12px] text-foreground hover:bg-foreground/10"
              href={`/brains/${brain.id}`}
              prefetch={false}
              onClick={() => setOpen(false)}
            >
              Open brain
            </Link>
            <button
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[12px] text-destructive hover:bg-destructive/10"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
              type="button"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete brain
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SettingsGroupHeader({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 mb-1 px-3 text-[10px] font-medium uppercase tracking-[0.18em] text-fg-subtle first:mt-0">
      {children}
    </p>
  );
}

function SoonPill() {
  return (
    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-fg-subtle">
      Soon
    </span>
  );
}

type SettingsMenuRowProps = {
  icon?: ReactNode;
  label: ReactNode;
  right?: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
};

function SettingsMenuRow({
  icon,
  label,
  right,
  disabled,
  onClick,
}: SettingsMenuRowProps) {
  return (
    <button
      className={`mx-1 flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition ${
        disabled
          ? "cursor-not-allowed text-fg-subtle"
          : "text-foreground hover:bg-foreground/10"
      }`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {icon ? (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground">
          {icon}
        </span>
      ) : null}
      <span className="flex-1 truncate">{label}</span>
      {right ? <span className="shrink-0">{right}</span> : null}
    </button>
  );
}
