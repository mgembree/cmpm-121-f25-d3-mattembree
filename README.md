# CMPM 121 Demo 3 — Broken Token Hunter

This repository contains an interactive map-based token collection game built for the CMPM-121 Demo 3 assignment.

## What this project is

- **Purpose:** A classroom demo project implementing a tile/cell-based game with token collection, crafting mechanics, and player movement.
- **Core tech:** TypeScript, Deno tasks, Leaflet, OpenStreetMap tiles.
- **Deterministic cells:** Cell contents (presence/value of tokens) are generated deterministically via a seeded RNG so state is consistent between sessions.

## Project Goals

### D3.A — Core Mechanics (Complete)

**Step 1 — Map Interface:**

- Cells are drawn to the edge of the viewport so the world appears fully tiled
- Players can only interact with cells near their marker
- Cell initial states are deterministic and consistent across page loads

**Step 2 — Inventory System:**

- Players can pick up at most one token at a time
- The status panel clearly shows the value of the held token
- Picked-up tokens are removed from their cells

**Step 3 — Crafting System:**

- Players can combine a held token with an equal-value token on a cell
- Both tokens are consumed and the player receives a doubled-value token
- The game detects when the player has a token of sufficient value

### D3.B — Advanced Features (Complete)

**Step 1 — Map Movement:**

- Players can move their character using directional buttons (North, South, East, West)
- The map can be scrolled independently of player movement
- Only cells near the player's current location are interactive
- Cells are memoryless: they forget their state when they leave the visible area, allowing token farming by moving in/out of range

**Step 2 — Win Condition:**

- Players must craft tokens up to a value of 4096 to win
- Victory is declared when the player holds a token ≥ 4096
- A victory message is displayed and gameplay is disabled upon winning
