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

	socket.on('send user', function(msg) {
		sessionlist[msg] = socket;
	});

	for (i = 0; i < scrollback.length; i++) {
		socket.emit('chat message', scrollback[i]);
	};
	
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
	
	socket.on('game message', function(msg) {
		if (msg != "Invalid date") {	
			io.emit('game message', msg);
		}
	});
	
	socket.on('add player', function(userid, username, leaderid) {
		if (!(leaderid in gamelist)) {
		
			gamelist[leaderid] = {
				players : [leaderid,userid],
				winner 	: "none",
				turn	: 0,
				status	: 0 
			};
			
			console.log(gamelist[leaderid]);
			
		} else if (leaderid in gamelist) {
			gamelist[leaderid].players.push(userid);
		}
		
		if (!sessionlist[userid]) {
			console.log(sessionlist);
			console.log('this user is: ' + userid);
		} else {
			sessionlist[userid].emit('user add alert');
			io.emit('add alert', userid);
			
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
	
	socket.on('disconnect', function() {
		for (var player in sessionlist) {
			if (sessionlist[player] === socket) {
				for (var game in gamelist) {
					if (game === player) {
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
					}
				}
			}
		}
	});
	
});

server.listen(port);
console.log('Dominion loading on ' + port);
