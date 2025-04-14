let gameState = {
    currentTurn: "",
    players: []
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
            board[r][c] = ship.name[0]; // Use first letter
        }

        placed = true;
        }
    }

    return board;
}

function sendMessageToAll(webSocketServer, message) {
    webSocketServer.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: "broadcast",
            message: `${message}`
          }));
        }
      });
}

function sendMessageToPlayer(webSocket, type, message){
    webSocket.send(JSON.stringify({
        type: type,
        message: message
    }));
}

const WebSocket = require("ws");

// Create WebSocket server on port 8080
const wss = new WebSocket.Server({ port: 8080 });

console.log("WebSocket server is running on ws://localhost:8080");

wss.on("connection", (ws) => {
    if (gameState.players.length < 2) {
        const playerNum = gameState.players.length + 1;

        gameState.players.push({
            playerNumber: playerNum,
            ws: ws
        });

        console.log(`Player: ${playerNum} connected`);

        sendMessageToPlayer(ws, "welcome", `Welcome ${playerNum}`);

        if (gameState.players.length === 2) {
            sendMessageToAll(wss, "Game ready to start!");
        } else {
            sendMessageToPlayer(ws, "waiting", "Waiting for 1 more player...");
        }

    } else {
        ws.send(JSON.stringify({ type: "error", message: "Game is full" }));
        ws.close();
    }

    // This is called when a message is received
    ws.on("message", (message) => {
        const sender = gameState.players.find(p => p.ws === ws);
        const recipient = gameState.players.find(p => p.ws !== ws);
        sendMessageToPlayer(recipient.ws, "message", message);


        try {
            const data = JSON.parse(message);
        
            if (data.type === "randomize") {
              console.log(`Randomizing ships for Player ${sender.playerNumber}`);
              const shipPlacement = generateRandomShipBoard();
              sender.shipBoard = shipPlacement;
        
              // Optionally send back confirmation
              sendMessageToPlayer(ws, "shipPlacement", shipPlacement);
            }
        
            // Add other message types here...
        
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
});