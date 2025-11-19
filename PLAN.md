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
