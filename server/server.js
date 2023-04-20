const io = require('socket.io')();
const { FRAME_RATE } = require('./constants');
const {gameLoop,getUpdatedVelocity,initGame} = require('./game');
const { makeid } = require('./utils');

const state = {};
const clientRooms = {};


io.on('connection', client =>{

    client.on('keydown', handleKeydown);
    client.on('newGame', handleNewGame);
    client.on('joinGame', handleJoinGame);

    function handleJoinGame(gameCode) {
        const room = io.sockets.adapter.rooms[gameCode];
    
        let allUsers;
        if (room) {
          allUsers = room.sockets;
        }
    
        let numClients = 0;
        if (allUsers) {
          numClients = Object.keys(allUsers).length;
        }
    
        if (numClients === 0) {
          client.emit('unknownGame');
          return;
        } else if (numClients > 1) {
          client.emit('tooManyPlayers');
          return;
        }
    
        clientRooms[client.id] = gameCode;
    
        client.join(gameCode);
        client.number = 2;
        client.emit('init', 2);
        
        startGameInterval(gameCode);
    }

    function handleNewGame() {
        let roomName = makeid(5);
        clientRooms[client.id] = roomName;
        client.emit('gameCode', roomName);
    
        state[roomName] = initGame();
    
        client.join(roomName);
        client.number = 1;
        client.emit('init', 1);
    }

    function handleKeydown(keyCode) {
        const roomName = clientRooms[client.id];
        if (!roomName) {
          return;
        }
        try {
          keyCode = parseInt(keyCode);
        } catch(e) {
          console.error(e);
          return;
        }
    
        const vel = getUpdatedVelocity(keyCode);
    
        if (vel) {
          state[roomName].players[client.number - 1].vel = vel;
        }
      }
    });

function startGameInterval(roomName) {
    const intervalId = setInterval(() => {
        const winner = gameLoop(state[roomName]);

        if(!winner){
            emitGameState(roomName, state[roomName])
        } else{
            emitGameOver(roomName, winner);
            state[roomName] = null;
            clearInterval(intervalId);
        }
    }, 1000/ FRAME_RATE);
}

function emitGameState(roomName, gameState) {
    // Send this event to everyone in the room.
    io.sockets.in(roomName)
      .emit('gameState', JSON.stringify(gameState));
}

function emitGameOver(roomName, winner) {
    io.sockets.in(roomName)
      .emit('gameOver', JSON.stringify({ winner }));
}


io.listen(3000, () => {
    console.log('[socket.io] listening on port 3000')
})

