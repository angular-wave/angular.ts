import { angular } from "../../auto.ts";
import { ScopeElement } from "./web-component.ts";

class SquareElement extends ScopeElement {
  static shadow = true;
  static inputs = {
    index: Number,
    value: String,
  };
  static scope = {
    value: "",
  };
  static template = `
    <div>
      <style>
        :host {
          display: block;
        }

        .square {
          width: 48px;
          height: 48px;
          border: 1px solid #c9d1df;
          background: #ffffff;
          color: #202124;
          cursor: pointer;
          font: inherit;
          font-size: 24px;
          font-weight: 700;
          line-height: 1;
        }

        .square:hover {
          background: #f2f4f7;
        }
      </style>
      <button class="square" type="button" ng-click="select()">
        {{ value }}
      </button>
    </div>
  `;

  connected() {
    this.scope.select = () => {
      this.dispatch("square-play", {
        index: this.scope.index,
      });
    };
  }
}

class BoardElement extends ScopeElement {
  static shadow = true;
  static inputs = {
    caption: {
      type: String,
      default: "Tic Tac Toe",
    },
  };
  static scope = {
    currentMove: 0,
    history: [],
    moves: [],
    squares: [],
    status: "Next player: X",
  };
  static template = `
    <div>
      <style>
        :host {
          display: block;
          color: #202124;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .game {
          display: grid;
          grid-template-columns: max-content minmax(180px, 1fr);
          gap: 18px;
          align-items: start;
        }

        h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 650;
          letter-spacing: 0;
        }

        header {
          grid-column: 1 / -1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .status {
          margin-bottom: 10px;
          color: #475467;
          font-size: 14px;
        }

        .board {
          display: grid;
          grid-template-columns: repeat(3, 48px);
          grid-template-rows: repeat(3, 48px);
        }

        ol {
          display: grid;
          gap: 6px;
          margin: 0;
          padding-left: 20px;
        }

        button {
          min-height: 30px;
          border: 1px solid #c9d1df;
          border-radius: 6px;
          background: #ffffff;
          color: #202124;
          cursor: pointer;
          font: inherit;
          font-size: 13px;
          padding: 0 10px;
        }

        @media (max-width: 560px) {
          .game {
            grid-template-columns: 1fr;
          }
        }
      </style>

      <section class="game">
        <header>
          <h2>{{ caption }}</h2>
          <button type="button" ng-click="reset()">Reset</button>
        </header>
        <div>
          <div class="status" role="status">{{ status }}</div>
          <div class="board" role="group" aria-label="Tic Tac Toe board">
            <tic-square index="0" ng-prop-value="squares[0]" ng-on-square-play="play($event.detail.index)"></tic-square>
            <tic-square index="1" ng-prop-value="squares[1]" ng-on-square-play="play($event.detail.index)"></tic-square>
            <tic-square index="2" ng-prop-value="squares[2]" ng-on-square-play="play($event.detail.index)"></tic-square>
            <tic-square index="3" ng-prop-value="squares[3]" ng-on-square-play="play($event.detail.index)"></tic-square>
            <tic-square index="4" ng-prop-value="squares[4]" ng-on-square-play="play($event.detail.index)"></tic-square>
            <tic-square index="5" ng-prop-value="squares[5]" ng-on-square-play="play($event.detail.index)"></tic-square>
            <tic-square index="6" ng-prop-value="squares[6]" ng-on-square-play="play($event.detail.index)"></tic-square>
            <tic-square index="7" ng-prop-value="squares[7]" ng-on-square-play="play($event.detail.index)"></tic-square>
            <tic-square index="8" ng-prop-value="squares[8]" ng-on-square-play="play($event.detail.index)"></tic-square>
          </div>
        </div>
        <ol>
          <li ng-repeat="move in moves" data-index="id">
            <button type="button" ng-click="jumpTo(move.id)">
              {{ move.label }}
            </button>
          </li>
        </ol>
      </section>
    </div>
  `;

  connected() {
    const scope = this.scope;

    const createEmptyBoard = () => Array(9).fill("");

    const sync = () => {
      const currentSquares = scope.history[scope.currentMove];

      scope.squares.splice(0, scope.squares.length, ...currentSquares);
      scope.moves = scope.history.map((_, move) => ({
        id: move,
        label: move > 0 ? `Go to move #${move}` : "Go to game start",
      }));

      const winner = calculateWinner(scope.squares);

      if (winner) {
        scope.status = `Winner: ${winner}`;
      } else {
        scope.status = `Next player: ${scope.currentMove % 2 === 0 ? "X" : "O"}`;
      }
    };

    scope.reset = () => {
      scope.history = [createEmptyBoard()];
      scope.currentMove = 0;
      sync();
    };

    scope.play = (index) => {
      if (calculateWinner(scope.squares) || scope.squares[index]) return;

      const nextSquares = scope.squares.slice();

      nextSquares[index] = scope.currentMove % 2 === 0 ? "X" : "O";
      scope.history = [
        ...scope.history.slice(0, scope.currentMove + 1),
        nextSquares,
      ];
      scope.currentMove = scope.history.length - 1;
      sync();
    };

    scope.jumpTo = (move) => {
      scope.currentMove = move;
      sync();
    };

    scope.reset();
  }
}

function calculateWinner(squares) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (const [a, b, c] of lines) {
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a];
    }
  }

  return null;
}

angular
  .module("scopeElementDemo", ["ng"])
  .webComponent("tic-square", SquareElement)
  .webComponent("tic-board", BoardElement);
