# CMPM 121 Demo 3 — Map Interaction Prototype

This repository contains a small interactive map prototype built for the CMPM-121 Demo 3 assignment (D3.A).

What this project is

- **Purpose:** A classroom demo project implementing the first stage of a tile/cell-based game assignment (D3.A). It lays the groundwork for inventory and crafting features in later steps.
- **Core tech:** TypeScript, Deno tasks, Leaflet, OpenStreetMap tiles.
- **Deterministic cells:** Cell contents (presence/value of tokens) are generated deterministically on page load via a seeded function so state is consistent between reloads.

Project Goals (D3.A Step 1)

- **Edge coverage:** Cells are drawn to the edge of the map viewport so the world appears tiled everywhere the user looks.
- **Limited interaction:** Players can only interact with cells near their marker; distant cells are visible but not actionable.
- **Repeatable state:** Cell initial states are consistent across page loads using a deterministic RNG.

**Next steps (planned in `PLAN.md`)**

- Step 2: Inventory — allow picking up a single token and show what the player holds.
- Step 3: Crafting — allow combining tokens on cells to make higher-value tokens.

If you want, I can implement Step 2 next (inventory/pickup) using the exported `playerMarker` and helpers in `src/main.ts`.
