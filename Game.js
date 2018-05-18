class Game {
    constructor() {
    this.users = [],
    this.tournament = [],
    this.winners = [],
    this.losers = [],
    this.interval = null,
    this.numOfReadyUsers = 0,
    this.act = 0,
    this.runningFlag = false
    }

    toggleFlag(status) {
        // console.log('toggleFlag()', status)
        this.runningFlag = status;
        // console.log('after status change', this.runningFlag)
    }

    resetReadyUsers(numOfReadyUsers) {
        this.numOfReadyUsers = 0;
    }

    fightStopper() {
        // console.log('fightStopper()', this.act)
        if(this.act === 0) {
            this.act++
            return false
        } else {
            setTimeout(() => {
                // console.log('timeout')
                this.act = 0;
              }, 2000)
            return true
        }
    }

    masterReset() {
        this.users = [];
        this.tournament = [];
        this.winners = [];
        this.interval = null;
        this.numOfReadyUsers = 0;
        this.runningFlag = false;
    }

    addUser(user) {
        let newUsers = this.users.slice();
        newUsers.push(user)
        this.users = newUsers;
        // console.log('addUser:',this.users)
    }

    removeUser(id) {
        console.log(`Disconnected ${id}`)
        
        let leavingUser = this.users.filter( user => user.id === id)

        if (leavingUser[0]) {

            if (leavingUser[0].ready === true) {
                console.log('User Found and Ready - Removing from Server')
                if(this.numOfReadyUsers === 0){
                    let removedUser = this.users.filter( user => user.id !== id)
                    this.users = removedUser;
                } else {
                    this.numOfReadyUsers = this.numOfReadyUsers - 1;
                    let removedUser = this.users.filter( user => user.id !== id)
                    this.users = removedUser;
            }
            } else if (leavingUser[0].ready === false){
                console.log('User Found and Not Ready - Removing from Server')
                let removedUser = this.users.filter( user => user.id !== id)
                this.users = removedUser;
            }

        } else {
            console.log('No User Found to Remove')
            // let removedUser = this.users.filter( user => user.id !== id)
            // this.users = removedUser;
        }
    }

    changeReadyStatus(id, status) {
        let newUsers = this.users.slice();
        let theuser = newUsers.find((user) => user.id === id)
        theuser.ready = status;
        this.users = newUsers;
        if(status === true) {
            this.numOfReadyUsers = this.numOfReadyUsers + 1;
          } else {
            this.numOfReadyUsers = this.numOfReadyUsers - 1;
          }
    }

    changeStatus(id, status, io) {
        console.log('changing status', id)
        let newUsers = this.users.slice();
        let theuser = newUsers.find((user) => user.id === id)
        theuser.status = status;
        this.users = newUsers;
        io.emit('current-users', this.users)
        console.log(this.users)
    }

    changeSelection(id, selection) {
        let newUsers = this.users.slice();
        let theuser = newUsers.find((user) => user.id === id)
        theuser.selection = selection;
        this.users = newUsers;
        // console.log('users after selection', this.users)
    }

    startCountdown(start) {
            if(this.numOfReadyUsers === this.users.length){
            //   console.log('all users ready')
              this.countDown(start, true)
            }
            else {
            //   console.log('users are not ready')
              this.countDown(start, false)
            }
    }

    countDown(start, status) {
        // console.log('status', status)
        let num = 5;
        if (status === true) {
          this.interval = setInterval( () => {
            if (num >= 0) {
                start(num);
                num--;
              } 
            }, 1000)
        } else if (status === false) { 
          start('');
          clearInterval(this.interval)

          }
      }

    handlePairUp(users) {
        let newUsers = users.slice();
        let arr = [];
        let i = 0;
        while ((newUsers[0]) && (newUsers[1])) {
            // newUsers[0].status = 'fight';
            // newUsers[1].status = 'fight';
            arr[i] = [newUsers[0], newUsers[1]];
            newUsers.splice(0,1);
            newUsers.splice(0,1);
            i++;
        }
        if (newUsers[0]) {
            if (newUsers[0].status === 'winner') {
                console.log(`${newUsers[0].username} is the winner!`);
            } else {
                newUsers[0].status = 'waiting';
                arr[i] = [newUsers[0]];
            }
        }
        
        this.tournament = arr.slice();
        this.winners = [];
        console.log('*********************')
        console.log('****** this.tournament at end of handle pairup ******')
        console.log(this.tournament)
        console.log('*********************')

    };

    vsStart(tournament, sendOpponent, sendWait, sendWin) {
        for (let i = 0 ; i < tournament.length; i++) {
            if (tournament[i].length === 2) {
                // console.log(`${tournament[i][0].username} VS ${tournament[i][1].username}`)
                sendOpponent(tournament[i][0].username, tournament[i][0].id, tournament[i][1].username, tournament[i][1].id)
                } 
            else if (tournament[i].length === 1) {
                if(tournament[i][0].status === "waiting") {
                    // console.log('waiting', tournament[i][0].id)
                    sendWait(tournament[i][0].id)
                    this.winners.push(tournament[i][0])
                    } 
                else if (tournament[i][0].status === "winner") {
                    console.log('winner', tournament[i][0].id)
                    }
            } 
        }
    }

    fight(io) {
        for (let i = 0; i < this.tournament.length; i++) {
          
            if (this.tournament[i].length === 2) {
                let playerOne = this.users.find( (user) => {
                    return user.id === this.tournament[i][0].id;
                })
                let playerTwo = this.users.find( (user) => {
                    return user.id === this.tournament[i][1].id;
                })
                this.rPS(playerOne, playerTwo,io)
            }
        }
    }

    rPS(playerOne, playerTwo,io) {

        if (playerOne.selection === playerTwo.selection ){
            console.log('***** tie *****')
            this.winners.push(playerOne)
            this.winners.push(playerTwo)
            this.changeStatus(playerOne.id, 'tied', io)
            io.to(`${playerOne.id}`).emit('change-status', 'tied');
            this.changeStatus(playerTwo.id, 'tied', io)
            io.to(`${playerTwo.id}`).emit('change-status', 'tied');
        }
    
        else if (playerOne.selection === "rock" ){
            if(playerTwo.selection === "scissors") {
                console.log("ROCK vs SCISSORS")
                this.winners.push(playerOne)
                this.losers.push(playerTwo)
            } else{
                console.log("ROCK vs paper")
                this.winners.push(playerTwo)
                this.losers.push(playerOne)
            }
        }
    
        else if (playerOne.selection === "paper" ){
            if (playerTwo.selection === "rock" ){
                console.log('PAPER vs ROCK')
                this.winners.push(playerOne)
                this.losers.push(playerTwo)
            } else{
                console.log('PAPER vs SCISSORS')
                this.winners.push(playerTwo)
                this.losers.push(playerOne)
            }
        }
    
        else if (playerOne.selection === "scissors"){
            if (playerTwo.selection === "paper"){
                console.log('SCISSORS vs ROCK')
                this.winners.push(playerOne)
                this.losers.push(playerTwo)
            } else{
                console.log('SCISSORS vs PAPER')
                this.winners.push(playerTwo)
                this.losers.push(playerOne)
            }
        }
    }
    
}

module.exports = Game