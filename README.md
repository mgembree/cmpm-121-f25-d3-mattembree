# CMPM 121 Demo 3 — Map Interaction Prototype

This repository contains a small interactive map prototype built for the CMPM-121 Demo 3 assignment (D3.A).

What this project is

- **Purpose:** A classroom demo project implementing the first stage of a tile/cell-based game assignment (D3.A). It lays the groundwork for inventory and crafting features in later steps.
- **Core tech:** TypeScript, Deno tasks, Leaflet, OpenStreetMap tiles.
- **Deterministic cells:** Cell contents (presence/value of tokens) are generated deterministically on page load via a seeded function so state is consistent between reloads.

Project Goals (D3.A Steps)

- **Edge coverage:** Cells are drawn to the edge of the map viewport so the world appears tiled everywhere the user looks.
- **Limited interaction:** Players can only interact with cells near their marker; distant cells are visible but not actionable.
- **Repeatable state:** Cell initial states are consistent across page loads using a deterministic RNG.

## Completed steps

- **Step 1 — Map (complete):**

  - Implemented a Leaflet map that draws deterministic grid cells across the viewport.

  - Player marker represents the interaction center; only cells within a nearby neighborhood are interactive.

- **Step 2 — Inventory (complete):**

  - Players can pick up a token from an interactive cell; at most one token can be held at a time.

  - The status panel shows the value of the currently held token.

  - Tokens picked up are removed from the cell for the current session (tracked in runtime state).

- **Step 3 — Crafting (in-progress):**

  - Player can combine a held token with an equal token on an interactive cell.

  - Current semantics: when the player crafts using two equal tokens, the clicked cell is consumed and the player receives a doubled token in hand.

  - The view refreshes immediately to reflect consumption of the cell; this behavior mirrors the requested "consume on craft" rule.

  - Note: earlier development included a test override that made two adjacent cells both equal; that override has been removed — the grid now relies purely on the deterministic RNG to populate tokens.
