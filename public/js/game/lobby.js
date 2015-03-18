var playerList = [];
var accepted = 0;
var gameList = [];
var socket = io();
var acceptTimeout;

// Add player function that adds a player to the Create Game list
function addPlayer(userId,userName,leaderId){
  if (playerList.length === 0) {
    socket.emit('new game', leaderId);
    $('#startIcon').toggleClass('uk-icon-spin');
  }

  if (playerList.length <=4 && playerList.indexOf(userId) < 0) {
    playerList.push(userId);
    gameList.push(userId);
    
    socket.emit('add player', userId, userName, leaderId);
    
    $("#setupList").append('<li id="'+userId+'-li"><i id="' + userId + '-icon" class="uk-icon-circle-o-notch uk-icon-spin"></i> ' + userName + '</li>');
    $("#playerCount").text('Create Game (' + playerList.length + ')');
  }
};

// Pass userId and gameId to server to start game
function startGame(userId) {
  var gameId = gameGenerate(8);
  
  socket.emit('start game', userId, gameId, 'base');
};

// Create a gameId 
function gameGenerate(length) {
  var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.round(Math.random() * (chars.length - 1))];
    return result;
};

// Uh oh, time to leave a game.  Use this bad mamma-jamma to quit the fuck out of a game!
function quitGame(userId, gameId) {
  socket.emit('leave game', userId, gameId);
};

// Cancel game before starting one...
function cancelGame() {
  for ( var i in playerList ) socket.emit('reset user', playerList[i]);
  $('#setupList').children().remove();
  playerList = [];
  gameList = [];
  accepted = 0;
  $("#playerCount").text('Create Game');
  $('#startIcon').toggleClass('uk-icon-spin');
  $("#gameButton").prop('disabled', true);
  $("#cancelButton").prop('disabled', true);
  playerList = [];
  gameList = [];
  socket.emit('reset user', myUserId);
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
socket.on('user add alert', function(leaderid,leader) {
  var acceptModal = new UIkit.modal("#acceptModal", {bgclose:false});
  var timer = 30;
  acceptModal.show();
  $("#leaderName").text(leader);
  document.getElementById('chirp').play();
  
  acceptTimeout = setTimeout( function() {
    socket.emit('decline game', leaderid, myUserId);
    socket.emit('reset user', myUserId);
    acceptModal.hide();
    clearInterval(countDown);
    $(document).prop('title', 'Nodeminion');
    return true;
  }, 30000);

  var countDown = setInterval( function () {
    timer -= 1;
    $("#countDown").text(timer);
    if ($(document).prop('title') === 'Nodeminion') {
      $(document).prop('title', '( ! )Nodeminion');
    } else {
      $(document).prop('title', 'Nodeminion');
    }
  }, 1000);
  
  $('#acceptButton').on('click', function () {
    clearTimeout(acceptTimeout);
    socket.emit('accept game', leaderid, myUserId);
    $('.player-button').each( function () {
      $(this).prop('disabled', true);
    });
    acceptModal.hide();
    clearInterval(countDown);
    $(document).prop('title', 'Nodeminion');
    return true;
  });
  
  $('#declineButton').on('click', function () {
    clearTimeout(acceptTimeout);
    socket.emit('decline game', leaderid, myUserId);
    socket.emit('reset user', myUserId);
    acceptModal.hide();
    clearInterval(countDown);
    $(document).prop('title', 'Nodeminion');
    return true;
  });
});

// Socket calls for response to user additions
socket.on('accepted', function(userId) {
  $('#'+userId+'-icon').attr('class', 'uk-icon-user-plus');
  accepted += 1;
  console.log("playerlist: " + playerList.length + " ... accepted: " + accepted);
  if (playerList.length === accepted) {
    $("#gameButton").prop('disabled', false);
    $("#cancelButton").prop('disabled', false);
  }
});

socket.on('declined', function(userId) {
  splicePlayerList(userId, spliceGameList);
  
  function splicePlayerList(userId, spliceGameList) {
    for (var id in playerList) {
      if (playerList[id] == userId) {
        playerList.splice(id,1);
      }
    }
    spliceGameList(userId, resetUI);
  };
  
  function spliceGameList(userId, resetUI) {
    for (var id in gameList) {
      if (gameList[id] == userId) {
        gameList.splice(id,1);
      }
    }
    
    resetUI(userId);
  };
  
  function resetUI(userId) {
    $('#'+userId+'-li').remove();
    if (playerList.length < 2) {
      $("#playerCount").text('Create Game');
      $('#startIcon').toggleClass('uk-icon-spin');
      $("#gameButton").prop('disabled', true);
      playerList = [];
      gameList = [];
      accepted = 0;
      socket.emit('reset user', myUserId);
    } else {
      $("#playerCount").text('Create Game (' + playerList.length + ')');
    }
  };
});

// Receive alert that a user has been added. Change icon color and disable the button.
socket.on('add alert', function(userid,type) {
  if (type === 1) {
    $('#'+userid+'-plicon').css("color","#D7DF01");
    $('#'+userid+'-plbutton').prop('disabled', true);
    $('#'+userid+'-plicon').parent().attr("status", "1");
    
  } else if (type === 2) {
    $('#'+userid+'-plicon').css("color","#B40404");
    $('#'+userid+'-plbutton').prop('disabled', true);
    $('#'+userid+'-plicon').parent().attr("status", "2");
  } 
});

// User is starting a new game, goes to correct path
socket.on('join game', function(gameId) {
  document.location = "/game/" + gameId;
});

// Socket calls to remove users from a game
socket.on('reenable', function(userid) {
  $('#'+userid+'-plicon').css("color","#31B404");
  $('#'+userid+'-plbutton').attr('status', '0');
  $('#'+userid+'-plicon').css("color","#31B404");
  if (!(userid === myUserId) && $('#'+userid+'-plbutton').attr('status') === "0") {
    $('#'+userid+'-plbutton').prop('disabled', false);
  }
});

// You've left a game, or finished a game, and now must have your UI returned to usable state for new game.
socket.on('user remove', function(userId) {
  $('.player-button').each( function () {
    if($(this).attr("value") !== userId && $(this).attr("status") === "0") {
      $(this).prop('disabled', false);
    }
  });
  $('#inGameAlert').remove();
  location.reload;
});
