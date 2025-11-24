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

// D3.D: Add game controls
const gameControlsDiv = document.createElement("div");
gameControlsDiv.innerHTML = `
  <button id="toggleMovement">Switch to Geolocation</button>
  <button id="resetGame">🔄 New Game</button>
`;
controlPanelDiv.append(gameControlsDiv);

// Add movement buttons to control panel
const movementDiv = document.createElement("div");
movementDiv.id = "movementButtons";
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

// D3.C: Persistent cell state storage using Flyweight and Memento patterns
// Only modified cells are stored in memory; unmodified cells use deterministic RNG
interface CellState {
  hasToken: boolean;
  tokenValue: number | null;
}

// Memento: Map stores only cells that have been modified by player actions
// Key format: "i,j" coordinates
const cellStateMemory = new Map<string, CellState>();

// D3.D: Facade Pattern - Movement Control Interface
interface MovementController {
  start(): void;
  stop(): void;
  getName(): string;
}

class ButtonMovementController implements MovementController {
  getName(): string {
    return "Buttons";
  }

  start(): void {
    document.getElementById("movementButtons")!.style.display = "block";
  }

  stop(): void {
    document.getElementById("movementButtons")!.style.display = "none";
  }
}

class GeolocationMovementController implements MovementController {
  private watchId: number | null = null;
  private lastLat: number | null = null;
  private lastLng: number | null = null;

  getName(): string {
    return "Geolocation";
  }

  start(): void {
    document.getElementById("movementButtons")!.style.display = "none";

    if ("geolocation" in navigator) {
      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLat = position.coords.latitude;
          const newLng = position.coords.longitude;

          // Only update if position changed significantly
          if (
            this.lastLat === null || this.lastLng === null ||
            Math.abs(newLat - this.lastLat) > 0.00001 ||
            Math.abs(newLng - this.lastLng) > 0.00001
          ) {
            this.lastLat = newLat;
            this.lastLng = newLng;

            const newPos = leaflet.latLng(newLat, newLng);
            playerMarker.setLatLng(newPos);
            map.panTo(newPos);
            drawCellsInView();
            saveGameState();
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          alert("Unable to access geolocation. Switching to button mode.");
          toggleMovementMode();
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 5000,
        },
      );
    } else {
      alert("Geolocation not supported. Using button mode.");
      toggleMovementMode();
    }
  }

  stop(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }
}

let currentController: MovementController = new ButtonMovementController();
let isGeolocationMode = false;

function toggleMovementMode() {
  currentController.stop();
  isGeolocationMode = !isGeolocationMode;

  if (isGeolocationMode) {
    currentController = new GeolocationMovementController();
    document.getElementById("toggleMovement")!.textContent =
      "Switch to Buttons";
  } else {
    currentController = new ButtonMovementController();
    document.getElementById("toggleMovement")!.textContent =
      "Switch to Geolocation";
  }

  currentController.start();
  localStorage.setItem(
    "movementMode",
    isGeolocationMode ? "geolocation" : "buttons",
  );
}

// D3.D: LocalStorage Persistence
const STORAGE_KEY = "brokenTokenHunterState";

interface GameState {
  playerLat: number;
  playerLng: number;
  heldToken: HeldToken;
  cellStates: Array<[string, CellState]>;
  hasWon: boolean;
  movementMode: string;
}

function saveGameState() {
  const pos = playerMarker.getLatLng();
  const state: GameState = {
    playerLat: pos.lat,
    playerLng: pos.lng,
    heldToken: heldToken,
    cellStates: Array.from(cellStateMemory.entries()),
    hasWon: hasWon,
    movementMode: isGeolocationMode ? "geolocation" : "buttons",
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadGameState(): boolean {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return false;

  try {
    const state: GameState = JSON.parse(saved);

    // Restore player position
    const pos = leaflet.latLng(state.playerLat, state.playerLng);
    playerMarker.setLatLng(pos);
    map.setView(pos, MAP_ZOOM);

    // Restore held token
    heldToken = state.heldToken;

    // Restore cell states
    cellStateMemory.clear();
    state.cellStates.forEach(([key, cellState]) => {
      cellStateMemory.set(key, cellState);
    });

    // Restore win state
    hasWon = state.hasWon;

    // Restore movement mode
    if (state.movementMode === "geolocation" && !isGeolocationMode) {
      toggleMovementMode();
    }

    return true;
  } catch (e) {
    console.error("Failed to load game state:", e);
    return false;
  }
}

function resetGame() {
  if (confirm("Start a new game? This will erase your current progress.")) {
    localStorage.removeItem(STORAGE_KEY);
    heldToken = null;
    cellStateMemory.clear();
    hasWon = false;
    playerMarker.setLatLng(CLASSROOM_LATLNG);
    map.setView(CLASSROOM_LATLNG, MAP_ZOOM);
    updateStatusPanel();
    drawCellsInView();
  }
}

// Win condition
const WIN_THRESHOLD = 256;
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

  // D3.C: No cleanup - cells persist in memory
  // Redraw cells with updated interaction radius around new position
  drawCellsInView();

  // D3.D: Save state after movement
  saveGameState();
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
  saveGameState();
});

// D3.D: Wire up new game controls
document.getElementById("toggleMovement")!.addEventListener(
  "click",
  toggleMovementMode,
);
document.getElementById("resetGame")!.addEventListener("click", resetGame);

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

      // D3.C: Check if cell has persistent state (Memento pattern)
      const savedState = cellStateMemory.get(key);

      let currentlyHasToken: boolean;
      let tokenValue: number | null;

      if (savedState !== undefined) {
        // Cell has been modified - restore from memory
        currentlyHasToken = savedState.hasToken;
        tokenValue = savedState.tokenValue;
      } else {
        // Cell is unmodified - use Flyweight pattern (deterministic RNG)
        currentlyHasToken =
          luck([i, j, "token"].toString()) < SPAWN_PROBABILITY;
        if (currentlyHasToken) {
          tokenValue = Math.floor(luck([i, j, "value"].toString()) * 100);
        } else {
          tokenValue = null;
        }
      }

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

        // D3.C: Get current cell state from memory or deterministic RNG
        const savedState = cellStateMemory.get(clickKey);
        let nowHas: boolean;
        let nowValue: number | null;

        if (savedState !== undefined) {
          nowHas = savedState.hasToken;
          nowValue = savedState.tokenValue;
        } else {
          nowHas = luck([i, j, "token"].toString()) < SPAWN_PROBABILITY;
          nowValue = nowHas
            ? Math.floor(luck([i, j, "value"].toString()) * 100)
            : null;
        }

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
          // D3.C: Save cell state to memory (Memento pattern)
          cellStateMemory.set(clickKey, { hasToken: false, tokenValue: null });

          heldToken = { value: nowValue as number };
          updateStatusPanel();
          checkWinCondition();

          // Re-draw cells so all visuals update immediately
          drawCellsInView();

          // D3.D: Save state after pickup
          saveGameState();

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

          // D3.C: Save cell state to memory - cell is now empty after crafting
          cellStateMemory.set(clickKey, { hasToken: false, tokenValue: null });

          // Player now holds the new doubled token
          heldToken = { value: newVal };
          updateStatusPanel();
          checkWinCondition();

          // Re-draw cells so the destination disappears immediately
          drawCellsInView();

          // D3.D: Save state after crafting
          saveGameState();

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
// D3.D: Load saved state on startup
const loadedState = loadGameState();
if (loadedState) {
  updateStatusPanel();
}
drawCellsInView();
map.on("moveend", () => drawCellsInView());

// D3.D: Start the movement controller
currentController.start();

// Also redraw if player marker is moved (future step)
export { drawCellsInView, map, playerMarker };
