var socket = io();

function chatInit(user) {

	socket.emit('connect', user);

	document.forms['private-lobby-form'].addEventListener('submit', function(e) {
		e.preventDefault();
		var timestamp = new Date().getTime();
		var msg = [timestamp , '[' + user + '] ' + document.getElementById('private-lobby-txt').value];
		socket.emit('game message', msg);
		document.getElementById('private-lobby-txt').value = '';
		return false;
	});
};

socket.on('game message', function(msg) {

	var timestamp = msg[0];
	timestamp = moment.utc(timestamp).toDate();
	timestamp = moment(timestamp).format('HH:mm:ss');
	
	$('#private-lobby').append($('<li>').append("<span class='uk-text-muted uk-text-small'>" + timestamp + "</span>" + " " + msg[1]));
	document.getElementById('private-lobby').scrollTop = document.getElementById('private-lobby').scrollHeight;
});

{
	user : {
		userid: 	,
		username:	,
		vp:			,
		status:		,
		gameid:		
		},
	game : {
		gameid:		,
		var1:		,
		var2:		,
		var3:		,
		}
}
		
		