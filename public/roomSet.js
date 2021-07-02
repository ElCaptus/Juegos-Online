const socket = io()

const init = function(){
    var roomId = window.location.href.indexOf('?roomId=').valueOf();
    if(roomId === -1){
        //soy el creador de la sala
        roomId = Math.floor(Math.random()*(999-100)+100)
        document.getElementById('tableId').value = window.location.href + "?roomId=" + roomId;
    }else{
        //me invitaron
        roomId = Number(window.location.href.substr(-3,window.location.href.indexOf('?roomId=')))
    }
    socket.emit('room:join',{roomId});
}

socket.on('connect',()=> init())



const drawTable = function({box,playerS,next}){
    socket.emit('changeTurn',{box,playerS})
    const pos = box
    const pElem = document.createElement('p')
    pElem.className = 'piece'
    pElem.innerText = playerS
    document.getElementById(pos).innerHTML =  pElem.outerHTML
    if(next){
        document.getElementById('err').innerText = `Es el turno de: ${next}`
    }
}


socket.on('error',({msg,consoleMsg})=>{
    document.getElementById('err').innerText = msg
    console.error(consoleMsg)
})

socket.on('draw',(data)=>{
    drawTable(data)
})
socket.on('reDraw',(next)=>{
    document.getElementById('rematch').remove()
    document.getElementById('err').innerText = `New Game, starts ${next}`
    document.getElementById('table').innerHTML = `<tr>
    <td id="1"></td>
    <td id="2"></td>
    <td id="3"></td>
</tr>
<tr>
    <td id="4"></td>
    <td id="5"></td>
    <td id="6"></td>
</tr>
<tr>
    <td id="7"></td>
    <td id="8"></td>
    <td id="9"></td>
</tr>`
    listeners()
})


socket.on('inRoom',({views,players})=>{
    document.getElementById('count').innerText = `Hay ${players} persona${players<2?'':'s'} jugando y ${views} persona${views<2?'':'s'} viendo`
})

const copyLink = function(){
    const elem = document.getElementById('tableId')
    elem.select()
    document.execCommand('copy')
}




socket.on('winner',({playerS})=> {
    document.getElementById('err').innerText = `The winner is ${playerS}`

    const elem = document.createElement('input')
    elem.type = 'button'
    elem.addEventListener('click',()=>{socket.emit('rematch')})
    elem.id = 'rematch'
    elem.value = 'Rematch Bro'
    document.getElementById('end').appendChild(elem)
})



function listeners(){
    for (let box = 1; box < 10; box++) {
        document.getElementById(`${box}`).addEventListener('click',()=>{
            socket.emit('play',{box})
        })   
    }
}
socket.on('state',({isPlayer,playerS})=>{
    console.log(isPlayer)
    if(isPlayer){
        document.getElementById('who').innerText = playerS
        listeners()
    }
})