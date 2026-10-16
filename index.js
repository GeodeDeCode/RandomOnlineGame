const http = require('http');

// 1. Create a basic web server so hosting platforms know your app is alive
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('The Matchmaking Server is Running!');
});

// 2. Attach Socket.io to allow instant, real-time communication
const io = require('socket.io')(server, {
    cors: { origin: "*" } // Allows players to connect from anywhere
});

let waitingPlayer = null;

// 3. Listen for people connecting to your server
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    if (!waitingPlayer) {
        // First person arrives: put them in the waiting room
        waitingPlayer = socket;
        socket.emit('status', 'Waiting for another person to join...');
    } else {
        // Second person arrives: grab the waiting person and pair them up!
        const player1 = waitingPlayer;
        const player2 = socket;
        waitingPlayer = null; // Empty the waiting room for the next pair

        // Create a unique, secret private room name for just these two players
        const roomName = `room-${player1.id}-${player2.id}`;
        player1.join(roomName);
        player2.join(roomName);

        // Tell both players they are successfully connected to each other
        player1.emit('connected', { role: 'player1', room: roomName });
        player2.emit('connected', { role: 'player2', room: roomName });

        // Pass real-time data or game moves directly between the two paired players
        player1.on('message', (data) => {
            player1.to(roomName).emit('message', data);
        });
        player2.on('message', (data) => {
            player2.to(roomName).emit('message', data);
        });
    }

    // Handle a player closing their browser tab or disconnecting
    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
        if (waitingPlayer === socket) {
            waitingPlayer = null; // Clear the waiting room if they left
        }
    });
});

// 4. Start the server on the correct port required by cloud hosts
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server is active on port ${PORT}`));
