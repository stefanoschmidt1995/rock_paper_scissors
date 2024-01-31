//See for an inspiration: https://socket.io/docs/v4/tutorial/introduction

const express = require('express');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server } = require('socket.io');

const port = process.env.PORT || 3000;

  //Definining some functions

function findPlayer(player, listOfPlayers) {
  var i = 0;
  for (const p of listOfPlayers) {
  	if ((p['username'] == player['username']) && (p['game_id'] == player['game_id'])) return i;
  	i +=1;
  }
  return -1
}

function findSocket(socket, listOfPlayers) {
  var i = 0;
  for (const p of listOfPlayers) {
  	if (socket == p['socket']) return i;
  	i +=1;
  }
  return -1
}

function findMatchingSession(session_id, listOfPlayers) {
  var i = 0;
  var matchingSessions = [];
  for (const p of listOfPlayers) {
  	if (session_id == p['game_id']) matchingSessions.push(i);
  	i +=1;
  }
  return matchingSessions
}

function printPlayers(listOfPlayers){
  var msg = 'Players: [ ';
  for (const p of listOfPlayers) {
	  msg += p['username'] + ' , '
  }
  msg += ']'
  console.log(msg)
}


//This is sort of a json parser for incoming requests 
//	https://expressjs.com/en/api.html
const app = express();
app.use('/imgs', express.static('imgs')); // To load the images
const server = createServer(app); //This is a std server
const io = new Server(server); //This is the socket.io server. Apparently it adds some functionalities to the normal server

var listOfPlayers = [];

//We define a route handler / that gets called when we hit our website home.
//Route handlers are methods that execute when the route matches. 
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'src/index.html'));
});

io.on('connection', (socket) => {

  console.log('a user connected');
  socket.on('new_user', (msg) => {
    const new_player = {"username": msg['username'], "game_id": msg['game_id'], "socket": socket, "choices": []};
    const player_exist = (findPlayer(new_player, listOfPlayers) > -1);
    if (!player_exist) listOfPlayers.push(new_player);
    
    matchingSessions = findMatchingSession(msg['game_id'], listOfPlayers)
    //console.log(matchingSessions);
    printPlayers(listOfPlayers)
    
    if (matchingSessions.length == 2){
    	console.log('matching sessions');
    	listOfPlayers[matchingSessions[0]]["socket"].emit('found_match', listOfPlayers[matchingSessions[1]]['username'])
    	listOfPlayers[matchingSessions[1]]["socket"].emit('found_match', listOfPlayers[matchingSessions[0]]['username'])
   	}
    
  });
  
  socket.on('choice', (choice) => {
    var id_ = findSocket(socket, listOfPlayers);
    if (id_ == -1) return

    matchingSessions = findMatchingSession(listOfPlayers[id_]['game_id'], listOfPlayers)
    if (matchingSessions.length ==1) return
    var id_other = matchingSessions[0];
    if (id_ == id_other) id_other = matchingSessions[1];
    
    if (listOfPlayers[id_]['choices'].length > listOfPlayers[id_other]['choices'].length) return
    
    listOfPlayers[id_]['choices'].push(choice)
    
      //register the choice
    console.log('Player '+listOfPlayers[id_]['username']+' played '+choice+' on session '+listOfPlayers[id_]['game_id']);
    console.log(listOfPlayers[id_]['choices'])
    
      //Check if the opponent made a choice
    if (listOfPlayers[id_]['choices'].length == listOfPlayers[id_other]['choices'].length){
      choice_other = listOfPlayers[id_other]['choices'][listOfPlayers[id_other]['choices'].length-1]
      socket.emit('opponent_response', choice_other)
      listOfPlayers[id_other]['socket'].emit('opponent_response', choice)
    }
    
  });
  
  socket.on('disconnect', () => {
	  idToRemove = findSocket(socket, listOfPlayers);
	  if (idToRemove == -1) return;

    matchingSessions = findMatchingSession(listOfPlayers[idToRemove]['game_id'], listOfPlayers)	  
	  if (matchingSessions.length>1){
      var id_other = matchingSessions[0];
      if (idToRemove == id_other) id_other = matchingSessions[1];
      
      listOfPlayers[id_other]['socket'].emit('close');
      listOfPlayers[id_other]['choices'] = [];
    }
    console.log('user disconnected');
    listOfPlayers.splice(idToRemove, 1)
    printPlayers(listOfPlayers)
  });
});


server.listen(port, (error) => {
  if (!error)
    console.log('Server running at http://localhost:'+port);
  else
    console.log("Can't star the server. An error occurred: ", error);
});
