<!-- Dominion App -->

// set up all tools
var express = require('express');
var app = express();
var server = require('http').Server(app);
var port = process.env.PORT || 8090;
var favicon = require('serve-favicon');

var mongoose = require('mongoose');
var configDB = require('./config/database.js');
mongoose.connect(configDB.url);

var passport = require('passport');
var flash = require('connect-flash');

var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');

var MongoStore = require('connect-mongo')(session);
var User = require('./app/models/user.js');
var Game = require('./app/models/game.js');

// set up socket.io
var io = require('socket.io')(server);

// set the view engine to ejs
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
app.use(favicon(__dirname + '/public/images/favicon.ico'));
app.use(morgan('dev')); // log every request to the console
app.use(cookieParser()); // read cookies (needed for auth)
app.use(bodyParser()); // get information from html forms

// set up passport
app.use(session({ secret: 'pirateshitghostshit', cookie: { expires: 900000 }, expires: 900000, rolling: true, store: new MongoStore({ mongooseConnection: mongoose.connection})})); // session secret
app.use(passport.initialize()); 
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session

// set up routes
require('./app/routes.js')(app, passport, mongoose);
require('./config/passport')(passport);

// socket functions for gameplay and chats
var scrollback = [];
var sessionlist = [];
var gamelist = [];

io.on('connection', function(socket) {

	// ===============================================================================================
	// USER HANDLING SOCKET METHODS
	//   These methods all handle user handling and game creation.  These are not for socket transfer 
	//   to the actual game, or for game mechanics.
	// ===============================================================================================

	// record new user in list
	socket.on('send user', function(msg) {
		
		sessionlist[msg] = socket;
		for (var game in gamelist) {
			if (gamelist[game].players.indexOf(msg) < 1 && gamelist[game].status === 0) {
				console.log('no game');
			} else {
				socket.join(gamelist[game].gameid);
			}
		}
	});

	// resets user back to default state
	socket.on('reset user', function(userId) {
	
		resetUserDB(userId, resetUserUI);
	
		function resetUserDB(userId, resetUserUI) {
			User.findById(userId, function (err, document) {
				if (err) { console.log(err); }
				document.local.status = 0;
				document.local.gameid = '';
				document.save( function (err) {
					if (err) { console.log(err); }
				});
			});		
			resetUserUI(userId, resetClients);
		};
	
		function resetUserUI(userId, resetClients) {
			socket.emit('user remove', userId);		
			resetClients(userId);
		};
		
		function resetClients(userId) {
			io.emit('reenable', userId);
		};
	
	});
	
	// ensure this is a new game for the leaderid, and make sure any games taht for some reason were abandoned in gamelist array are removed.
	socket.on('new game', function(leaderId) {
		for (var key in gamelist) {
			if (key === leaderId) {
				delete gamelist[key];
			}
		}
	});
	
	// send scrollback to new connection
	for (i = 0; i < scrollback.length; i++) {
		socket.emit('chat message', scrollback[i]);
	};
	
	// public lobby chat
	socket.on('chat message', function(msg) {
		if (msg != "Invalid date") {	
			io.emit('chat message', msg);
			if (scrollback.length <= 50) {
				scrollback.push(msg);
			} else {
				scrollback.shift();
				scrollback.push(msg);
			}
		}
	});
	
	// in game chat
	socket.on('game message', function(msg,gameId) {	
		if (msg != "Invalid date") {	
			io.to(gameId).emit('game message', msg);
		}
	});
	
	// Function to add player(s) to a new game. 
	socket.on('add player', function(userid, username, leaderid) {
		
		setupLeader(userid, username, leaderid, setupPlayer);
		
		// If this leader has no games in the gamelist, then ok to start making one.
		function setupLeader (userid, username, leaderid, setupPlayer) {
			if (!(leaderid in gamelist)) {		
				gamelist[leaderid] = {
					gameid	: '',
					players : [leaderid,userid],
					winner 	: "none",
					turn	: 0,
					status	: 0 
				};
				
				// Find leader in user database, and mark as '1' for waiting on game
				User.findById(leaderid, function (err, document) {
					if (err) { console.log(err); }
					document.local.status = 1;
					var leader = document.local.username;
					document.save( function(err) {
						if (err) { console.log(err); }
						io.emit('add alert', leaderid, 1);	// Tell clients on server that user-to-add cannot be selected for a new game	
						setupPlayer(userid, username, leaderid, leader);
					});
				});	
				
			} else if (leaderid in gamelist) {
				gamelist[leaderid].players.push(userid); // If leader is already creating a game, this will push the user-to-add into that game
				setupPlayer(userid, username, leaderid, leader);
			}
		};
		
		function setupPlayer (userid, username, leaderid, leader) {
			if (!sessionlist[userid]) { // This user has dropped their session, or is otherwise gone.  Don't do shit.
				console.log(sessionlist);
				console.log('this user is: ' + userid);
			} else {
				sessionlist[userid].emit('user add alert', leaderid, leader);
				io.emit('add alert', userid, 1); // Tell clients on server that user-to-add cannot be selected for a new game
				
				// Find user-to-add in user database, and mark as '1' for waiting on game
				User.findById(userid, function (err, document) {
					if (err) { console.log(err); }
					document.local.status = 1;
					document.save( function(err) {
						if (err) { console.log(err); }
						return;
					});
				});
			}
			return;
		};
	});
	
	socket.on('accept game', function(leaderid, userid) {
		sessionlist[leaderid].emit('accepted', userid);
	});
	
	socket.on('decline game', function(leaderid, userid) {
		sessionlist[leaderid].emit('declined', userid);
	});
	
	// start game 
	socket.on('start game', function (userId, gameId) {

		createGame(userId, gameId, createPlayer);		

		// createGame function.  Instantiates a Game Mongo.model and fills the fields needed to play a game. Callback: createPlayer()
		function createGame(userId, gameId, createPlayer) {
			gamelist[userId].status = 1;
			gamelist[userId].gameid = gameId;		

			var newGame = new Game(); // Instatiate new game
			newGame.room = gameId;
			newGame.status = 1;
			newGame.winner = 'none';
			newGame.players = [];
			newGame.start = new Date().getTime();
			newGame.numPlayers = gamelist[userId].players.length;		

			for (var i = 0; i < gamelist[userId].players.length; i++) {
				User.findById(gamelist[userId].players[i], function (err, document) {
					if (err) { console.log(err); }
					document.local.status = 2;
					document.local.gameid = gameId;
					document.save( function(err) {
						if (err) { console.log(err); }
					});
				});			
				io.emit('add alert', gamelist[userId].players[i], 2); // Let entire server know that each user for this game is not available, and in a game.
				sessionlist[gamelist[userId].players[i]].emit('join game', gameId); // Kick off the join game event on clients
			}
			createPlayer(newGame, saveGame); // Move on to createPlayer method. Callback: saveGame()
		};
		
		// createPlayer function.  This adds players to the newly instatiated game in the game database.
		function createPlayer(newGame, saveGame) {
			for (var i = 0; i < gamelist[userId].players.length; i++) {
				newGame.players.set(i, {'userid' : gamelist[userId].players[i], 'turn' : false, 'winner' : false, 'finalscore' : 0, 'status' : 1});
			}		
			saveGame(newGame); // Move on to saveGame method.
		};

		function saveGame(newGame) {
			newGame.save();  // Saves game. Callback: none
		};
	});
	
	// handle a quit game event
	socket.on('leave game', function(userId, gameId) {
		
		removeFromGame(userId, gameId, removeFromUser);
		
		// Remove user from the game.  This involves setting the users status to 3 in the game database
		function removeFromGame(userId, gameId, removeFromUser) {
			Game.findOne({'room' : gameId}, function(err, document) {
				if (err) { console.log(err); }
				for (var i = 0; i < document.numPlayers; i++) {
					if (document.players[i].userid === userId) {
						document.players.set(i, {'userid' : userId, 'turn': false, 'winner': false, 'finalscore' : 0, 'status' : 3});
						document.save( function(err) {
							if (err) { console.log(err); }
						});
					}
				}
			});			
			removeFromUser(userId, gameId); // Move on to removeFromUser function
		};
		
		// Remove user from the game.  This involves resetting the users status to 0, and removing the gameid from his profile
		function removeFromUser(userId, gameId) {
			User.findById(userId, function (err, document) {
				if (err) { console.log(err); }
				document.local.status = 0;
				document.local.gameid = '';
				document.save( function (err) {
					if (err) { console.log(err); }
				});
			});
			socket.leave(gameId); // Remove this users socket from the game io.room and place it back in the public lobby io
			io.emit('reenable', userId); // Let the entire server know that this user is available for a games
			socket.emit('user remove', userId); // Emit the action to the user to reset their UI back to base.
		};
	});
	
	// disconnect function, if a user was creating a game, it will remove everyone from the game so they don't get stuck
	socket.on('disconnect', function() {
		for (var player in sessionlist) {
			if (sessionlist[player] === socket) {
				for (var game in gamelist) {
					if (game === player && gamelist[game].status === 0) {
						for (var i = 0; i < gamelist[game].players.length; i++) {
							User.findById(gamelist[game].players[i], function (err, document) {
								if (err) { console.log(err); }
								document.local.status = 0;
								document.save( function(err) {
									if (err) { console.log(err); }
									return;
								});
							});
							io.emit('reenable', player); // Tells all clients to mark this user as available if session still active.
						}
						delete gamelist[game]; // Removes the abandoned game creation from game array.
					}
				}
			}
		}		
	});	
});

server.listen(port);
console.log('Dominion loading on ' + port);
