const express = require('express');
const socketIO = require('socket.io');
const Game = require('./Game')
const PORT = process.env.PORT || 5000;

const server = express()
  .listen(PORT, () => console.log(`Listening on ${ PORT }`));

const io = socketIO(server);

let game = new Game();
game.resetReadyUsers(game.numOfReadyUsers);

io.on('connection', (socket) => {

  console.log('Socket id: ', socket.id)
  socket.emit('clientid', socket.id)

  io.emit('current-users', game.users)

  socket.emit('running-flag', game.runningFlag)

  socket.on('join-game', (user) => {
    game.addUser(user)
    io.emit('current-users', game.users)
  })

  socket.on('game-start', (status) => {
    console.log('GAME START')
    game.toggleFlag(status)
    io.emit('running-flag', game.runningFlag)
  })

  socket.on('game-end', (status) => {
    console.log('GAME END')
    game.toggleFlag(status)
    io.emit('running-flag', game.runningFlag)
  })

  socket.on('user-ready', (id, status) => {
    game.changeReadyStatus(id, status)
    io.emit('current-users', game.users)
    console.log('Number of Users Ready: ', game.numOfReadyUsers)

    let start = (num) => {
      if (num > 0) {
        io.emit('countdown-numbers', num)
      } else if (num === 0) {

        let sendOpponent = (oneUsername, oneId, twoUsername, twoId) => {

          console.log('')
          console.log(`****** EMIT opponent to: ${oneId} ******`)
          io.to(`${oneId}`).emit('your-opponent', twoUsername);
          io.to(`${oneId}`).emit('push-to-choice');
          io.to(oneId).emit('choice-countdown');

          console.log(`****** EMIT opponent to: ${twoId} ******`)
          console.log('')
          io.to(`${twoId}`).emit('your-opponent', oneUsername);
          io.to(`${twoId}`).emit('push-to-choice');
          io.to(twoId).emit('choice-countdown');
          
        } 

        let sendWait = (playerID) => {
          io.to(playerID).emit('waiting');
        }

        game.handlePairUp(game.users)
        game.vsStart(game.tournament, sendOpponent, sendWait)
      } else if (num === '') {
          io.emit('countdown-numbers', num)
      }
    }

    game.startCountdown(start)
  })

  socket.on('user-selection', (playerId, selection) => {
    game.changeSelection(playerId, selection)
  })

  socket.on('fight', () => {
    let checker = game.fightStopper(game.act);

    if (checker === false) {
      game.fight(io)

      console.log('')
      console.log('*****************************************************')
      console.log('********************** WINNERS **********************')
      console.log('*****************************************************')
      console.log('')
      console.log(game.winners)
      console.log('')
      console.log('*****************************************************')
      console.log('********************** LOSERS ***********************')
      console.log('*****************************************************')
      console.log('')
      console.log(game.losers)
      console.log('')
      console.log('*****************************************************')
      console.log('*****************************************************')
      console.log('')

      for (let i = 0; i < game.losers.length; i++) {
        let playerID = game.losers[i].id
        io.to(playerID).emit('you-lost');
      }

      if (game.winners.length === 1) {
        io.emit('game-over', game.winners[0].username)
        game.resetReadyUsers(game.numOfReadyUsers)
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
      }
    }
  })

  socket.on('disconnect', () => {
    let id = socket.id;
    game.removeUser(id);
    console.log('***** CURRENT USERS *****');
    console.log(game.users);
    console.log('***** USERS READY *****');
    console.log(game.numOfReadyUsers);
    io.emit('current-users', game.users);
  })

  socket.on('master-reset', () => {
    game.masterReset();
    console.log('Users on server after reset:', game.users);
    io.emit('reset-to-users');
  })
})