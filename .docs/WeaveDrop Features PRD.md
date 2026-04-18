# WeaveDrop Features PRD

Date: 2026-04-17
Status: Draft

## Summary

WeaveDrop is a braindump-first workspace for thinking with sources on a canvas.

The product should not feel like a normal chat app with files attached. The main experience is a canvas where everything becomes nodes. Some nodes represent thoughts, some represent sources, and some represent chats that reason over selected context.

This document captures the feature directions discussed so far. These are ideas to guide future product phases, not a locked implementation plan.

## Product Direction

WeaveDrop takes inspiration from NotebookLM's grounded, source-aware chat, but the center of gravity is different.

- NotebookLM centers the notebook and chat thread
- WeaveDrop centers the canvas and node graph
- Sources, chats, and thoughts live together in one working space
- Context is assembled visually through connections between nodes
- Over time, chat nodes can evolve into agent-like nodes with attachable tools and skills

The first feeling the product should create is: "I can dump what is in my head into a working space."

## Core Product Ideas

### 1. Canvas-first workspace

The canvas is the primary interface. Users work spatially, not through a single linear thread.

### 2. Everything becomes nodes

The main unit of interaction is the node.

Early node families discussed:

- `Text` nodes for braindumps, notes, and raw thinking
- `Chat` nodes for grounded conversations and synthesis
- Source-specific nodes for imported material

### 3. Source-specific nodes

"Source" is a category, not one generic node type.

Initial source types discussed:

- `Website`
- `PDF`
- `YouTube`
- `Text paste`

Longer term, more source types may be added, such as books, images, audio, folders, and connected external libraries.

### 4. Graph-based context

Nodes can be connected in a graph, similar to tools like `n8n`.

For the early product, an edge should have one meaning:

- a connected node provides context to another node

This is most important for chats. A chat should use connected nodes as its working context.

### 5. Isolated chat context

A `Chat` node should only use directly connected nodes.

It should not automatically traverse the whole graph. This keeps context isolated, understandable, and predictable.

## Source Node Experience

Opening a source node should not take the user away from the workspace. It should open a focused detail panel.

That panel should let the user:

- preview or read the source
- inspect extracted content
- copy or pull excerpts
- connect the source into chat context

In early versions, source nodes should support lightweight reading and inspection inside the workspace. They do not need to become full standalone apps yet.

## Grounded Chat and Citations

Chat in WeaveDrop is meant to be grounded, not generic.

The intended model is RAG-backed chat similar in spirit to NotebookLM:

- answers should be based on connected sources
- responses should be grounded in those sources
- citations should be a core product behavior, not optional polish

### Citation behavior

Chat responses should include inline citations attached to specific claims or sentences.

When a user clicks a citation:

- the app should open the relevant source in a side panel
- it should jump to the exact supporting passage, excerpt, or timestamp when possible

This behavior matters for trust, verification, and serious research workflows.

## Ingestion Model

Source ingestion should be asynchronous and visible.

Suggested source states:

- `queued`
- `processing`
- `ready`
- `failed`

If a source is connected to a chat before it is ready, it should appear as attached but unavailable until processing completes.

## AI Role

### Early role

In earlier versions, AI should focus on:

- grounded question answering
- summarization
- synthesis across connected context

### Later role

In later versions, AI may also:

- turn messy braindumps into structured nodes
- choose likely node types automatically
- propose graph structure
- create richer working nodes directly

This later behavior is intentionally deferred. Manual node creation is the right starting point.

## Future Tools and Skills Direction

WeaveDrop should be designed so tools and skills can attach to chat or agent-like nodes later.

This is an architectural direction, not a first-version requirement.

The long-term idea is that:

- chat nodes are grounded on connected sources
- those nodes can later use attached tools or skills
- reasoning and action both happen inside the same workspace

The early product should be tool-ready, not tool-executing.

## Feature Areas To Add Later

### Braindump and node creation

- manually create text or idea nodes
- make node creation fast and low-friction
- make the canvas feel like a place to dump thoughts immediately

### Source ingestion

- add websites
- add PDFs
- add YouTube videos
- add pasted text as a source
- show ingestion state clearly

### Canvas graph behavior

- create, move, and connect nodes
- use edges to define context flow
- keep chat context limited to directly connected nodes

### Source inspection

- open source nodes in a side panel
- preview and read source content
- pull excerpts for reuse
- keep source interaction inside the canvas workflow

### Grounded chat

- create multiple chat nodes on one canvas
- answer based on connected nodes only
- return inline citations
- open citations at exact supporting locations when possible

### Agent-ready architecture

- leave room for attachable tools and skills
- treat chat nodes as future agent surfaces
- avoid early implementation choices that block later agent behavior

## Product Principles

- braindump first, structure second
- canvas first, chat second
- source-specific nodes over one generic source node
- grounded reasoning over generic assistant behavior
- direct connections define context
- citations are essential
- tools and skills are future-facing, not required on day one

## Open Questions For Later Planning

These came up as future planning questions, but they do not block this feature PRD:

- default blank state for a new canvas
- first-user persona
- exact MVP boundary
- visual design for each node type
- retrieval and citation data model
- how much interaction each source detail panel needs
- when chat should become a true tool-using agent
