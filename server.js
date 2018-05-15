const io = require('socket.io')();
const Game = require('./Game')
const port = 8000;

// console.log(`#########################`)
// console.log(`##########`)
// console.log(`#########################`)


let game = new Game();

io.on('connection', (socket) => {

  console.log('Socket id: ',socket.id)
  io.emit('current-users', game.users)
  socket.emit('clientid', socket.id)
  
  socket.on('join-game', (user) => { 
    game.addUser(user)
    io.emit('current-users', game.users)
  })

  socket.on('user-ready', (id, status) => {
    game.changeReadyStatus(id, status)
    io.emit('current-users', game.users)

    let start = (num) => {
      if ( num > 0) {
        io.emit('countdown-numbers', num)
        } 
        else if (num === 0) {

          let sendOpponent = (oneUsername, oneId, twoUsername, twoId) => {
            
            console.log(`******Emiting your-opponent to: ${oneId}******`)
            io.to(`${oneId}`).emit('your-opponent', twoUsername);
            io.to(`${oneId}`).emit('push-to-choice');
            io.to(oneId).emit('choice-countdown');

            console.log(`******Emiting your-opponent to: ${twoId}******`)
            io.to(`${twoId}`).emit('your-opponent', oneUsername);
            io.to(`${twoId}`).emit('push-to-choice');
            io.to(twoId).emit('choice-countdown');
          }

          let sendWait = (playerID) => {
            io.to(playerID).emit('waiting');
          }

          game.handlePairUp(game.users)
          game.vsStart(game.tournament, sendOpponent, sendWait)

        }
       }

    game.startCountdown(start)
    })

  socket.on('user-selection', (playerId, selection) => {
    game.changeSelection(playerId, selection)
})

  socket.on('fight', () => {
    let checker = game.fightStopper();

    if (checker === false) {    
      game.fight()
      console.log('************')
      console.log(`WINNERS:`, game.winners)
      console.log(`LOSERS:`, game.losers)
      console.log('************')

      for (let i = 0; i < game.losers.length; i++) {
        let playerID = game.losers[i].id
        io.to(playerID).emit('you-lost');
      }

      if (game.winners.length === 1) {
        // console.log('***** game over *****')
        io.emit('game-over', game.winners[0].username)
      } else {
        for (let i = 0; i < game.winners.length; i++) {
          let playerID = game.winners[i].id
          if (game.winners[i].status === 'waiting') {
            io.to(playerID).emit('wait-continue', 'wait-continue');
          } else {
            io.to(playerID).emit('you-won-round');
          }
        } 

        let sendOpponent = (oneUsername, oneId, twoUsername, twoId) => {
              
          console.log(`******Emiting your-opponent to: ${oneId}******`)
          io.to(`${oneId}`).emit('your-opponent', twoUsername);
          io.to(`${oneId}`).emit('push-to-choice');
          io.to(oneId).emit('choice-countdown');
    
          console.log(`******Emiting your-opponent to: ${twoId}******`)
          io.to(`${twoId}`).emit('your-opponent', oneUsername);
          io.to(`${twoId}`).emit('push-to-choice');
          io.to(twoId).emit('choice-countdown');
        }
    
        let sendWait = (playerID) => {
          io.to(playerID).emit('waiting');
        }

        game.handlePairUp(game.winners)
        game.vsStart(game.tournament, sendOpponent, sendWait)
        setTimeout(() => {
          game.fightResetter(game.act);
        },4000)
    }
}
}
)

  socket.on('disconnect', () => {
    game.removeUser(socket.id)
    io.emit('current-users', game.users)
  })

  socket.on('master-reset', () => {
    game.masterReset();
    console.log('users on server after reset:', game.users)
    io.emit('reset-to-users')
  })
})

io.listen(port);
console.log('Listening on port ', port);