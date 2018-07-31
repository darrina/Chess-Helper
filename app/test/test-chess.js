require('jsdom-global')();
const assert = require('assert');

const {
  go,
  getBoard,
  parseAlgebraic,
  parseFromTo,
  getLegalMoves,
} = require('../src/chess');

describe('go', function() {
  const initChessBoard = (isLegal) => {
    const pieces = {
      1: {color: 2, type: 'p', area: 'e2'},
    };

    window.myEvent = {
      capturingBoard: {
        gameSetup: {pieces},
        gameRules: {
          isLegalMove: () => isLegal,
        },
        fireEvent: () => {},
      },
    };
  };

  beforeEach(function() {
    this.msg = document.createElement('div');
    this.msg.id = 'ccHelper-messages';
    document.body.appendChild(this.msg);
  });

  afterEach(function() {
    delete window.myEvent;
    this.msg.parentNode.removeChild(this.msg);
  });

  it('returns true on valid move', function() {
    initChessBoard(true);
    assert.deepEqual(go('e2e4'), true);
  });

  it('returns false on invalid move', function() {
    initChessBoard(false);
    assert.deepEqual(go('e2e4'), false);
  });
});

describe('getBoard', function() {
  it('should return board based on prop of dom element', function() {
    const cbElement = document.createElement('div');
    cbElement.className = 'chessboard';
    cbElement.chessBoard = 'chessboard!';
    document.body.appendChild(cbElement);

    const board = getBoard();
    assert.equal(board, 'chessboard!');

    cbElement.parentNode.removeChild(cbElement);
  });

  it('should return board for computer chess', function() {
    window.myEvent = {
      capturingBoard: 'chessboard!',
    };

    const board = getBoard();

    assert.equal(board, 'chessboard!');

    delete window.myEvent;
  });

  it('should return board for old live chess', function() {
    window.boardsService = {
      getSelectedBoard() {
        return {
          chessboard: 'chessboard!',
        };
      },
    };

    const board = getBoard();

    assert.equal(board, 'chessboard!');

    delete window.boardsService;
  });

  it('should return board for new live chess', function() {
    window.liveClient = {
      controller: {
        activeBoard: {
          chessboard: 'chessboard!',
        },
      },
    };

    const board = getBoard();

    assert.equal(board, 'chessboard!');

    delete window.liveClient;
  });

  it('should return null if theres no board', function() {
    const board = getBoard();

    assert.strictEqual(board, null);
  });
});

describe('parseAlgebraic', function() {
  it('parses short algebraic moves', function() {
    assert.deepEqual(parseAlgebraic('Rd2'), {
      piece: 'r',
      from: '..',
      to: 'd2',
      moveType: 'move',
    });
  });

  it('parses pawn moves', function() {
    assert.deepEqual(parseAlgebraic('d2'), {
      piece: 'p',
      from: '..',
      to: 'd2',
      moveType: 'move',
    });
  });

  it('parses full moves', function() {
    assert.deepEqual(parseAlgebraic('Re2d2'), {
      piece: 'r',
      from: 'e2',
      to: 'd2',
      moveType: 'move',
    });
  });

  it('parses pawn captures', function() {
    assert.deepEqual(parseAlgebraic('exd3'), {
      piece: 'p',
      from: 'e.',
      to: 'd3',
      moveType: 'capture',
    });

    // en passant
    assert.deepEqual(parseAlgebraic('exd3e.p.'), {
      piece: 'p',
      from: 'e.',
      to: 'd3',
      moveType: 'capture',
    });
  });

  it('parses piece captures', function() {
    assert.deepEqual(parseAlgebraic('Rxd2'), {
      piece: 'r',
      from: '..',
      to: 'd2',
      moveType: 'capture',
    });
  });

  it('parses full piece captures', function() {
    assert.deepEqual(parseAlgebraic('Re2xd2'), {
      piece: 'r',
      from: 'e2',
      to: 'd2',
      moveType: 'capture',
    });
  });

  it('parses partial disambiguation', function() {
    assert.deepEqual(parseAlgebraic('R2xd2'), {
      piece: 'r',
      from: '.2',
      to: 'd2',
      moveType: 'capture',
    });

    assert.deepEqual(parseAlgebraic('Rexd2'), {
      piece: 'r',
      from: 'e.',
      to: 'd2',
      moveType: 'capture',
    });
  });

  it('allows to mark a check', function() {
    assert.deepEqual(parseAlgebraic('Rd2+'), {
      piece: 'r',
      from: '..',
      to: 'd2',
      moveType: 'move',
    });
  });

  it('allows to mark a mate', function() {
    assert.deepEqual(parseAlgebraic('Rd2#'), {
      piece: 'r',
      from: '..',
      to: 'd2',
      moveType: 'move',
    });
  });

  it('parses castling', function() {
    assert.deepEqual(parseAlgebraic('o-o'), {
      piece: 'k',
      moveType: 'short-castling',
    });

    assert.deepEqual(parseAlgebraic('0-0'), {
      piece: 'k',
      moveType: 'short-castling',
    });

    assert.deepEqual(parseAlgebraic('ooo'), {
      piece: 'k',
      moveType: 'long-castling',
    });

    assert.deepEqual(parseAlgebraic('0-0-0'), {
      piece: 'k',
      moveType: 'long-castling',
    });
  });

  it('ignores not-existing pieces and squares', function() {
    assert.strictEqual(parseAlgebraic('Xd2'), null);
  });
});

describe('parseFromTo', function() {
  it('parses short algebraic moves', function() {
    assert.deepEqual(parseFromTo('e2e4'), {
      piece: '.',
      from: 'e2',
      to: 'e4',
      moveType: 'move',
    });
  });

  it('ignores non-existing squares', function() {
    assert.strictEqual(parseFromTo('x2e4'), null);
  });

  it('ignores other formats', function() {
    assert.strictEqual(parseFromTo('♞f3'), null);
  });
});

describe('getLegalMoves', function() {
  const getChessBoardWithPieces = (input) => {
    const pieces = {};

    input.forEach((p, i) => {
      pieces[i] = p;
    });

    return {
      gameSetup: {pieces},
      gameRules: {
        isLegalMove: () => true,
      },
    };
  };

  it('returns from and to if these are explicitly specified', function() {
    const board = getChessBoardWithPieces([
      {color: 2, type: 'p', area: 'e2'},
    ]);
    const result = getLegalMoves(board, {
      piece: '.',
      from: 'e2',
      to: 'e4',
      moveType: 'move',
    });

    assert.deepEqual(result, [['e2', 'e4']]);
  });

  it('handles partial matches', function() {
    const board = getChessBoardWithPieces([
      {color: 2, type: 'p', area: 'e2'},
    ]);
    const result = getLegalMoves(board, {
      piece: '.',
      from: '.2',
      to: 'e4',
      moveType: 'move',
    });

    assert.deepEqual(result, [['e2', 'e4']]);
  });

  it('ignores ambiguous results', function() {
    const board = getChessBoardWithPieces([
      {color: 2, type: 'p', area: 'e2'},
      {color: 2, type: 'p', area: 'c2'},
    ]);

    const result = getLegalMoves(board, {
      piece: '.',
      from: '.2',
      to: 'e4',
      moveType: 'move',
    });

    assert.deepEqual(result, [['e2', 'e4'], ['c2', 'e4']]);
  });

  it('returns empty if there are no matching pieces', function() {
    const board1 = getChessBoardWithPieces([
      // no pieces on 'from' spot
      {color: 2, type: 'p', area: 'c2'},
    ]);
    const result1 = getLegalMoves(board1, {
      piece: '.',
      from: 'e2',
      to: 'e4',
      moveType: 'move',
    });
    assert.deepEqual(result1, []);

    const board2 = getChessBoardWithPieces([
      // piece of a different type
      {color: 2, type: 'p', area: 'e2'},
    ]);
    const result2 = getLegalMoves(board2, {
      piece: 'r',
      from: 'e2',
      to: 'e4',
      moveType: 'move',
    });
    assert.deepEqual(result2, []);
  });

  it('doesnt fail if input is falsy', function() {
    const board = getChessBoardWithPieces([
      {color: 2, type: 'p', area: 'c2'},
    ]);
    assert.doesNotThrow(() => getLegalMoves(board, null));
  });

  it('returns correct move for short castling', function() {
    const board = getChessBoardWithPieces([
      {color: 2, type: 'k', area: 'e1'},
      {color: 2, type: 'r', area: 'h1'},
    ]);
    board.gameRules = {
      isLegalMove: (_1, fromSq, toSq) => {
        return fromSq === 'e1' && toSq === 'g1';
      },
    };
    const result = getLegalMoves(board, {
      piece: 'k',
      from: 'e2',
      to: 'g1',
      moveType: 'short-castling',
    });
    assert.deepEqual(result, [['e1', 'g1']]);
  });

  it('returns correct move for long castling', function() {
    const board = getChessBoardWithPieces([
      {color: 2, type: 'k', area: 'e1'},
      {color: 2, type: 'r', area: 'a1'},
    ]);
    board.gameRules = {
      isLegalMove: (_1, fromSq, toSq) => {
        return fromSq === 'e1' && toSq === 'c1';
      },
    };
    const result = getLegalMoves(board, {
      piece: 'k',
      from: 'e2',
      to: 'g1',
      moveType: 'long-castling',
    });
    assert.deepEqual(result, [['e1', 'c1']]);
  });
});