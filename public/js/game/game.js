var socket = io();
var gameId = '';

socket.on('game message', function(msg) {
	console.log("received message to room");
	var timestamp = msg[0];
	timestamp = moment.utc(timestamp).toDate();
	timestamp = moment(timestamp).format('HH:mm:ss');
	
	$('#private-lobby').append($('<li>').append("<span class='uk-text-muted uk-text-small'>" + timestamp + "</span>" + " " + msg[1]));
	document.getElementById('private-lobby').scrollTop = document.getElementById('private-lobby').scrollHeight;
});