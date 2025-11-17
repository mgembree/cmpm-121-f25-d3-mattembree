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
