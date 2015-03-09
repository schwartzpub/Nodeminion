document.addEventListener('DOMContentLoaded', function() {
	var count = 0;
	var users = <%- JSON.stringify(onUsers) %>;
	for (i = 0; i < users.length; i++) {
		if (count===0) { $('#player-list-1').append('<li><button class="uk-button uk-button-mini" type="button" data-uk-button><i class="uk-icon-user"></i> ' + users[i].local.username + '</button></li>'); count +=1; }
		else if (count===1) { $('#player-list-2').append('<li><button class="uk-button uk-button-mini" type="button" data-uk-button><i class="uk-icon-user"></i> ' + users[i].local.username + '</button></li>'); count +=1; }
		else if (count===2) { $('#player-list-3').append('<li><button class="uk-button uk-button-mini" type="button" data-uk-button><i class="uk-icon-user"></i> ' + users[i].local.username + '</button></li>'); count +=1; }
		else if (count===3) { $('#player-list-4').append('<li><button class="uk-button uk-button-mini" type="button" data-uk-button><i class="uk-icon-user"></i> ' + users[i].local.username + '</button></li>'); count = 0; }
	}
});