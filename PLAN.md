# PLAN.MD FOR CMPM-121 DEMO 3 PROJECT: Broken Token Hunter

## D3.A

Step 1 (Map): Assemble a map-based user interface using the Leaflet mapping framework

Goals:

- The player can see cells all the way to the edge of the map (i.e. if the player doesn’t scroll the map, they could believe that cells covered the entire world).
- The player can only interact with cells near them
- The initial state of cells is consistent across page load.

Step 2 (Inventory): Allow users to pick up tokens from cells

Goals:

- They can pick up at most one token, and picking it up removes it from the cell that contained it
- Make visible to the player whether they hold a token and if so, what value it has is clearly visible on the screen.

Step 3 (Crafting): Allow the player to place tokens onto a cell containing a token of equal value to produce a new token of double the value

Goals:

- The game detects when the player has a token of sufficient value in hand

## D3.B

Step 1 (Map Movement): Allow the player to traverse around the map

Goals:

- The player can move their character about the map or simply scroll the map without moving their character, seeing cells wherever they go.

- As the character moves, only the cells near to their current location are available for interaction.

- Cells should appear to be memoryless in the sense that they forget their state when they are no longer visible on the screen. As a result, the player should be able to farm tokens by moving into and out of the visibility range of a cell. (This behavior will be robustly fixed in the next assignment.)

Step 2 (Win Condition): Allow the player to collect tokens of high enough value to win (4096)

Goals:

- By practicing the collecting and crafting mechanics, the player can now craft a token a value higher than before, and the game now requires that threshold to be reached for victory to be declared

## D3.C

Requirements:

- Cells should appear to have a memory of their state that persists even when they are not visible on the map

- Cells should apply the Flyweight pattern or some similarly-effective memory-saving strategy so cells not visible on the map do not require memory for storage if they have not been modified by the player.

- Use the Memento pattern or some similarly-effective serialization strategy to preserve the state of modified cells when they scroll off-screen, and restore them when they return to view.

## D3.D

Step 1: Software Requirements

Goals:

- The browser geolocation API should be used to control player character movement instead of on-screen buttons.

- The implementation of the new player movement control system should be hidden behind an interface so that most of the game code does not depend on what moves the character. This implementation should embody the Facade design pattern.

- The browser localStorage API should be used to persist game state across page loads.

Step 2: Gameplay Requirements

Goals:

- The player can move their character by moving their device around the real world.

- Even if the player closes the game's page, they should be able to continue gameplay from the same state by simply opening the page again.

- The player needs some way to start a new game.

- The player needs some way to switch between button-based and geolocation-based movement. This can be a runtime control (e.g. an on-screen button) or something that is determined by looking at the page's query string (e.g. index.html?movement=geolocation versus index.html?movement=buttons)
