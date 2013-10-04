function ReversiCtrl($scope){
	
$scope.othello=[['','','','','','','',''],
				['','','','','','','',''],
				['','','','','','','',''],
				['','','','O','X','','',''],
				['','','','X','O','','',''],
				['','','','','','','',''],
				['','','','','','','',''],
				['','','','','','','','']];

	$scope.playerTurn = 1;

	$scope.clickSquare = function(row,column) {
		// Just for convenience
		var oth = $scope.othello;
		// Make sure it's not where someone else has already moved
		if(oth[row][column] != "")
			return;
		// And try to make the move
		turnLetter = $scope.playerTurn % 2 == 1 ? "X" : "O";
		if(this.makeMove(row,column))
		{
			oth[row][column] = turnLetter;
			++$scope.playerTurn;
		}
		else
			alert("Dude, it's " + turnLetter + "'s turn.  Pick a valid square!");
	};

	// Reset the game board
	$scope.resetBoard = function(){
		// Simply clear out each cell in the array
		for(rw in $scope.othello)
			for(col in $scope.othello[rw])
				$scope.othello[rw][col] = "";

		// And set the two X and two O starting values
		$scope.othello[3][4]=$scope.othello[4][3]="X";
		$scope.othello[3][3]=$scope.othello[4][4]="O";
	};

	// Logic to do an actual move
	$scope.makeMove = function(row,col){
		// Work out from where they are in all 8 directions
		// to see if there are (1) opposite pieces and then
		// (2) finally one their color
		var oth = $scope.othello;
		ours = ($scope.playerTurn % 2 == 1 ? "X" : "O");
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
					flip.forEach(function(cell){
						oth[cell[0]][cell[1]]=ours;
					});
					isValidMove=true;
					break;
				}
				// Collect this next one to possibly flip
				flip.push([tRow,tCol]);
			}
		});

		return isValidMove;
	}
}
