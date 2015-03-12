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
		if (!(leaderid in gamelist)) {
		
			gamelist[leaderid] = {
				gameid	: '',
				players : [leaderid,userid],
				winner 	: "none",
				turn	: 0,
				status	: 0 
			};
			
			console.log(gamelist);
			
			User.findById(leaderid, function (err, document) {
				if (err) { console.log(err); }
				document.local.status = 1;
				document.save( function(err) {
					if (err) { console.log(err); }
					return;
				});
			});
			
			io.emit('add alert', leaderid, 1);
			
		} else if (leaderid in gamelist) {
			gamelist[leaderid].players.push(userid);
		}
		
		if (!sessionlist[userid]) {
			console.log(sessionlist);
			console.log('this user is: ' + userid);
		} else {
			sessionlist[userid].emit('user add alert');
			io.emit('add alert', userid, 1);
			
			User.findById(userid, function (err, document) {
				if (err) { console.log(err); }
				document.local.status = 1;
				document.save( function(err) {
					if (err) { console.log(err); }
					return;
				});
			});
		}
	});
	
	// start game 
	socket.on('start game', function (userId, gameId) {

		createGame(userId, gameId, createPlayer);		

		function createGame(userId, gameId, createPlayer) {
			gamelist[userId].status = 1;
			gamelist[userId].gameid = gameId;
			console.log(gamelist);
		
			var newGame = new Game();
		
			newGame.room = gameId;
			newGame.status = 1;
			newGame.winner = 'none';
			newGame.players = [];
		
			for (var i = 0; i < gamelist[userId].players.length; i++) {
				User.findById(gamelist[userId].players[i], function (err, document) {
					if (err) { console.log(err); }
					document.local.status = 2;
					document.save( function(err) {
						if (err) { console.log(err); }
					});
				});
			
				io.emit('add alert', gamelist[userId].players[i], 2);
			
				sessionlist[gamelist[userId].players[i]].emit('join game', gameId);
			}

			createPlayer(newGame, saveGame);
		};
		
		function createPlayer(newGame, saveGame) {
			for (var i = 0; i < gamelist[userId].players.length; i++) {
				newGame.players.set(i, gamelist[userId].players[i]);
				console.log(gamelist[userId].players[i] + " set...");
			}
		
			saveGame(newGame);
		};

		function saveGame(newGame) {
			newGame.save();
			console.log(newGame);
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
							io.emit('reenable', gamelist[game].players[i]);
						}
						delete gamelist[game];
					}
				}
			}
		}
		
	});
	
});

server.listen(port);
console.log('Dominion loading on ' + port);
