// Track which ID we get, and from that we'll know if we're player 1 or 2
// Pick up any changes to the lobby -- people coming and going
var playerNum = null;
var ticTacRef;

var scp;

// document.onmousemove = function(e){
// 	console.log((event.screenX * 100) / screen.width);
// };

// i1 = ["chartreuse", "fearless", "morbid", "idiotic", "slimy", "smelly", "pompous", "pie-eating", "elitist", "tone-deaf", "ugly", "two-toned", "slack-jawed", "two-bit", "rancid", "crazy", "prehistoric", "gelatinous", "corn-fed", "shady", "horned", "steaming", "nappy-ass", "whimsical"];

// i2 = [turd", "butt", "nut", "sphincter", "slime", "nose", "ear", "armpit", "fart", "nerd", "scrunge"];

// i3 = ["pilot", "canoe", "fairy", "captain", "pirate", "hammer", "knob", "box", "jockey", "waffle", "goblin", "blossom", "biscuit", "clown", "socket", "hound", "dragon", "job", "yokel", "sandwich", "wad", "cheese", "lover", "planet", "cadet", "wrinkle", "monkey", "sprocket", "basket", "charleton"];


// // If someone is bailing and they've already gotten into the lobby or a running game, remove them
// window.onbeforeunload = function(){
// 	return "Hit \"Stay on this page\" to tell your opponent that you're leaving!";
// };

// // Now rip out the game and ourselves before we're outta here
// window.onunload = function(){
// 	if($scope.game != null)
// 		$scope.game.remove();
// 	$scope.lobby.remove($scope.playerId);
// };

revApp = angular.module("ReversiApp", ["firebase"]);

// Count up how many people are in the room
revApp.filter('playerCount', function() {
  return function(input) {
    var ret = 0;
    var keys = Object.keys(input);
    for(k in keys){
    	if(keys[k][0] != "$")	// Not any built-in properties
    		++ret;
    }
    return ret;
  }
});

// Holy crow, what a crazy filter!!!  Just find if the player is playing or not, and it can't be us that gets listed
// Note that this thing causes an infinite digest loop ...
revApp.filter('isPlayerPlaying', function() {
  return function(input, condition, playerId) {
    if(!condition)
			condition = false;
    var ret = [];
    var keys = Object.keys(input);

		for(k in keys){
			if(keys[k][0] != "$" &&	// Not any built-in properties
				keys[k] != playerId)	// Don't show ourselves
    	{
    		var item = input[keys[k]];
    		if(condition)
    		{
    			if(item.isPlaying && item.opponent != null && item.game != null)
    				// Show player1 vs player2, and include the game ID
		        ret.push( {id:item.game, name:(item.name + " vs " + input[item.opponent].name)} );
    		}
    		else
    		{
    			if(!item.isPlaying)
		        ret.push( {id: keys[k], name: item.name });
    		}
      }
    }
    return ret;
  }
});

revApp.controller("ReversiCtrl", function($scope, $firebase){
	gameRef = new Firebase("https://fiery-fire-8597.firebaseio.com/reversi/games");
	lobbyRef = new Firebase("https://fiery-fire-8597.firebaseio.com/reversi/lobby");
//	insultRef = new Firebase("https://fiery-fire-8597.firebaseio.com/reversi/insult");

	// Default starting point
	scp = $scope;
	$scope.gameState = "E";
	$scope.lobby = $firebase(lobbyRef);
	$scope.games = $firebase(gameRef);
//	$scope.insult = $firebase(insultRef);
	$scope.playerId = null;	// The firebase ID we got

	$scope.enterLobby = function(){
		// Trim any spaces off the name
		$scope.name = $scope.name.trim();

		// See if this name is already out there
		var keys = Object.keys($scope.lobby);
		var k = 0;
		for(;k<keys.length;++k)
			if(keys[k][0] != "$" && $scope.lobby[keys[k]].name.toLowerCase() == $scope.name.toLowerCase())
				break;
		// k will be less than keys.length if it didn't make it to the end, and thus the name is already there
		if(k == keys.length)
		{
			$scope.nameAlreadyThere = "";
			$scope.gameState = "L";
			var x = lobbyRef.push( {name: $scope.name, isPlaying: false, opponent: "", game: ""} );
			$scope.playerId = x.name();

			// Sense if someone is asking us to play against them,
			// and if so show that DIV to confirm things
			$scope.$watch("lobby['" + $scope.playerId + "']", function(newVal){
				if(newVal == undefined)
					return;

				if(newVal.game.length > 1)			// Get into the new game that we or the other guy has now built
				{
					$scope.gameState = "G";
					$scope.game = $firebase(gameRef.child(newVal.game));
				}
				else if(newVal.opponent == "" || newVal.game == " ")
				{
					$scope.gameState = "L";
				}
				else	// Perhaps someone has set our opponent, as a request?
					if(newVal.game == "")	// We're not the ones asking?  (In which case this would be " ")
					{
						$scope.gameState = "LA";
					}
			});
		}
		else
		{
			$scope.nameAlreadyThere = $scope.name;
			$scope.name = "";
		}
	}

	// Ask someone if they want to play
	$scope.requestGame = function(id){
		// game is " " for the duration while we're asking someone else to play
		console.log($scope.lobby[$scope.playerId].game, $scope.lobby[$scope.playerId].opponent, $scope.lobby[id].game, $scope.lobby[id].opponent);
		if($scope.lobby[$scope.playerId].game == "" &&	// Make sure we're not already asking someone else to play
			$scope.lobby[$scope.playerId].opponent == "" &&	// And someone else is not asking us to play
			$scope.lobby[id].game == "" &&	// And they're not asking someone else to play
			$scope.lobby[id].opponent == "")	// And someone else is not asking them to play
		{
			// Set up each side to say that we're trying to play the other
			$scope.lobby[$scope.playerId].game = " ";
			$scope.lobby[$scope.playerId].opponent = id;
			$scope.lobby[id].opponent = $scope.playerId;
			// Save only the specific documents we've touched, and not the whole lobby
			$scope.lobby.$save($scope.playerId);
			$scope.lobby.$save(id);
			$scope.wannaPlayTimer = 10;
			setTimeout(wannaPlayCountdown, 1000);
		}
	};

	function wannaPlayCountdown(){
		if($scope.lobby[$scope.playerId].game == " ")	// Still not in a game here
		{
			if(--$scope.wannaPlayTimer <= 0 ||	// Out of time
			 $scope.lobby[$scope.lobby[$scope.playerId].opponent].opponent != $scope.playerId)	// Our hoped opponent is no longer considering us
			{
				// Undo that we're trying to play the other
				var opponent = $scope.lobby[$scope.playerId].opponent;
				// Only remove the opponent's setting if it is still set to point to us
				if($scope.lobby[opponent].opponent == $scope.playerId)
					$scope.lobby[opponent].opponent = "";
				$scope.lobby[$scope.playerId].opponent = "";
				$scope.lobby[$scope.playerId].game = "";	// Not asking anyone to play right now
				// Save only the specific documents we've touched, and not the whole lobby
				$scope.lobby.$save($scope.playerId);
				$scope.lobby.$save(opponent);
			}
			else
			{
				setTimeout(wannaPlayCountdown, 1000);
				$scope.$apply();
			}
		}
	}

	// Reject request
	$scope.rejectRequest = function(id){
		// Set that we're not interested
		$scope.lobby[$scope.playerId].opponent = "";
		$scope.lobby.$save($scope.playerId);
	}

	$scope.acceptRequest = function(){
		// Actually build out the board and all
		// And notify the other guy to jump in the game

		// Make a new game
		var opponent = $scope.lobby[$scope.playerId].opponent;

		// Set that we're the opponent of the other guy
		$scope.lobby[opponent].opponent = $scope.playerId;
		// Set us both to be playing
		$scope.lobby[$scope.playerId].isPlaying = $scope.lobby[opponent].isPlaying = true;

		// Our common game board
		var newGame = gameRef.push( {player1: $scope.playerId,
			player2: opponent,
			playerTurn: 0, won: false,
			board: [['','','','' ,'' ,'','',''],
							['','','','' ,'' ,'','',''],
							['','','','' ,'' ,'','',''],
							['','','','O','X','','',''],
							['','','','X','O','','',''],
							['','','','' ,'' ,'','',''],
							['','','','' ,'' ,'','',''],
							['','','','' ,'' ,'','','']],
			player1score: 2,	// Each player has 2 spaces to start with
			player2score: 2
						} );
		// Attach the last game to what we're up to
		$scope.lobby[$scope.playerId].game = $scope.lobby[opponent].game = newGame.name();
//		$scope.game = $firebase(newGame);
		// Save the changes on both sides
		$scope.lobby.$save($scope.playerId);
		$scope.lobby.$save(opponent);
	};

	// Become a spectator to one of the games
	$scope.spectateGame = function(id){
		console.log("spectate", id);
		$scope.lobby[$scope.playerId].game = id;
		$scope.lobby.$save($scope.playerId);
	}

	$scope.pic = function(piece){
		return (piece=='X'?'fb.png':(piece=='O'?'g+.png':'1x1.png'));
	}

	$scope.clickSquare = function(row,column) {
		// Make sure we're playing and not just a spectator, and make sure it's actually our turn!
		if(($scope.game.player1 == $scope.playerId || $scope.game.player2 == $scope.playerId) &&
			($scope.game.playerTurn % 2) != ($scope.game.player1 == $scope.playerId) ? 0 : 1)
			return;
		// Just for convenience, grab the othello board
		var oth = $scope.game.board;
		// Make sure it's not where someone else has already moved
		if(oth[row][column] != "")
			return;
		// And try to make the move
		turnLetter = $scope.game.playerTurn % 2 == 1 ? "X" : "O";
		if(this.makeMove(row,column, true))
		{
			oth[row][column] = turnLetter;
			++$scope.game.playerTurn;
			switch(turnLetter){		// Increment the score accordingly
				case "X":
					++$scope.game.player1score;
					break;
				case "O":
					++$scope.game.player2score;
					break;
			}
		}
		$scope.game.$save();
	};

	// Reset the game board
	$scope.resetBoard = function(){
		if($scope.playerId != null)
		{
			// Find ourselves out there and remove!
			$scope.lobby.remove($scope.playerId);
			// And the game we were playing
			$scope.lobby[$scope.playerId].remove();
		}

		// // Simply clear out each cell in the array
		// for(rw in $scope.game.board)
		// 	for(col in $scope.game.board[rw])
		// 		$scope.game.board[rw][col] = "";

		// // And set the two X and two O starting values
		// $scope.game.board[3][4]=$scope.game.board[4][3]="X";
		// $scope.game.board[3][3]=$scope.game.board[4][4]="O";
	};

	// This is used both to resign or for spectators to go back to the lobby
	$scope.resign = function(){
		if($scope.lobby[$scope.playerId].isPlaying)		// Were we one of the ones playing?
		{
			var opponent = $scope.lobby[$scope.playerId].opponent;
			$scope.lobby[$scope.playerId].opponent = "";	// We don't have an opponent anymore
			var opponentObj = $scope.lobby[opponent];
			if(opponentObj != undefined)
			{
				opponentObj.opponent = "";		// We're not our opponent's opponent anymore
				$scope.game.$remove();	// The game is gone
				$scope.lobby.$save(opponent);
			}
		}
		// If we're a spectator or a player, either way we're headed back to the lobby
		$scope.lobby[$scope.playerId].game = "";
		$scope.lobby.$save($scope.playerId);
	}

// 			$scope.lobby.remove($scope.playerId);


	// Logic to do an actual move
	$scope.makeMove = function(row,col, doMove){
		// Work out from where they are in all 8 directions
		// to see if there are (1) opposite pieces and then
		// (2) finally one their color
		var oth = $scope.game.board;
		ours = ($scope.game.playerTurn % 2 == 1 ? "X" : "O");
		theirs = (ours == "O" ? "X" : "O");
		isValidMove=false;

		// All the directions we're going to end up testing
		var dirs=[[-1,-1],	// Diagonally up and to the left
					[-1,0],		// Up
					[-1,1],		// Diagonally up and to the right
					[0,-1],		// Left
					[0,1],		// Right
					[1,-1],		// Diagonally down and to the left
					[1,0],		// Down
					[1,1]];		// Diagonally down and to the right

		dirs.forEach(function(dir){
			isLookingForOpposites = true;
			var flip = [];
			tCol = col;		// Start from where we are
			tRow = row;
			// Loop while we're still in the playing field
			while(true)
			{
				// Move in the appropriate direction by applying the offsets
				tCol += dir[0];
				tRow += dir[1];
				// Make sure we're still in range
				if(tRow < 0 || tRow > 7 || tCol < 0 || tCol > 7)
					break;
				if(isLookingForOpposites)	// Still making sure there's a neighboring opponent piece?
				{
					if(oth[tRow][tCol] == theirs)
					{
						isLookingForOpposites = false;	// There's at least one, now keep looking for opposites
						// Collect this first one to possibly flip
						flip.push([tRow,tCol]);
						continue;
					}
					else
						break;	// We didn't even find one of theirs.  Bail.
				}

				// If we're this far then it's definitely stage 2
				if(oth[tRow][tCol] == "")
					break;
				if(oth[tRow][tCol] == ours)
				{	// Cool, it is a good move and let's flip stuff.
					// Reset all the ones we have to flip
					if(doMove)
					{
						flip.forEach(function(cell){
							oth[cell[0]][cell[1]]=ours;
							switch(ours){		// Increment and decrement scores accordingly
								case "X":
									++$scope.game.player1score;
									--$scope.game.player2score;
									break;
								case "O":
									++$scope.game.player2score;
									--$scope.game.player1score;
									break;
							}
						});
					}
					isValidMove=true;
					break;
				}
				// Collect this next one to possibly flip
				flip.push([tRow,tCol]);
			}
		});

		if(doMove)
			$scope.game.$save();

		return isValidMove;
	}

});