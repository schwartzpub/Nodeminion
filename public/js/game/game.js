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

(function () {
    var app = angular.module('cardStore', []);
    var deck = {deck:{},count:{}};
    
    app.controller('CardController', function ($scope,$http) {
      this.deck = gameDeck;
      this.victory = [];
      this.kingdom = [];
      this.treasure = [];
      this.curse = [];
      this.hand = [];
      
      for (var h in userHand[0]) {
        this.hand.push(userHand[0][h]);
      }
      
      for (var k in gameDeck[0]) {
        if (k === 'victory') {
          for (var j in gameDeck[0][k]) {
            this.victory.push(gameDeck[0][k][j]);
          }
        }else if (k === 'kingdom') {
          for (var j in gameDeck[0][k]) {
            this.kingdom.push(gameDeck[0][k][j]);
          }
        }else if (k === 'treasure') {
          for (var j in gameDeck[0][k]) {
            this.treasure.push(gameDeck[0][k][j]);
          }
        }else if (k === 'curse') {
          for (var j in gameDeck[0][k]) {
            //console.log(gameDeck[0][k]);
            this.curse.push(gameDeck[0][k][j]);
          }
        }
      }
      
    });

    app.filter('slice', function() {
      return function(arr, start, end) {
        return (arr || []).slice(start, end);
      };
    });
})();