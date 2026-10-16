const http = require('http');
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Multiplayer Room Server Running!');
});

const io = require('socket.io')(server, {
    cors: { origin: "*" }
});

// Track up to 5 connected entities globally
let players = {}; 
const MAX_PLAYERS = 5;

// Keep track of which player numbers (1-5) are taken
let availableNumbers = [1,2,3,4,5]

io.on('connection', (socket) => {
    console.log('User joined:', socket.id);

    // If lobby is entirely full, reject entry
    if (Object.keys(players).length >= MAX_PLAYERS) {
        socket.emit('lobbyFull');
        socket.disconnect();
        return;
    }

    // Sort numbers so we always hand out the lowest free slot (P1, then P2, etc.)
    availableNumbers.sort((a, b) => a - b);
    const assignedNumber = availableNumbers.shift(); 

    // Register player structure with dynamic spawn placements
    players[socket.id] = {
        id: socket.id,
        playerNumber: assignedNumber,
        x: 100 + (assignedNumber * 50), // Spawns squares separated out lineally
        y: 250
    };

    // Broadcast updated dictionary mapping state to all browsers in lobby
    io.emit('lobbyUpdate', players);

    // Listen for movement sync signals
    socket.on('move', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            // Broadcast location to everyone else
            socket.broadcast.emit('playerMoved', {
                id: socket.id,
                x: data.x,
                y: data.y
            });
        }
    });

    // Cleanup states on browser dropouts
    socket.on('disconnect', () => {
        console.log('User left:', socket.id);
        if (players[socket.id]) {
            // Put their player number back into the pool for reuse
            availableNumbers.push(players[socket.id].playerNumber);
            delete players[socket.id];
        }
        io.emit('playerLeft', socket.id);
        io.emit('lobbyUpdate', players); // Send fresh lobby state
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server online on port ${PORT}`));
