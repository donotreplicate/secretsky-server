//VERY crude re-implementation of the websocket calls for Secret Sky. This is for educational purposes only, do not use it prod because it will die.

const socket = require('ws');
const wss = new socket.Server({ port: 5000 });

const timeOut = 10 * 1000 //10s //How long to wait before timing out a user.

//We store current players in an array. Don't do this for prod, it will be slow and not scaleable.
let activePlayers = [];

wss.on('connection', function connection(ws) {
    ws.on('message', function message(data) {
        if (data.toString() == "ping") {
            ws.send("pong")
            return;
        }
        let body;
        if (!data.toString().startsWith("binary")) {
            try {
                body = JSON.parse(data.toString());
            } catch (e) {
                console.log(e)
                return;
            }
        } else {
            body = data.toString();
            const b = {
                _evt: 'socket_connection_binary',
                data: [JSON.parse(body.substring(7))]
            }
            serverBroadcast(JSON.stringify(b), ws)
            return;
        }
        if (body._evt !== "alive") {
          console.log('received: %s', data);
        }
        
        switch (body._evt) {
            case 'findAny':
              fakeFindAny(ws, body);
              break;
            case 'join':
              fakeJoin(ws, body);
              break;
            case 'request_state':
              fakeRequestState(ws, body);
              break;
            case 'alive':
              handleAlive(ws, body);
               break;
            case 'update_user_data':
              handleUpdateUserData(ws, body);
            case 'pin':
              handlePin(ws, body);
              break;
            case 'leave':
              handleLeave(ws, body);
              break;
            default:
              break;
          }
        
    });

  //ws.send('something'); //No case found, nothing to do.
});

function serverBroadcast(message, except = null) {
    wss.clients.forEach(function each(client) {
      if (client == except) {
        return;
      }
      if (client.readyState === socket.OPEN) {
        client.send(message);
      }
    });
  }

function fakeFindAny(socket, body) {
    // Request: { coords: [ 0, 0 ], type: 'community_main', _evt: 'findAny' }
    // Response: {_evt: 'findAny_response', id: 'room id here'}
    const resp = { _evt: 'findAny_response', id: 'SecretSky' }; // Hardcoded room ID, ideally you'd have multiple WS rooms / servers routed by ID.
    console.log(resp)
    socket.send(JSON.stringify(resp));
}

function fakeJoin(socket, message) {
    if (activePlayers.findIndex(p => p.user.uid == message.user.uid) == -1) {
        activePlayers.push({ id: message.user.uid, user: message.user, socket: socket, lastHeartbeat: Date.now() });
      //activePlayers.push({ id: message.user.uid, user: message.user });
  
    //   let join_resp = {
    //     _evt: 'gc_player_ready',
    //     id: message.user.uid,
    //     data: message.user
    //   };
    }
    let players = []; //Player response here is different to what is stored in activePlayers, so make new. 
  
    for (const player of activePlayers) {
      players.push({ id: player.user.uid, data: player.user});
    }
  
    let resp = {
      _evt: 'join_response',
      success: true,
      host: 'Secret',
      myID: message.user.uid,
      serverId: 'Sky',
      players: players
    };
    socket.send(JSON.stringify(resp));

    resp = {
      _evt: 'open_connection',
      gcID: message.user.uid,
      data: message.user
    }
    serverBroadcast(JSON.stringify(resp), socket)
  }

  function handleLeave(socket, message) {
    arrId = activePlayers.findIndex(obj => obj.id == message.user.uId)
    start = activePlayers.slice(0, arrId)
    end = activePlayers.slice(arrId+1, activePlayers.length)
    activePlayers = start.concat(end)
    resp = {
      _evt: "player_disconnect",
      gcID: message.user.uId
    }
    serverBroadcast(JSON.stringify(resp), socket)
    resp = {
      _evt: "force_disconnect"
    }
    socket.send(JSON.stringify(resp))
  }

  function fakeRequestState(socket, message) {
     //{ _evt: 'request_state' }
    let players = [];
    for (const player of activePlayers) {
      players.push({ id: player.user.uid, data: player.user });
    }
    const resp = {
        "_evt": "rebroadcast_players",
        "data": players
    }
    socket.send(JSON.stringify(resp))
  }
  
  function handleBinary(socket, message) {
    var player = activePlayers.find(p => p.id == message.from);
    serverBroadcast("binary:" + JSON.stringify(message), socket);
    // gamecenter_data
  
    if (!!message.objects && !!message.objects.player) {
      player.p = message.objects.player.p;
      player.q = message.objects.player.q;
      return;
    }
  
  
    console.log(message);
  }
  
  function handleAlive(socket, body) {
    let player = activePlayers.findIndex(p => p.socket == socket);
    if (player !== -1) {
      activePlayers[player].lastHeartbeat = Date.now()
      resp = {
        _evt: 'gamecenter_data',
        _ping: 1,
        data: activePlayers[player].user
      };
      socket.send(JSON.stringify(resp));
    }
  }
  
  function handleUpdateUserData(socket, message) {
  
    let player = activePlayers.findIndex(obj => obj.id == message.gcID);
    if (player == -1) return;
    activePlayers[player].user = message.data;
    resp = {
      _evt: 'update_user_data',
      gcID: message.gcID,
      data: message
    }
    serverBroadcast(JSON.stringify(resp), socket)
}
  
  function handlePin(socket, message) {
    let resp = {
      _evt: 'pin',
      message: message.message
    };
    serverBroadcast(JSON.stringify(resp), socket);
  }

//Very messy way to remove broken / no longer alive users.
async function clearStale() {
  if (activePlayers.length != 0) {
    activePlayers.forEach(player => {
      lastBeat = Date.now() - player.lastHeartbeat;
      if (lastBeat > timeOut){
        console.log("Removing stale player " + player.id)
        arrId = activePlayers.findIndex(obj => obj.id == player.id)
        start = activePlayers.slice(0, arrId)
        end = activePlayers.slice(arrId+1, activePlayers.length)
        activePlayers = start.concat(end)
        resp = {
          _evt: "player_disconnect",
          gcID: player.id
        }
        serverBroadcast(JSON.stringify(resp))
      }
    })
  }
}

async function asyncInterval(callback, delay) {
  while (true) {
    try {
      await callback();
    } catch (err) {
      console.log("[DEBUG] Something went wrong: " + err);
    }
    await new Promise((r) => setTimeout(r, delay));
  }
}

asyncInterval(clearStale.bind(null, null), timeOut);
