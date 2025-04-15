<script>
  import { onMount } from "svelte";

  let player = { number: null, isMyTurn: false};
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
      console.log("Message from server:", data);

      if (data.type === 'shipPlacement') {
        // Flatten 2D board into yourBoardStates
        let flatBoard = {};
        data.message.forEach((row, rowIndex) => {
          row.forEach((cell, colIndex) => {
            const index = rowIndex * gridSize + colIndex;
            if (cell) {
              flatBoard[index] = 'ship'; // You can also store `cell` to show ship type
            }
          });
        });
        yourBoardStates = { ...yourBoardStates, ...flatBoard };
      } else if(["ready", "waiting"].includes(data.type)){
        status = data.message;
      } else if(data.type === "welcome"){
        player.number = data.player
      } else if(data.type === "start"){
        status = data.message;
        if(player.number === data.currentPlayer){
          player.isMyTurn = true;
          status = "My Turn";
        } else {
          player.isMyTurn = false;
          status = "Waiting for other player";
        }
      }

      // Handle other messages like hits/misses/etc. here
    };
  });

  function handleEnemyCellClick(index) {
    // Simulate hit/miss for now (replace with real logic later)
    enemyBoardStates[index] = index % 2 === 0 ? 'hit' : 'miss';
    enemyBoardStates = { ...enemyBoardStates };

    // Optionally send to server
    // socket.send(JSON.stringify({ type: 'attack', index }));
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

  function handleBattleshipSetup(){
    yourBoardStates = {};
    socket.send(JSON.stringify({
      type: "randomize"
    }));
  }
</script>

<h3>You're player {player.number}</h3>
<h1>{status}</h1>
<div class="board-wrapper">
  <div class="board">
    <h2>Enemy Board</h2>
    <div class="grid">
      {#each cells as cell, index}
        <button
          class="cell"
          type="button"
          on:click={() => handleEnemyCellClick(index)}
          class:hit={enemyBoardStates[index] === 'hit'}
          class:miss={enemyBoardStates[index] === 'miss'}
        >
          {index}
        </button>
      {/each}
    </div>
  </div>

  <div class="board">
    <h2>Your Board</h2>
    <div class="grid-your-board">
      {#each cells as cell, index}
      <button
        class="cell-your"
        type="button"
        disabled
        class:hit={yourBoardStates[index] === 'hit'}
        class:miss={yourBoardStates[index] === 'miss'}
        class:ship={yourBoardStates[index] === 'ship'}
      >
        {index}
      </button>
      {/each}
    </div>
    <button class="randomize-btn" on:click={() => handleBattleshipSetup()}>Randomize Ships</button>
  </div>
</div>
<button class="start-game-btn" on:click={() => handleStartGame()}>Start Game</button>


<style>
  .board-wrapper {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 40px;
    margin-top: 20px;
    padding: 20px;
  }

  .board h2 {
    margin: 0 0 10px 0;
    font-size: 20px;
    text-align: center;
    color: white;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(10, 60px);
    grid-template-rows: repeat(10, 60px);
    gap: 4px;
  }

  .grid-your-board {
    display: grid;
    grid-template-columns: repeat(10, 40px);
    grid-template-rows: repeat(10, 40px);
    gap: 4px;
  }

  .randomize-btn{
    margin: 10px;
    background-color: #c81b0f;
  }

  .start-game-btn{
    width: 200px;
    height: 60px;
    background-color: green;
  }

  .randomize-btn:hover{
    border-color: white;
  }

  .cell,
  .cell-your {
    background-color: #1e90ff;
    color: white;
    display: flex;
    justify-content: center;
    align-items: center;
    border: 1px solid #333;
    cursor: pointer;
    font-size: 14px;
    padding: 0;
    margin: 0;
  }

  .cell-your.ship {
    background-color: #2f4f4f; /* dark gray to show ships */
  }

  .cell:disabled,
  .cell-your:disabled {
    cursor: not-allowed;
  }

  .cell:hover {
    background-color: #4682b4;
  }

  .cell.hit,
  .cell-your.hit {
    background-color: #ff4c4c; /* red = hit */
  }

  .cell.miss,
  .cell-your.miss {
    background-color: #626762; /* grey = miss */
  }
</style>