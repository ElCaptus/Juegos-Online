const express = require('express')

const SocketIO = require('socket.io')

const app = express()

app.set('port', process.env.PORT || 3000)

app.use(express.static('public'))


const server = app.listen(app.get('port'), ()=>{
    console.log('server on port', app.get('port'))
})




//instancio un server inicializado al socketio
const io = SocketIO(server)

const users = {}
const winnerCombination = [
    [1,2,3],    //horizontal
    [4,5,6],
    [7,8,9],
    [1,4,6],    //vertical
    [2,5,8],
    [3,6,9],
    [1,5,9],    //diagonal
    [3,5,7]
]

const games = []
const next = {
    'X': 'O',
    'O': 'X'
}

io.on('connection', (socket) =>{
    console.log(`new connection with ${socket.id}`)

    let isPlayer    // Player or Viewer

    let playerS     // Player Symbol

    let roomIdS

    let turnCount = 0

    socket.on('room:join',({roomId})=>{
        socket.join(roomId)
        //si hay un juego en la sala es reconexion, sino es una nueva sala
        roomIdS = roomId
        let player
        if(!games[roomId]){
            isPlayer = true
            player = 'X'
            games[roomId] = {
                roomId,
                turn: player,
                table: [,,,,,,,,],
                players: [socket.id],
                viewersCount: 0,
                left: 'O',
                inGame: true,
                winner: null,
                rematchVote: []
            }
        }else{
            player = 'O'
            isPlayer = games[roomId].players.length <2
            if(isPlayer){
                games[roomId].players.push(socket.id)
                if(games[roomId].left === player){
                    games[roomId].left = 'X'
                }else{
                    player = games[roomId].left
                    games[roomId].left = 'O'
                    
                }
            }else{
                console.log('SOY VIEWER')
                games[roomId].viewersCount ++
            }
            playerS = games[roomId].left
        }
        playerS = player
        console.log('isplayer es ',isPlayer)
        let espectadores=games[roomIdS].viewersCount
        let jugadores=games[roomIdS].players.size
        socket.emit('state',{isPlayer,playerS,espectadores,jugadores})
        console.log('hay viewers: ',games[roomIdS].viewersCount)
        io.in(roomIdS).emit('inRoom',{views:games[roomIdS].viewersCount,players:games[roomIdS].players.length})

        console.log(`es el turno de ${games[roomIdS].turn}, y yo soy ${playerS}`)
    })

    function rematch(){
        if(games[roomIdS].rematchVote.indexOf( socket.id ) === -1){
            games[roomIdS].rematchVote.push(socket.id)
        }
        return games[roomIdS].rematchVote.length == 2
    }

    socket.on('rematch',()=>{
        console.log('viendo si rimacheamo')
        if(isPlayer&&!games[roomIdS].inGame){
            console.log('la votacion va en: ',games[roomIdS].rematchVote.length)
            if(rematch()){
                console.log('estamos rimachiando')
                games[roomIdS].table= [,,,,,,,,]
                games[roomIdS].inGame= true
                games[roomIdS].winner= null
                games[roomIdS].rematchVote = []
                io.to(roomIdS).emit('reDraw',games[roomIdS].turn)
            }else{
                console.log('roavia no rimachimao' )
                io.to(roomIdS).emit('error',{msg: `waiting for other player to rematch owo (1/${games[roomIdS].players.length})`,consoleMsg:'trying to rematch'})
            }
        }
    })

    socket.on('changeTurn',({box,playerS})=>{
        if(isPlayer){
            games[roomIdS].table[box]= playerS
            turnCount++
            if(turnCount>3){
                if(winner(box)){
                    games[roomIdS].inGame = false
                    games[roomIdS].winner = playerS
                    io.in(roomIdS).emit('winner',{playerS})
                }
            }
        }
    })
   
    socket.on('play',({box})=>{
        console.log(`ingame vale : ${games[roomIdS]}`)
        if(isPlayer){
            if(games[roomIdS].inGame){
                if(games[roomIdS].inGame){
                    if(games[roomIdS].turn === playerS){
                        let isVoid = !Boolean(games[roomIdS].table[box])
                        if(isVoid){
                            games[roomIdS].turn = next[playerS]
                            io.to(roomIdS).emit('draw',{playerS,box,next:next[playerS]})
                        }else{
                            socket.emit('error',{msg:'choose another box', consoleMsg:'The box must be void'})
                        }
                    }else{
                        socket.emit('error',{msg:'Not your turn',consoleMsg:'This is not his turn'})
                    }
                }else{
                    socket.emit('error',{msg:`ya termino la partida, gano: ${games[roomIdS].winner}`,consoleMsg:'termino la partida'})
                }
            }
        }
    })
    
    function winner(pos){
        //verifica las combinaciones a considerar
        const playedCombinations = winnerCombination.filter(element => element.find(elem => pos === elem))
        let win
        for (let i = 0; i < playedCombinations.length; i++) {
            const combination = playedCombinations[i];
            win = true
            for (let j = 0; j < 3; j++) {
                win = win && games[roomIdS].table[combination[j]] === playerS
                console.log(`en la interacion de ${combination[j]} el simbolo es ${games[roomIdS].table[combination[j]]} ---- win queda como ${win}`)
                if(!win)
                break
            }
            if(win)
            break
        }
        console.log(`${win}`)
        return win
    }




    socket.on('disconnect',()=>{
        console.log(`${socket.id} has disconnected`)
        if(games[roomIdS]){
            io.in(roomIdS).emit('inRoom',{views:games[roomIdS].viewersCount,players:games[roomIdS].players.length})
            if(isPlayer){
                let i = games[roomIdS].players.indexOf( socket.id )
                if ( i !== -1 ) {
                    games[roomIdS].players.splice( i, 1 )
                }
                
                games[roomIdS].left = playerS
                if(games[roomIdS].players.length === 0){
                    games.splice(roomIdS,1)
                    io.to(roomIdS).emit('desconectar') //decirle a los espectadores que no hay mas jugadores
                }
            }else{
                games[roomIdS].viewersCount --
            }
            

            io.in(roomIdS).allSockets().then(console.log)
        }
    })
    
})
