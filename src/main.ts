// @deno-types="npm:@types/leaflet"
import leaflet from "leaflet";

import "leaflet/dist/leaflet.css";
import "./_leafletWorkaround.ts";
import luck from "./_luck.ts";
import "./style.css";

// Basic UI: control panel, map, status
const controlPanelDiv = document.createElement("div");
controlPanelDiv.id = "controlPanel";
document.body.append(controlPanelDiv);

// Add movement buttons to control panel
const movementDiv = document.createElement("div");
movementDiv.innerHTML = `
  <button id="north">⬆️ North</button>
  <button id="south">⬇️ South</button>
  <button id="west">⬅️ West</button>
  <button id="east">➡️ East</button>
  <button id="reset">🌐 Reset Position</button>
`;
controlPanelDiv.append(movementDiv);

const mapDiv = document.createElement("div");
mapDiv.id = "map";
document.body.append(mapDiv);

const statusPanelDiv = document.createElement("div");
statusPanelDiv.id = "statusPanel";
document.body.append(statusPanelDiv);

// Classroom origin: tile indices are computed relative to this point
const CLASSROOM_LATLNG = leaflet.latLng(
  36.997936938057016,
  -122.05703507501151,
);

// Tunables for the map grid
const TILE_DEGREES = 1e-4; // size of a cell in degrees
const INTERACTION_RADIUS = 2; // in cell units (Chebyshev distance)
const SPAWN_PROBABILITY = 0.12; // deterministic spawn chance via luck()

// Create the map: allow panning; fix zoom to keep cell scale stable
const MAP_ZOOM = 19;
const map = leaflet.map(mapDiv, {
  center: CLASSROOM_LATLNG,
  zoom: MAP_ZOOM,
  minZoom: MAP_ZOOM,
  maxZoom: MAP_ZOOM,
  zoomControl: false,
  scrollWheelZoom: true,
});

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

// Player marker (represents where interactions are allowed around)
const playerMarker = leaflet.marker(CLASSROOM_LATLNG, { interactive: false });
playerMarker.bindTooltip("You (interaction center)");
playerMarker.addTo(map);

statusPanelDiv.innerText = "Map initialized — showing deterministic cells.";

// Inventory state
type HeldToken = { value: number } | null;
let heldToken: HeldToken = null;

// Track cells from which tokens have been picked up this session
const pickedUpCells = new Set<string>(); // keys are "i,j"
// Track crafted or modified cell values in this session
const craftedCells = new Map<string, number>();

// Win condition
const WIN_THRESHOLD = 4096;
let hasWon = false;

function statusText() {
  return heldToken ? `Holding token: ${heldToken.value}` : `Holding: (empty)`;
}

function checkWinCondition() {
  if (!hasWon && heldToken && heldToken.value >= WIN_THRESHOLD) {
    hasWon = true;
    statusPanelDiv.innerText =
      `🎉 VICTORY! You crafted a token worth ${heldToken.value}! 🎉\n${statusText()}`;

    // Show victory popup
    leaflet.popup()
      .setLatLng(playerMarker.getLatLng())
      .setContent(
        `<div style="text-align: center; font-size: 1.2em;"><strong>🎉 VICTORY! 🎉</strong><br/>You reached ${heldToken.value}!</div>`,
      )
      .openOn(map);
  }
}

function updateStatusPanel() {
  if (hasWon) {
    statusPanelDiv.innerText =
      `🎉 VICTORY! You crafted a token worth ${heldToken?.value}! 🎉\n${statusText()}`;
  } else {
    statusPanelDiv.innerText =
      `Map initialized — showing deterministic cells.\n${statusText()}`;
  }
}

updateStatusPanel();

// LayerGroup to hold currently visible cell rectangles
const cellsLayer = leaflet.layerGroup().addTo(map);

// Movement step size (in degrees)
const MOVEMENT_STEP = TILE_DEGREES * 1; // Move by 1 cell at a time

// Move player marker and update map center
function movePlayer(latOffset: number, lngOffset: number) {
  if (hasWon) return; // Disable movement after winning

  const currentPos = playerMarker.getLatLng();
  const newPos = leaflet.latLng(
    currentPos.lat + latOffset,
    currentPos.lng + lngOffset,
  );
  playerMarker.setLatLng(newPos);
  map.panTo(newPos);

  // Clean up cells that are no longer visible (memoryless behavior)
  cleanupInvisibleCells();

  // Redraw cells with updated interaction radius around new position
  drawCellsInView();
}

// Clear state for cells that are outside the current viewport
function cleanupInvisibleCells() {
  const bounds = map.getBounds();
  const origin = CLASSROOM_LATLNG;

  const visibleIMin =
    Math.floor((bounds.getSouth() - origin.lat) / TILE_DEGREES) - 1;
  const visibleIMax =
    Math.floor((bounds.getNorth() - origin.lat) / TILE_DEGREES) + 1;
  const visibleJMin =
    Math.floor((bounds.getWest() - origin.lng) / TILE_DEGREES) - 1;
  const visibleJMax =
    Math.floor((bounds.getEast() - origin.lng) / TILE_DEGREES) + 1;

  // Remove picked-up cells that are outside visible range
  for (const key of pickedUpCells) {
    const [iStr, jStr] = key.split(",");
    const i = parseInt(iStr);
    const j = parseInt(jStr);
    if (
      i < visibleIMin || i > visibleIMax || j < visibleJMin || j > visibleJMax
    ) {
      pickedUpCells.delete(key);
    }
  }

  // Remove crafted cells that are outside visible range
  for (const key of craftedCells.keys()) {
    const [iStr, jStr] = key.split(",");
    const i = parseInt(iStr);
    const j = parseInt(jStr);
    if (
      i < visibleIMin || i > visibleIMax || j < visibleJMin || j > visibleJMax
    ) {
      craftedCells.delete(key);
    }
  }
}

// Wire up movement buttons
document.getElementById("north")!.addEventListener("click", () => {
  movePlayer(MOVEMENT_STEP, 0);
});

document.getElementById("south")!.addEventListener("click", () => {
  movePlayer(-MOVEMENT_STEP, 0);
});

document.getElementById("west")!.addEventListener("click", () => {
  movePlayer(0, -MOVEMENT_STEP);
});

document.getElementById("east")!.addEventListener("click", () => {
  movePlayer(0, MOVEMENT_STEP);
});

document.getElementById("reset")!.addEventListener("click", () => {
  playerMarker.setLatLng(CLASSROOM_LATLNG);
  map.setView(CLASSROOM_LATLNG, MAP_ZOOM);
  drawCellsInView();
});

function latLngToCell(origin: leaflet.LatLng, latlng: leaflet.LatLng) {
  const i = Math.floor((latlng.lat - origin.lat) / TILE_DEGREES);
  const j = Math.floor((latlng.lng - origin.lng) / TILE_DEGREES);
  return { i, j };
}

function cellBounds(origin: leaflet.LatLng, i: number, j: number) {
  return leaflet.latLngBounds([
    [origin.lat + i * TILE_DEGREES, origin.lng + j * TILE_DEGREES],
    [origin.lat + (i + 1) * TILE_DEGREES, origin.lng + (j + 1) * TILE_DEGREES],
  ]);
}

function drawCellsInView() {
  cellsLayer.clearLayers();
  const bounds = map.getBounds();
  const origin = CLASSROOM_LATLNG;

  const iMin = Math.floor((bounds.getSouth() - origin.lat) / TILE_DEGREES);
  const iMax = Math.floor((bounds.getNorth() - origin.lat) / TILE_DEGREES);
  const jMin = Math.floor((bounds.getWest() - origin.lng) / TILE_DEGREES);
  const jMax = Math.floor((bounds.getEast() - origin.lng) / TILE_DEGREES);

  const playerCell = latLngToCell(origin, playerMarker.getLatLng());

  for (let i = iMin; i <= iMax; i++) {
    for (let j = jMin; j <= jMax; j++) {
      const boundsRect = cellBounds(origin, i, j);

      // Determine runtime cell state (consider deterministic initial state,
      // pickups, and crafted updates).
      const key = `${i},${j}`;

      // Initial deterministic state, with an explicit test override so two
      // nearby cells have the same token value for testing crafting.
      const initialHasToken =
        luck([i, j, "token"].toString()) < SPAWN_PROBABILITY;
      let initialValue: number | null = null;
      if (initialHasToken) {
        initialValue = Math.floor(luck([i, j, "value"].toString()) * 100);
      }

      // If craftedCells has an entry, that overrides the initial value
      const craftedValue = craftedCells.get(key);
      const currentlyHasToken = craftedValue !== undefined
        ? true
        : (initialHasToken && !pickedUpCells.has(key));
      const tokenValue = craftedValue !== undefined
        ? craftedValue
        : initialValue;

      // interactive if within INTERACTION_RADIUS of player cell
      const cheb = Math.max(
        Math.abs(i - playerCell.i),
        Math.abs(j - playerCell.j),
      );
      const interactive = cheb <= INTERACTION_RADIUS;

      const rect = leaflet.rectangle(boundsRect, {
        color: interactive ? "#1f78b4" : "#888",
        weight: interactive ? 1.5 : 0.8,
        fillColor: currentlyHasToken ? "orange" : "transparent",
        fillOpacity: currentlyHasToken ? 0.6 : 0.0,
        interactive: true,
      });

      rect.addTo(cellsLayer);

      // Popup content: deterministic info about this cell
      const popup = `<div>Cell <strong>${i},${j}</strong><br/>` +
        (currentlyHasToken
          ? `Token: <strong>${tokenValue}</strong>`
          : `Empty`) +
        (interactive
          ? `<br/><em>Within interaction range</em>`
          : `<br/><em>Too far</em>`) +
        `</div>`;

      rect.bindPopup(popup);

      // Click behavior: allow pickup and crafting when interactive
      rect.on("click", () => {
        if (hasWon) {
          rect.openPopup();
          return; // Disable interactions after winning
        }

        const clickKey = key;
        const crafted = craftedCells.get(clickKey);
        const initialHas = luck([i, j, "token"].toString()) < SPAWN_PROBABILITY;
        const initialVal = Math.floor(luck([i, j, "value"].toString()) * 100);
        const nowHas = crafted !== undefined
          ? true
          : (initialHas && !pickedUpCells.has(clickKey));
        const nowValue = crafted !== undefined
          ? crafted
          : (initialHas ? initialVal : null);

        if (!interactive) {
          rect.bindPopup(
            `<div>Cell <strong>${i},${j}</strong><br/>${
              nowHas ? `Token: <strong>${nowValue}</strong>` : `Empty`
            }<br/><em>Too far</em></div>`,
          );
          rect.openPopup();
          return;
        }

        // Pickup when not holding a token
        if (nowHas && !heldToken) {
          pickedUpCells.add(clickKey);
          heldToken = { value: nowValue as number };
          updateStatusPanel();
          checkWinCondition();

          // Re-draw cells so all visuals update immediately
          drawCellsInView();

          // Show popup at the cell center
          const center = cellBounds(CLASSROOM_LATLNG, i, j).getCenter();
          leaflet.popup()
            .setLatLng(center)
            .setContent(
              `<div>Cell <strong>${i},${j}</strong><br/>Picked up token: <strong>${nowValue}</strong></div>`,
            )
            .openOn(map);
          return;
        }

        // Crafting: place held token onto a cell that has a token of equal value
        if (heldToken && nowHas && nowValue === heldToken.value) {
          const newVal = heldToken.value * 2;
          pickedUpCells.add(clickKey);
          // Remove any crafted override for this cell (if present)
          craftedCells.delete(clickKey);

          // Player now holds the new doubled token
          heldToken = { value: newVal };
          updateStatusPanel();
          checkWinCondition();

          // Re-draw cells so the destination disappears immediately
          drawCellsInView();

          const center = cellBounds(CLASSROOM_LATLNG, i, j).getCenter();
          leaflet.popup()
            .setLatLng(center)
            .setContent(
              `<div>Cell <strong>${i},${j}</strong><br/>Combined and consumed — you now hold: <strong>${newVal}</strong></div>`,
            )
            .openOn(map);
          return;
        }

        // If holding a token and cannot craft here, notify player
        if (heldToken) {
          rect.bindPopup(
            `<div>Cell <strong>${i},${j}</strong><br/>${
              nowHas ? `Token: <strong>${nowValue}</strong><br/>` : `Empty<br/>`
            }<em>You are holding a token (${heldToken.value}). To craft, click a cell with an equal token.</em></div>`,
          );
          rect.openPopup();
          return;
        }

        rect.openPopup();
      });
    }
  }
}

// Draw cells initially and when the map is moved
drawCellsInView();
map.on("moveend", () => drawCellsInView());

// Also redraw if player marker is moved (future step)
export { drawCellsInView, map, playerMarker };
