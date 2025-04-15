let gameState = {
    currentPlayer: null,
    players: [],
    gameStatus: "waiting",
}

function generateRandomShipBoard() {
    const gridSize = 10;
    const board = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));

    const ships = [
        { name: "Carrier", size: 5 },
        { name: "Battleship", size: 4 },
        { name: "Cruiser", size: 3 },
        { name: "Submarine", size: 3 },
        { name: "Destroyer", size: 2 }
    ];

    for (const ship of ships) {
        let placed = false;

        while (!placed) {
        const isHorizontal = Math.random() < 0.5;
        const row = Math.floor(Math.random() * gridSize);
        const col = Math.floor(Math.random() * gridSize);

        const fits = isHorizontal
            ? col + ship.size <= gridSize
            : row + ship.size <= gridSize;

        if (!fits) continue;

        // Check if space is free
        let collision = false;
        for (let i = 0; i < ship.size; i++) {
            const r = row + (isHorizontal ? 0 : i);
            const c = col + (isHorizontal ? i : 0);
            if (board[r][c] !== null) {
            collision = true;
            break;
            }
        }

        if (collision) continue;

        // Place the ship
        for (let i = 0; i < ship.size; i++) {
            const r = row + (isHorizontal ? 0 : i);
            const c = col + (isHorizontal ? i : 0);
            board[r][c] = ship.name; // Use first letter
        }

        placed = true;
        }
    }

    return board;
}


function handleRandomizeBoard(ws, sender) {
  console.log(`Randomizing ships for Player ${sender.playerNumber}`);
  const shipPlacement = generateRandomShipBoard();
  sender.shipBoard = shipPlacement;

  gameState.gameStatus = "waiting";
  sendMessageToPlayer({
    ws: ws,
    gameState: gameState.gameStatus,
    type: "shipPlacement",
    message: shipPlacement,
  });

  //console.log(`Ship placement for Player ${sender.playerNumber}:`, shipPlacement);
}

function handleReadyUp(ws, sender, recipient) {
  gameState.gameStatus = "waiting";
  sender.ready = true;

  sendMessageToPlayer({
    ws: ws,
    type: "ready",
    gameState: gameState.gameStatus,
    message: `Waiting for player ${recipient.playerNumber}...`
  });

  // Both players are ready
  if (sender.ready && recipient?.ready) {
    gameState.gameStatus = "playing";
    const startingPlayerNumber = Math.random() < 0.5 ? 1 : 2;
    gameState.currentPlayer = startingPlayerNumber;

    sendMessageToAll({
      webSocketServer: wss,
      type: "start",
      gameState: gameState.gameStatus,
      message: `Game ready to start! Player ${startingPlayerNumber} goes first.`,
      currentPlayer: startingPlayerNumber
    });
  }
}

function checkAllShipsSunk(board) {
  for (let row of board) {
    for (let cell of row) {
      if (cell !== null && cell !== "X") {
        return false; // still some un-hit ships
      }
    }
  }
  return true; // all ships are hit
}

function handleAttack(ws, sender, recipient, data) {
  gameState.gameStatus = "playing";

  const index = data.index;
  const row = Math.floor(index / 10);
  const col = index % 10;

  console.log(`Player ${sender.playerNumber} attacked (${row}, ${col})`);

  const targetCell = recipient.shipBoard?.[row]?.[col];
  const isHit = targetCell !== null;

  // Optional: mark the board visually (but preserve the ship type)
  if (isHit) {
    recipient.shipBoard[row][col] = "X";
  }

  // Send hit/miss result to both clients
  sendMessageToAll({
    webSocketServer: wss,
    type: "attackResult",
    position: index,
    gameState: gameState.gameStatus,
    result: isHit ? "hit" : "miss",
    player: sender.playerNumber
  });

  console.log(`Attack result: ${isHit ? "Hit!" : "Miss."} (${targetCell})`);

  // After attack, check for win
  if (checkAllShipsSunk(recipient.shipBoard)) {
    gameState.gameStatus = "gameOver";

    sendMessageToAll({
      webSocketServer: wss,
      type: "gameOver",
      gameState: gameState.gameStatus,
      message: `Player ${sender.playerNumber} wins!`,
      winner: sender.playerNumber
    });

    console.log(`Player ${sender.playerNumber} wins!`);

    // Optionally reset gameState here
  }
}

function restartGame(ws) {
  console.log("Restarting game...");

  // Reset game state
  gameState = {
    currentPlayer: null,
    players: [],
    gameStatus: "waiting",
  };

  // Notify all clients to reset their game state
  sendMessageToAll({
    webSocketServer: wss,
    type: "restart",
    message: "Game has been restarted. Reload to play again.",
    gameState: gameState.gameStatus,
  });
}


function sendMessageToAll({ webSocketServer, ...payload }) {
    webSocketServer.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(payload));
        }
      });
}

function sendMessageToPlayer({ ws, ...payload }) {
    ws.send(JSON.stringify(payload));
  }

const WebSocket = require("ws");

// Create WebSocket server on port 8080
const wss = new WebSocket.Server({ port: 8080, perMessageDeflate: false });

console.log("WebSocket server is running on ws://localhost:8080");

wss.on("connection", (ws) => {
    if (gameState.players.length < 2) {
        const usedNumbers = gameState.players.map(p => p.playerNumber);
        const availableNumbers = [1, 2].filter(n => !usedNumbers.includes(n));
        const playerNum = availableNumbers[0];
    
        gameState.players.push({
          playerNumber: playerNum,
          ready: false,
          ws: ws
        });
    
        console.log(`Player: ${playerNum} connected`);
        gameState.gameStatus = "waiting";

        sendMessageToPlayer({
          ws: ws,
          type: "welcome",
          gameState: gameState.gameStatus,
          message: `You're player ${playerNum}`,
          player: playerNum,
        });
    
        if (gameState.players.length === 2) {
          sendMessageToAll({
            webSocketServer: wss,
            gameState: gameState.gameStatus,
            type: "ready",
            message: "Ready up"
          });
        } else {
          sendMessageToPlayer({
            ws: ws,
            type: "waiting",
            gameState: gameState.gameStatus,
            message: "Waiting for 1 more player...",
          });
        }
      } else {
        ws.send(JSON.stringify({ type: "error", message: "Game is full" }));
        ws.close();
      }

    // This is called when a message is received
    ws.on("message", (message) => {
      try {
        const sender = gameState.players.find(p => p.ws === ws);
        const recipient = gameState.players.find(p => p.ws !== ws);
        const data = JSON.parse(message);
    
        switch (data.type) {
          case "randomize":
            handleRandomizeBoard(ws, sender);
            break;
    
          case "ready":
            handleReadyUp(ws, sender, recipient);
            break;
    
          case "attack":
            handleAttack(ws, sender, recipient, data);
            break;
          case "restart":
            restartGame(ws);
            break;
    
          default:
            console.warn("Unhandled message type:", data.type);
        }
    
      } catch (err) {
        console.error("Invalid message received:", message);
      }

    });

    ws.on("close", () => {
        const index = gameState.players.findIndex(p => p.ws === ws);
        if (index !== -1) {
            console.log(`${gameState.players[index].playerNumber} disconnected`);
            gameState.players.splice(index, 1);
        }
    });

    ws.on("error", (err) => {
      console.error("WebSocket error from client:", err.message);
    });
});