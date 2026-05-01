const boardEl = document.getElementById("game");
const turnEl = document.getElementById("turn");

const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
const unicodePieces = {
	wK: "\u2654",
	wQ: "\u2655",
	wR: "\u2656",
	wB: "\u2657",
	wN: "\u2658",
	wP: "\u2659",
	bK: "\u265A",
	bQ: "\u265B",
	bR: "\u265C",
	bB: "\u265D",
	bN: "\u265E",
	bP: "\u265F"
};

let boardState = {};
let selectedSquare = null;
let legalTargets = [];
let currentTurn = "w";

init();

function init() {
	createBoard();
	setupPieces();
	renderBoard();
	updateTurnText();
}

function createBoard() {
	boardEl.innerHTML = "";

	for (let rank = 8; rank >= 1; rank -= 1) {
		const rankLabel = document.createElement("div");
		rankLabel.className = "rank-label";
		rankLabel.textContent = String(rank);
		boardEl.appendChild(rankLabel);

		for (let fileIndex = 0; fileIndex < 8; fileIndex += 1) {
			const file = files[fileIndex];
			const square = `${file}${rank}`;
			const cell = document.createElement("button");
			cell.type = "button";
			cell.className = "gamecell";
			cell.classList.add((fileIndex + rank) % 2 === 0 ? "light" : "dark");
			cell.dataset.square = square;
			cell.addEventListener("click", onCellClick);
			boardEl.appendChild(cell);
		}
	}
}

function setupPieces() {
	boardState = {};

	files.forEach((file) => {
		boardState[`${file}2`] = "wP";
		boardState[`${file}7`] = "bP";
	});

	const backRank = ["R", "N", "B", "Q", "K", "B", "N", "R"];
	backRank.forEach((piece, index) => {
		const file = files[index];
		boardState[`${file}1`] = `w${piece}`;
		boardState[`${file}8`] = `b${piece}`;
	});
}

function renderBoard() {
	const cells = boardEl.querySelectorAll(".gamecell");

	cells.forEach((cell) => {
		const square = cell.dataset.square;
		const piece = boardState[square];

		cell.classList.remove("white-piece", "black-piece", "selected", "possible");
		cell.textContent = piece ? unicodePieces[piece] : "";

		if (piece) {
			cell.classList.add(piece[0] === "w" ? "white-piece" : "black-piece");
		}

		if (selectedSquare === square) {
			cell.classList.add("selected");
		}

		if (legalTargets.includes(square)) {
			cell.classList.add("possible");
		}
	});
}

function onCellClick(event) {
	const targetSquare = event.currentTarget.dataset.square;
	const clickedPiece = boardState[targetSquare];

	if (!selectedSquare) {
		if (clickedPiece && clickedPiece[0] === currentTurn) {
			selectedSquare = targetSquare;
			legalTargets = getLegalMoves(targetSquare, clickedPiece);
			renderBoard();
		}
		return;
	}

	if (targetSquare === selectedSquare) {
		clearSelection();
		renderBoard();
		return;
	}

	if (legalTargets.includes(targetSquare)) {
		movePiece(selectedSquare, targetSquare);
		clearSelection();
		currentTurn = currentTurn === "w" ? "b" : "w";
		updateTurnText();
		renderBoard();
		return;
	}

	if (clickedPiece && clickedPiece[0] === currentTurn) {
		selectedSquare = targetSquare;
		legalTargets = getLegalMoves(targetSquare, clickedPiece);
		renderBoard();
		return;
	}

	clearSelection();
	renderBoard();
}

function movePiece(fromSquare, toSquare) {
	boardState[toSquare] = boardState[fromSquare];
	delete boardState[fromSquare];
}

function clearSelection() {
	selectedSquare = null;
	legalTargets = [];
}

function updateTurnText() {
	turnEl.textContent = currentTurn === "w" ? "It's White's turn" : "It's Black's turn";
}

function getLegalMoves(fromSquare, piece) {
	const color = piece[0];
	const kind = piece[1];
	const file = fromSquare.charCodeAt(0) - 96;
	const rank = Number(fromSquare[1]);

	if (kind === "P") {
		return getPawnMoves(file, rank, color);
	}

	if (kind === "N") {
		return getKnightMoves(file, rank, color);
	}

	if (kind === "B") {
		return getSlidingMoves(file, rank, color, [[1, 1], [1, -1], [-1, 1], [-1, -1]]);
	}

	if (kind === "R") {
		return getSlidingMoves(file, rank, color, [[1, 0], [-1, 0], [0, 1], [0, -1]]);
	}

	if (kind === "Q") {
		return getSlidingMoves(file, rank, color, [
			[1, 1],
			[1, -1],
			[-1, 1],
			[-1, -1],
			[1, 0],
			[-1, 0],
			[0, 1],
			[0, -1]
		]);
	}

	if (kind === "K") {
		return getKingMoves(file, rank, color);
	}

	return [];
}

function getPawnMoves(file, rank, color) {
	const moves = [];
	const direction = color === "w" ? 1 : -1;
	const startRank = color === "w" ? 2 : 7;

	const oneForward = toSquare(file, rank + direction);
	if (oneForward && !boardState[oneForward]) {
		moves.push(oneForward);

		const twoForward = toSquare(file, rank + 2 * direction);
		if (rank === startRank && twoForward && !boardState[twoForward]) {
			moves.push(twoForward);
		}
	}

	const captureLeft = toSquare(file - 1, rank + direction);
	const captureRight = toSquare(file + 1, rank + direction);

	[captureLeft, captureRight].forEach((captureSquare) => {
		if (captureSquare && boardState[captureSquare] && boardState[captureSquare][0] !== color) {
			moves.push(captureSquare);
		}
	});

	return moves;
}

function getKnightMoves(file, rank, color) {
	const offsets = [
		[1, 2],
		[2, 1],
		[2, -1],
		[1, -2],
		[-1, -2],
		[-2, -1],
		[-2, 1],
		[-1, 2]
	];

	return offsets
		.map(([dx, dy]) => toSquare(file + dx, rank + dy))
		.filter((square) => square && canLand(square, color));
}

function getSlidingMoves(file, rank, color, directions) {
	const moves = [];

	directions.forEach(([dx, dy]) => {
		let x = file + dx;
		let y = rank + dy;

		while (isInsideBoard(x, y)) {
			const square = toSquare(x, y);
			const occupant = boardState[square];

			if (!occupant) {
				moves.push(square);
			} else {
				if (occupant[0] !== color) {
					moves.push(square);
				}
				break;
			}

			x += dx;
			y += dy;
		}
	});

	return moves;
}

function getKingMoves(file, rank, color) {
	const moves = [];

	for (let dx = -1; dx <= 1; dx += 1) {
		for (let dy = -1; dy <= 1; dy += 1) {
			if (dx === 0 && dy === 0) {
				continue;
			}

			const square = toSquare(file + dx, rank + dy);
			if (square && canLand(square, color)) {
				moves.push(square);
			}
		}
	}

	return moves;
}

function canLand(square, color) {
	const occupant = boardState[square];
	return !occupant || occupant[0] !== color;
}

function toSquare(file, rank) {
	if (!isInsideBoard(file, rank)) {
		return null;
	}

	return `${String.fromCharCode(96 + file)}${rank}`;
}

function isInsideBoard(file, rank) {
	return file >= 1 && file <= 8 && rank >= 1 && rank <= 8;
}
