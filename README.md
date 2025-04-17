# Battleship

### Installation
```bash
cd client/battleship_client
npm install

cd ../../server
npm install
```

### Running the game

#### Starting the server:
```bash
node index.js
```

#### Starting the Web Client:
```bash
npm run dev
```

> ⚠️ **Warning:** If you’re encountering an error like
WebSocket error from client: Invalid WebSocket frame: RSV1 must be clear
on the server, and your client won’t connect properly, try changing the port number on both the server and client.
This issue often occurs on macOS, where a hidden system process may already be using port 8080, interfering with WebSocket traffic and causing unexpected errors. Switching to a different port, such as 8081 or 3000, typically resolves the problem.
