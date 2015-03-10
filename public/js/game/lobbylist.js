var playerList = [];
var gameList = [];

function addPlayer(userId,userName){
	if (playerList.length <=4 && playerList.indexOf(userId) < 0) {
		playerList.push(userId);
		gameList.push(userId);
		$("#setupList").append('<li><i class="uk-icon-user-plus"></i> ' + userName + '</li>');
		$("#playerCount").text('Create Game (' + playerList.length + ')');
	} 
};