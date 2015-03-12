var playerList = [];
var gameList = [];
var socket = io();

// Add player function that adds a player to the Create Game list
function addPlayer(userId,userName,leaderId){
	if (playerList.length === 0) {
		socket.emit('new game', leaderId);
	}

	if (playerList.length <=4 && playerList.indexOf(userId) < 0) {
		playerList.push(userId);
		gameList.push(userId);
		
		socket.emit('add player', userId, userName, leaderId);
		
		$("#setupList").append('<li><i class="uk-icon-user-plus"></i> ' + userName + '</li>');
		$("#playerCount").text('Create Game (' + playerList.length + ')');
	}
	
	$("#gameButton").removeAttr('disabled');
};

// Pass userId and gameId to server to start game
function startGame(userId) {
	var gameId = gameGenerate(8);
	
	socket.emit('start game', userId, gameId);
};

// Create a gameId 
function gameGenerate(length) {
	var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.round(Math.random() * (chars.length - 1))];
    return result;
};

// Uh oh, time to leave a game.  Use this bad mamma-jamma to quit the fuck out of a game!
function quitGame(userId, gameId){
	socket.emit('leave game', userId, gameId);
};

// Socket calls for lobby chat
socket.on('chat message', function(msg) {
	var timestamp = msg[0];
	timestamp = moment.utc(timestamp).toDate();
	timestamp = moment(timestamp).format('HH:mm:ss');
	
	$('#lobby-win').append($('<li>').append("<span class='uk-text-muted uk-text-small'>" + timestamp + "</span>" + " " + msg[1]));
	document.getElementById('lobby-win').scrollTop = document.getElementById('lobby-win').scrollHeight;
});


// Socket calls to add users to a new game
socket.on('user add alert', function(msg) {
	alert("You've been added to a game!");
	$('.player-button').each( function () {
		$(this).attr('disabled');
	});
});

// Receive alert that a user has been added. Change icon color and disable the button.
socket.on('add alert', function(userid,type) {
	if (type === 1) {
		$('#'+userid).css("color","#D7DF01");
		$('#'+userid).attr('disabled');
		$('#'+userid).parent().attr("status", "1");
		
	} else if (type === 2) {
		$('#'+userid).css("color","#B40404");
		$('#'+userid).attr('disabled');
		$('#'+userid).parent().attr("status", "2");
	} 
});

// User is starting a new game, goes to correct path
socket.on('join game', function(gameId) {
	document.location = "/game/" + gameId;
});

// Socket calls to remove users from a game
socket.on('reenable', function(userid) {
	$('#'+userid).css("color","#31B404");
	if (!($('#'+userid).parent().attr("value") === myUserId)) {
		$('#'+userid).parent().removeAttr('disabled');
	}
});

// You've left a game, or finished a game, and now must have your UI returned to usable state for new game.
socket.on('user remove', function(msg) {
	$('.player-button').each( function () {
		if($(this).attr("value") != msg && $(this).attr("status") === "0") {
			$(this).removeAttr('disabled');
		}
	});
	$('#inGameAlert').remove();
	location.reload;
});