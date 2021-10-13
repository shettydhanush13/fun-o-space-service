var app = require('express')();
var http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: '*',
    }
});

http.listen(process.env.PORT || 8080);

const users = {}
  
io.on("connection", (socket) => {

  console.log('connected socket!', socket.id);
 
  // Joining room for conversation
  socket.on("join-room", async (room, username) => {
    users[socket.id] = username;
    await socket.join(room);
    const details = io.sockets.adapter.rooms.get(room);
    io.to(room).emit('room-details', { userMap: users, users : Array.from(details) })
  });

  // Joining room for conversation
  socket.on("leave-room", (room) => {
    socket.leave(room);
    socket.emit('room-left', room)
  });

  const updateScore = (score, role, value) => {
    switch (role) {
      case 'RAJA' : return score+1000
      case 'RANI' : return score+700
      case 'POLICE' : return value ? score+500 : score
      case 'KALLA' : return !value ? score+500 : score
    }
  }

  socket.on("guess-kalla", (value, room, gameRoles, scoreboard) => {
    const result = value ? 'success' : 'failure'
    const users = Object.keys(gameRoles)
    const newScore = {}
    for(const user of users){
      newScore[user] = updateScore(scoreboard[user], gameRoles[user], value)
    }
    const sortable = Object.fromEntries(
        Object.entries(newScore).sort(([,a],[,b]) => b-a)
    );
    io.to(room).emit('guess-result', result, sortable)
  });
  
  // Listen to NEW_MESSAGE for receiving new messages
  socket.on("new-message", (msg, room, user) => {
    io.to(room).emit("recieved-message", { user, msg });
  });

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array
  }

    // Listen to NEW_MESSAGE for receiving new messages
  socket.on("start-game", (room, users) => {
    const mapRoles = {}
    const shuffledRoles = shuffleArray(["RAJA", "RANI", "KALLA", "POLICE"])
    for(i in users) {
      mapRoles[users[i]] = shuffledRoles[i]
    }
    io.to(room).emit("game-started", mapRoles);
  });
 
  socket.on("disconnect", () => {
    console.log('disconnected');
    // io.to(roomId).emit("user disconnected", socket.userId);
  });

});