"use client";

import {
  ChevronRight,
  Folder,
  Home as HomeIcon,
  LogOut,
  MoreVertical,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings as SettingsIcon,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type KeyboardEvent,
  useEffect,
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
import { BRAND_ICON_SRC } from "@/lib/brand";
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
const SIDEBAR_MIN_WIDTH = 240;
const SIDEBAR_MAX_WIDTH = 420;
const SIDEBAR_DEFAULT_WIDTH = 240;
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
    <div className="flex h-dvh overflow-hidden bg-[#1D1F24] font-sans text-white selection:bg-[#d97757]/30">
      <aside
        className="relative grid h-dvh shrink-0 grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden border-r border-white/10 bg-[#25282E]"
        style={{ width: collapsed ? 56 : width }}
      >
        <div
          className={`flex gap-1 border-b border-white/10 px-2 py-2 ${
            collapsed ? "flex-col items-center" : "items-center"
          }`}
        >
          <button
            aria-label="Go to overview"
            className={`flex min-w-0 items-center gap-2 rounded-md p-1 text-left transition hover:bg-white/5 ${
              collapsed ? "" : "mr-auto"
            }`}
            onClick={goHome}
            title="WeaveDrop home"
            type="button"
          >
            <BrandMark size="sm" />
            {!collapsed ? (
              <span className="whitespace-nowrap text-[13px] font-semibold text-white/90">WeaveDrop</span>
            ) : null}
          </button>
          <button
            aria-label="New brain"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-400 transition hover:bg-white/10 hover:text-white"
            onClick={handleNewBrainShortcut}
            title="New brain"
            type="button"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            aria-label="Search brains"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-400 transition hover:bg-white/10 hover:text-white"
            onClick={openPersonalSearch}
            title="Search brains"
            type="button"
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-400 transition hover:bg-white/10 hover:text-white"
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
          className={`h-full overflow-y-auto overscroll-contain pb-2 ${
            collapsed ? "px-1" : "px-2"
          }`}
        >
          {brains.length > 0 ? (
            <>
              {!collapsed ? (
                <p className="mb-1 mt-3 px-2 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
                  Brains
                </p>
              ) : null}
              <div className="flex flex-col gap-0.5">
                {brains.map((brain) => (
                  <Link
                    key={brain.id}
                    className={`flex rounded-md text-[12px] transition ${
                      brain.id === selectedBrainId
                        ? "bg-white/10 text-white"
                        : "text-zinc-400 hover:bg-white/5 hover:text-white"
                    } ${collapsed ? "justify-center px-1 py-2" : "items-center gap-2 px-2 py-1.5"}`}
                    href={`/brains/${brain.id}`}
                    prefetch={false}
                    title={brain.name}
                  >
                    {collapsed ? (
                      <span className="flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-[11px] font-medium uppercase">
                        {brain.name.slice(0, 1)}
                      </span>
                    ) : (
                      <>
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#d97757]/70" />
                        <span className="min-w-0 flex-1 truncate">{brain.name}</span>
                        {isExtended ? (
                          <span className="shrink-0 rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-zinc-400">
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
                <p className="text-center text-[11px] text-zinc-500">
                  No brains yet.
                </p>
              ) : null}
            </div>
          )}
        </div>

        <div
          className={`border-t border-white/10 ${collapsed ? "px-1 py-2" : "px-2 py-2"}`}
        >
          <button
            aria-expanded={settingsOpen}
            aria-label="Settings"
            className={`flex w-full items-center rounded-md text-[13px] transition ${
              settingsOpen
                ? "bg-white/10 text-white"
                : "text-zinc-400 hover:bg-white/5 hover:text-white"
            } ${collapsed ? "justify-center px-2 py-2" : "gap-2 px-2 py-2"}`}
            onClick={() => setSettingsOpen((v) => !v)}
            title="Settings"
            type="button"
          >
            <SettingsIcon className="h-4 w-4 shrink-0" />
            {!collapsed ? (
              <>
                <span className="min-w-0 flex-1 truncate text-left">Settings</span>
                {isExtended ? (
                  <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" />
                ) : null}
              </>
            ) : null}
          </button>
        </div>

        {!collapsed ? (
          <div
            aria-label="Resize sidebar"
            aria-valuemax={SIDEBAR_MAX_WIDTH}
            aria-valuemin={SIDEBAR_MIN_WIDTH}
            aria-valuenow={width}
            className={`absolute right-0 top-0 z-10 h-full w-1 cursor-col-resize transition-colors ${
              isResizing ? "bg-[#d97757]/60" : "hover:bg-white/10"
            }`}
            onDoubleClick={() => setWidth(SIDEBAR_DEFAULT_WIDTH)}
            onMouseDown={(e) => {
              e.preventDefault();
              setIsResizing(true);
            }}
            role="separator"
          />
        ) : null}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {isCanvasView ? (
          <header className="flex items-center justify-between border-b border-white/10 bg-[#25282E] px-6 py-4">
            <div className="flex min-w-0 items-center gap-2 text-[12px] text-zinc-400">
              <span>Personal</span>
              <span className="text-zinc-600">/</span>
              <span className="truncate font-medium text-white">{selectedBrainName ?? "Brain"}</span>
            </div>
          </header>
        ) : null}

        <div
          className={`flex min-h-0 flex-1 flex-col ${
            isCanvasView ? "overflow-hidden" : "overflow-y-auto px-8 py-8"
          }`}
        >
          {isCanvasView && selectedBrain ? (
            <div className="min-h-0 flex-1 bg-[#1D1F24]">
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
                <div className="mb-7 grid max-w-xl grid-cols-3 gap-3">
                  <div className="rounded-xl border border-white/10 bg-[#25282E] p-4">
                    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">Total brains</p>
                    <p className="mt-2 font-serif text-4xl text-white">{brains.length}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-[#25282E] p-4">
                    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">Total nodes</p>
                    <p className="mt-2 font-serif text-4xl text-white">{totalNodes}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-[#25282E] p-4">
                    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">Active</p>
                    <p className={`mt-2 font-serif text-4xl ${activeCount > 0 ? "text-[#d97757]" : "text-white"}`}>
                      {activeCount}
                    </p>
                  </div>
                </div>
              )}

              <div className="mb-6 flex max-w-xl flex-wrap items-center gap-2">
                <div className="relative min-w-[240px] flex-1">
                  <input
                    ref={inputRef}
                    aria-label="New brain name"
                    className="h-10 w-full rounded-lg border border-white/10 bg-[#25282E] px-3 pr-8 text-[13px] text-white outline-none ring-[#d97757]/40 placeholder:text-zinc-500 focus:border-[#d97757]/50 focus:ring-2"
                    disabled={isPending}
                    onChange={(e) => setQuickName(e.target.value)}
                    onKeyDown={onKey}
                    placeholder="Name a new brain and press Enter…"
                    value={quickName}
                  />
                  {quickName ? (
                    <button
                      aria-label="Clear"
                      className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-zinc-500 hover:bg-white/10 hover:text-white"
                      onClick={() => setQuickName("")}
                      type="button"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
                {quickName.trim() ? (
                  <button
                    className="h-10 rounded-lg bg-[#d97757] px-4 text-[12px] font-medium text-white hover:bg-[#c8674a] disabled:opacity-50"
                    disabled={isPending}
                    onClick={() => handleCreateBrain()}
                    type="button"
                  >
                    {isPending ? "Creating…" : "Create →"}
                  </button>
                ) : null}
              </div>

              {brainError ? (
                <p className="mb-4 text-sm text-rose-300">{brainError}</p>
              ) : null}

              {tab === "overview" && (
                <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">Recent brains</p>
              )}

              {filtered.length === 0 ? (
                <div className="flex min-h-[160px] flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-10 text-center">
                  <p className="font-serif text-lg italic text-zinc-400">No brains yet</p>
                  <p className="mt-2 text-[12px] text-zinc-500">
                    {search ? "No brains match your search" : "Type a name above and press Enter to create one"}
                  </p>
                </div>
              ) : tab === "personal" ? (
                <div className="max-w-2xl space-y-4">
                  <div className="flex items-end justify-between gap-4 border-b border-white/10 pb-2">
                    <span className="text-[13px] font-medium text-white">Brains</span>
                    <span className="text-[11px] text-zinc-500">
                      {filtered.length} {filtered.length === 1 ? "brain" : "brains"}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      ref={searchRef}
                      className="h-9 w-full max-w-xs rounded-lg border border-white/10 bg-[#25282E] pl-8 pr-3 text-[12px] text-white outline-none focus:border-white/20"
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search brains…"
                      value={search}
                    />
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
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
                <div className="max-w-2xl overflow-hidden rounded-xl border border-white/10 bg-[#25282E]">
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
        <>
          <div
            aria-hidden
            className="fixed inset-0 z-30 bg-black/40"
            onClick={() => setSettingsOpen(false)}
          />
          <div
            aria-label="Settings"
            className="fixed bottom-0 top-0 z-40 flex w-[280px] flex-col border-r border-white/10 bg-[#25282E] shadow-2xl"
            role="dialog"
            style={{ left: collapsed ? 56 : width }}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <span className="text-[13px] font-semibold text-white">Settings</span>
              <button
                aria-label="Close settings"
                className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition hover:bg-white/10 hover:text-white"
                onClick={() => setSettingsOpen(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
              <Show when="signed-out">
                <p className="mb-2 px-2 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                  Account
                </p>
                <SignInButton fallbackRedirectUrl="/">
                  <button
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] text-zinc-200 transition hover:bg-white/10"
                    type="button"
                  >
                    Sign in
                  </button>
                </SignInButton>
                <SignUpButton fallbackRedirectUrl="/">
                  <button
                    className="mt-1 flex w-full items-center gap-2 rounded-md border border-[#d97757] bg-[#d97757] px-3 py-2 text-left text-[13px] font-medium text-white transition hover:bg-[#c8674a]"
                    type="button"
                  >
                    Create account
                  </button>
                </SignUpButton>
              </Show>

              <Show when="signed-in">
                <div className="mb-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                    Signed in
                  </p>
                  <p className="mt-1 truncate text-[13px] font-medium text-white">
                    {user?.fullName || user?.firstName || user?.username || "Account"}
                  </p>
                  {user?.primaryEmailAddress?.emailAddress ? (
                    <p className="truncate text-[11px] text-zinc-500">
                      {user.primaryEmailAddress.emailAddress}
                    </p>
                  ) : null}
                </div>
              </Show>
            </div>

            <Show when="signed-in">
              <div className="border-t border-white/10 p-3">
                <SignOutButton>
                  <button
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] text-zinc-300 transition hover:bg-white/10 hover:text-white"
                    onClick={() => setSettingsOpen(false)}
                    type="button"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </SignOutButton>
              </div>
            </Show>
          </div>
        </>
      ) : null}
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
          ? "bg-white/10 text-white"
          : "text-zinc-400 hover:bg-white/5 hover:text-white"
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

function BrandMark({ size }: { size: "sm" | "md" }) {
  const box = size === "sm" ? "h-7 w-7 rounded-md" : "h-9 w-9 rounded-lg";
  const dim = size === "sm" ? 28 : 36;

  return (
    <div
      className={`flex shrink-0 items-center justify-center border border-white/10 bg-white/[0.04] ${box}`}
    >
      <Image
        alt="WeaveDrop"
        className="object-contain p-0.5"
        height={dim}
        priority={size === "sm"}
        src={BRAND_ICON_SRC}
        width={dim}
      />
    </div>
  );
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
  const ref = useRef<HTMLDivElement>(null);

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

  return (
    <div
      className={`flex items-center gap-3 border-b border-white/10 px-4 py-3 last:border-b-0 ${
        selected ? "bg-white/[0.06]" : "hover:bg-white/[0.04]"
      }`}
    >
      <BrandMark size="md" />
      <Link
        className="min-w-0 flex-1 outline-none"
        href={`/brains/${brain.id}`}
        prefetch={false}
      >
        <div className="truncate text-[13px] font-medium text-white">{brain.name}</div>
        <div className="text-[11px] text-zinc-500">
          {brain.nodeCount === 0 ? "Empty canvas" : `${brain.nodeCount} ${brain.nodeCount === 1 ? "node" : "nodes"}`}
        </div>
      </Link>
      <span className="hidden shrink-0 rounded border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500 sm:inline">
        Cloud
      </span>
      <div ref={ref} className="relative shrink-0">
        <button
          aria-label="Options"
          className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-white/10 hover:text-white"
          onClick={(e) => {
            e.preventDefault();
            setOpen((v) => !v);
          }}
          type="button"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        {open ? (
          <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-lg border border-white/15 bg-[#2a2f38] p-1 shadow-xl">
            <Link
              className="block rounded-md px-3 py-2 text-[12px] text-zinc-200 hover:bg-white/10"
              href={`/brains/${brain.id}`}
              prefetch={false}
              onClick={() => setOpen(false)}
            >
              Open brain
            </Link>
            <button
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[12px] text-rose-300 hover:bg-rose-500/10"
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
