var socket = io();

document.addEventListener('DOMContentLoaded', function() {
	document.forms['lobby-form'].addEventListener('submit', function(e) {
		e.preventDefault();
		var timestamp = new Date().getTime();
		var msg = [timestamp , <% if (typeof user !== "undefined" && user) { %> '[<%= user.local.username %>' <% } %> + "] " + document.getElementById('lobby-txt').value];
		socket.emit('chat message', msg);
		document.getElementById('lobby-txt').value = '';
		return false;
	});
});

socket.on('chat message', function(msg) {
	console.log(msg);
	var timestamp = msg[0];
	timestamp = moment.utc(timestamp).toDate();
	timestamp = moment(timestamp).format('HH:mm:ss');
	
	$('#lobby-win').append($('<li>').append("<span class='uk-text-muted uk-text-small'>" + timestamp + "</span>" + " " + msg[1]));
	document.getElementById('lobby-win').scrollTop = document.getElementById('lobby-win').scrollHeight;
});