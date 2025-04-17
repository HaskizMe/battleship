<script>
  import { onMount } from "svelte";
  import './styles.css';


  let player = { number: null, isMyTurn: false};
  let gameState = null;
  let socket;

  let gridSize = 10;
  let cells = Array.from({ length: gridSize * gridSize }, (_, i) => i);

  // Tracks your clicks on the enemy board
  let enemyBoardStates = {}; // { index: 'hit' | 'miss' }

  // Tracks the opponent's hits/misses on your board
  let yourBoardStates = {}; // { index: 'hit' | 'miss' }
  let status = ''
  let currentPlayer = null;

  onMount(() => {
    socket = new WebSocket("ws://localhost:8080");

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // Called when the server sends a shipPlactement message and we flatten the array and store it in yourBoardStates
      if (data.type === 'shipPlacement') {
        // Flatten 2D board into yourBoardStates
        let flatBoard = {};
        gameState = data.gameState;
        data.message.forEach((row, rowIndex) => {
          row.forEach((cell, colIndex) => {
            const index = rowIndex * gridSize + colIndex;
            if (cell) {
              flatBoard[index] = cell; // You can also store `cell` to show ship type
            }
          });
        });
        yourBoardStates = { ...yourBoardStates, ...flatBoard };
      }
      // Called when ready or waiting message received from server 
      else if(["ready", "waiting"].includes(data.type)){
        gameState = data.gameState;
        status = data.message;
      }
      // Called when the server sends a message to welcome player 
      else if(data.type === "welcome"){
        gameState = data.gameState;
        player.number = data.player
      }
      // Start game logic 
      else if(data.type === "start"){
        gameState = data.gameState;
        status = data.message;
        // Checks to see who's turn it is
        if(player.number === data.currentPlayer){
          player.isMyTurn = true;
          status = "My Turn";
        } else {
          player.isMyTurn = false;
          status = "Waiting for other player";
        }
      } 
      // Response from server on the attack result
      else if (data.type === "attackResult") {
          // Player attacked was me
          if (data.player !== player.number) {
            yourBoardStates[data.position] = data.result;
            yourBoardStates = { ...yourBoardStates };
            player.isMyTurn = true;
            status = "My Turn";
          } 
          // Player attacking was me
          else {
            enemyBoardStates[data.position] = data.result;
            enemyBoardStates = { ...enemyBoardStates };
            status = "Other player's Turn";
            player.isMyTurn = false;
          }
        } else if(data.type === "gameOver"){
          gameState = data.gameState;
          status = data.message;
        }
        else if(data.type === "restart") {
          gameState = data.gameState;
          status = data.message;
        }
    };
  });

  function handleCellClick(index) {
    if(player.isMyTurn){
      if(enemyBoardStates[index] !== undefined){
        alert("You already attacked this cell!");
        return;
      }
      socket.send(JSON.stringify({ type: 'attack', index }));
    } else{
      alert("It's not your turn!");
    }
  }

  function handleStartGame() {
    if (Object.keys(yourBoardStates).length === 0) {
      alert("ERROR: Please setup your board before readying up. Press 'Randomize Ships' first");
    } else {
      socket.send(JSON.stringify({
        type: "ready",
        player: 1,
        message: true
      }));
    }
  }
  
  function handleRestart() {
    socket.send(JSON.stringify({
      type: "restart"
    }));
  }

  function handleBattleshipSetup(){
    // Reset board
    yourBoardStates = {};
    socket.send(JSON.stringify({
      type: "randomize"
    }));
  }
</script>


<h3>You're player {player.number}</h3>
<h1>{status}</h1>

<div class="board-wrapper">
  <!-- Enemy Board -->
  <div class="board">
    <h2>Enemy Board</h2>
    <div class="grid-with-labels">
      {#each Array(11) as _, rowIndex}
        {#each Array(11) as _, colIndex}
          {#if rowIndex === 0 && colIndex === 0}
            <div class="label empty"></div>
          {:else if rowIndex === 0}
            <div class="label column-label">{colIndex}</div>
          {:else if colIndex === 0}
            <div class="label row-label">{String.fromCharCode(64 + rowIndex)}</div>
          {:else}
            <button
              class="cell"
              type="button"
              style="padding: 30px"
              on:click={() => handleCellClick((rowIndex - 1) * 10 + (colIndex - 1))}
              class:hit={enemyBoardStates[(rowIndex - 1) * 10 + (colIndex - 1)] === 'hit'}
              class:miss={enemyBoardStates[(rowIndex - 1) * 10 + (colIndex - 1)] === 'miss'}
            >
              <!-- {(rowIndex - 1) * 10 + (colIndex - 1)} -->
            </button>
          {/if}
        {/each}
      {/each}
    </div>
  </div>

  <!-- Your Board -->
  <div class="board">
    <h2>Your Board</h2>
    <div class="grid-with-labels-your">
      {#each Array(11) as _, rowIndex}
        {#each Array(11) as _, colIndex}
          {#if rowIndex === 0 && colIndex === 0}
            <div class="label empty"></div>
          {:else if rowIndex === 0}
            <div class="label column-label">{colIndex}</div>
          {:else if colIndex === 0}
            <div class="label row-label">{String.fromCharCode(64 + rowIndex)}</div>
          {:else}
            <button
              class="cell-your"
              style="padding: 20px"
              type="button"
              disabled
              class:hit={yourBoardStates[(rowIndex - 1) * 10 + (colIndex - 1)] === 'hit'}
              class:miss={yourBoardStates[(rowIndex - 1) * 10 + (colIndex - 1)] === 'miss'}
              class:carrier={yourBoardStates[(rowIndex - 1) * 10 + (colIndex - 1)] === 'Carrier'}
              class:destroyer={yourBoardStates[(rowIndex - 1) * 10 + (colIndex - 1)] === 'Destroyer'}
              class:battleship={yourBoardStates[(rowIndex - 1) * 10 + (colIndex - 1)] === 'Battleship'}
              class:submarine={yourBoardStates[(rowIndex - 1) * 10 + (colIndex - 1)] === 'Submarine'}
              class:cruiser={yourBoardStates[(rowIndex - 1) * 10 + (colIndex - 1)] === 'Cruiser'}
            >
              <!-- {(rowIndex - 1) * 10 + (colIndex - 1)} -->
            </button>
          {/if}
        {/each}
      {/each}
    </div>
    {#if gameState === "waiting"}
      <button class="randomize-btn" on:click={() => handleBattleshipSetup()}>Randomize Ships</button>
    {/if}
  </div>
</div>

{#if gameState === "waiting"}
  <button class="start-game-btn" on:click={() => handleStartGame()}>
    Start Game
  </button>
{:else if gameState === "gameOver"}
  <button class="start-game-btn" on:click={() => handleRestart()}>
    Play Again
  </button>
{/if}