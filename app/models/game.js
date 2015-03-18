// app/models/game.js
// load the things we need
var mongoose = require('mongoose');

// define the schema for our game model
var gameSchema = mongoose.Schema({
  room        : String,
  type        : String,
  status      : String,
  numPlayers  : Number,
  players     : [],
  order       : [],
  deck        : [],
  playArea    : [],
  winner      : String,
  start       : Date,
  end         : Date
});

// create the model for games and expose it to our app
module.exports = mongoose.model('Game', gameSchema);