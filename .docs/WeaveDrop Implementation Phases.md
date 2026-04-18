# WeaveDrop Implementation Phases

Date: 2026-04-17
Status: Ready for implementation

## How to use this document

Implement these phases in order.

- Finish one phase completely before starting the next.
- Do not skip test coverage and acceptance checks at the end of each phase.
- Keep all work aligned with the feature PRD in `./.docs/WeaveDrop Features PRD.md`.
- When a later phase requires a new type or data shape, add it in the narrowest way that still supports the next phases.

The ordering below is designed to make the product usable early, while still leading to the full grounded canvas workflow at the end.

---

## Phase 1 — Make the canvas actually usable

### Goal

Turn the current canvas into a real workspace where users can create, select, edit, move, connect, and delete nodes without leaving the brain.

### Why this phase comes first

The repo already has persisted brains, nodes, edges, and a React Flow canvas, but the user still cannot create or meaningfully work with nodes from the UI. This phase unlocks the rest of the product.

### Todo

- Add in-canvas quick-create controls for:
  - `Note`
  - `Chat`
  - `Source`
- Replace the generic default React Flow node rendering with custom node cards.
- Give each node type its own visual treatment:
  - note node
  - chat node
  - source node
- Use the existing transient UI store for:
  - selected node
  - hovered node
- Add a right-side detail panel driven by selected node state.
- Make note nodes editable in the detail panel.
- Persist note title/text changes through server actions.
- Preserve current behaviors:
  - drag to move
  - connect nodes
  - delete nodes
  - delete edges
- Add an empty-canvas onboarding state so a new brain is actionable immediately.

### Implementation details

- Keep page/layout as Server Components.
- Keep the interactive canvas shell as a focused Client Component.
- Keep node mutations inside existing `use server` action files.
- Minimize the `use client` surface area to the canvas workflow only.
- Do not introduce a second global state system.

### Acceptance criteria

- User can open a brain and create a note node in one obvious action.
- User can select a node and edit it in a side panel.
- User can reload and see the same node data and positions.
- User can connect nodes visually and remove those connections.
- The canvas no longer feels blank or dead on first open.

---

## Phase 2 — Build the source node workflow

### Goal

Make source nodes real product objects with visible ingestion state and readable source content inside the workspace.

### Why this phase comes second

The product direction depends on grounded work with sources, but the workspace first needs a clean node interaction model from Phase 1.

### Todo

- Add source creation flows for:
  - website
  - PDF
  - YouTube
  - pasted text
- Expand source typing so pasted text is a first-class source type.
- Align source ingestion states with the intended product model:
  - `queued`
  - `processing`
  - `ready`
  - `failed`
- Extend source DTOs/actions so the client can read:
  - title
  - summary
  - error state
  - extracted content chunks or excerpts
- Add source detail panel sections for:
  - metadata
  - status
  - extracted content
  - failure state
  - excerpt actions
- Keep source inspection inside the current canvas screen.
- Show attached-but-unavailable state when a processing source is connected to a chat node.

### Implementation details

- Treat source ingestion as asynchronous and visible.
- Keep one source node per source object.
- Avoid opening separate pages for sources.
- Return only the source data the client actually needs.

### Acceptance criteria

- User can create a source node from at least one valid input path.
- Source status is visible on the node and in the detail panel.
- Ready sources expose readable extracted content in the app.
- Failed sources show a clear error state.

---

## Phase 3 — Make chat nodes real workspace surfaces

### Goal

Turn chat nodes into isolated, persisted conversations that reason over directly connected context only.

### Why this phase comes third

The repo already stores chat messages, but the UI does not expose a chat workflow yet. By this point the user should already be able to create notes and sources and wire them together.

### Todo

- Add chat node compose UI.
- Add persisted thread history UI.
- Display current connected context for the selected chat node.
- Resolve direct connections only. Do not traverse the whole graph.
- Store context node IDs with each user message and assistant message as a snapshot.
- Add states for:
  - no connected context
  - only notes connected
  - sources still processing
  - mixed ready and unavailable context
- Support multiple chat nodes in the same brain with isolated histories.

### Implementation details

- Keep the graph rule simple: directly connected nodes provide context.
- Do not add chat-to-chat composition.
- Preserve the existing edge semantics and validation rules.
- Make context explainable in the UI so the user can see what the chat is using.

### Acceptance criteria

- User can create multiple chat nodes.
- Each chat node shows its own thread.
- Each chat node uses only its directly connected context.
- Chat history persists after reload.

---

## Phase 4 — Add grounded response generation

### Goal

Generate assistant responses from connected note/source context rather than storing plain placeholder chat messages.

### Why this phase comes fourth

The chat UI and source workflow need to exist first. Otherwise grounded generation is hard to validate and explain.

### Todo

- Add a server-side chat generation entrypoint.
- Gather context from:
  - directly connected note nodes
  - directly connected ready source nodes
- Exclude:
  - unconnected nodes
  - processing sources from active retrieval
  - failed sources from active retrieval
- Define assistant response storage so it can include:
  - content
  - citation metadata
  - context snapshot
- Build retrieval from source chunks/excerpts.
- Build a deterministic fallback behavior when context is missing or unusable.
- Add clear user feedback for:
  - empty context
  - processing context
  - failed generation

### Implementation details

- Keep the generation layer thin and replaceable.
- Do not hard-wire future agent/tool execution into this phase.
- Keep auth/ownership validation inside the server-side entrypoint and data access path.
- Avoid broad schema churn that is not needed for grounded chat.

### Acceptance criteria

- User can send a message from a chat node and receive an assistant response.
- The response is based only on directly connected context.
- Messages still persist correctly.
- Failure states are explicit instead of silent.

---

## Phase 5 — Ship citations as a first-class behavior

### Goal

Make citations visible, clickable, and inspectable inside the canvas workflow.

### Why this phase comes fifth

Grounded generation is not enough by itself. The PRD treats citations as essential for trust and verification.

### Todo

- Add inline citation rendering in assistant responses.
- Store citations in a structured format, not as plain string markup only.
- Clicking a citation should:
  - open the relevant source in the side panel
  - focus the cited excerpt/chunk/timestamp when possible
- Support citation behavior across:
  - webpage sources
  - PDF sources
  - YouTube sources
  - pasted-text sources
- Add graceful fallback when exact source location is unavailable.

### Implementation details

- Keep citation metadata normalized enough for one shared UI.
- Separate citation rendering from assistant text generation.
- Prefer source-locator metadata that can map back into the source detail panel.

### Acceptance criteria

- Assistant responses show inline citations.
- Clicking a citation opens the correct source.
- The user can inspect the cited support without leaving the workspace.

---

## Phase 6 — Harden the system for future growth

### Goal

Stabilize the core product loop and leave the architecture ready for later tool/agent work.

### Why this phase is last

This phase is cleanup and hardening after the full loop works:

create nodes -> connect context -> inspect sources -> grounded chat -> verify citations

### Todo

- Normalize node UI/data contracts where Phase 1–5 introduced duplication.
- Tighten edge validation and document allowed graph relationships.
- Add focused tests for:
  - node creation/editing
  - source ingestion status
  - source detail retrieval
  - chat context isolation
  - citation navigation
- Add failure logging or basic observability for:
  - source ingestion failures
  - grounded chat failures
  - citation resolution failures
- Review the data shapes so future attachable tools/skills can fit without redoing the canvas model.

### Implementation details

- Keep future-agent support architectural, not product-visible.
- Do not build tool execution yet.
- Refactor only where the earlier phases clearly created friction.

### Acceptance criteria

- The end-to-end product loop is stable.
- Core flows are covered by focused tests.
- Later feature work can build on the existing node/chat/source structure instead of replacing it.

---

## Final product state after all phases

At the end of these phases, WeaveDrop should work like this:

- User creates a brain.
- User drops thoughts into note nodes.
- User adds sources to the same canvas.
- Sources ingest asynchronously and expose readable content.
- User connects notes and sources into one or more chat nodes.
- Each chat node reasons only over directly connected context.
- Responses are grounded and include inline citations.
- Clicking a citation opens the supporting source inside the workspace.

That is the first complete version of the product loop described by the PRD.

---

## Non-goals for this roadmap

These should not interrupt the phase order above:

- full agent/tool execution
- automatic node-type guessing from braindumps
- automatic graph construction
- broad refactors unrelated to the product loop
- advanced multi-user collaboration
- external library integrations beyond what is required for the grounded source/chat workflow

---

## Recommended working rule while implementing

If a task does not clearly help one of these outcomes, delay it:

- faster braindumping
- clearer source inspection
- stricter direct-context chat behavior
- better citation trust
- cleaner future extension points
