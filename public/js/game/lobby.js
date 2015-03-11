var playerList = [];
var gameList = [];
var socket = io();


// Add player function that adds a player to the Create Game list
function addPlayer(userId,userName,leaderId){

	if (playerList.length <=4 && playerList.indexOf(userId) < 0) {
		playerList.push(userId);
		gameList.push(userId);
		
		socket.emit('add player', userId, userName, leaderId);
		
		$("#setupList").append('<li><i class="uk-icon-user-plus"></i> ' + userName + '</li>');
		$("#playerCount").text('Create Game (' + playerList.length + ')');
	}
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
	alert("You've been added to a game, homie!");
});

socket.on('add alert', function(userid) {
	$('#'+userid).css("color","#D7DF01");
});

// Socket calls to remove users from a game
socket.on('reenable', function(userid) {
	$('#'+userid).css("color","#31B404");
});