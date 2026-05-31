import { NgModule } from "./ng-module.ts";

class GameStateService {
  strikeCount = 0;
}

class InjectedGameStateService {
  static $inject = ["gameState"];

  constructor(readonly gameState: GameStateService) {}
}

const module = new NgModule("type-regression", []);

module.service("gameState", GameStateService);
module.service("injectedGameState", InjectedGameStateService);
module.service("legacyGameState", function LegacyGameStateService() {
  return undefined;
});
module.machine<{ roomId: string }, { join: { roomId: string } }>(
  "sessionMachine",
  {
    initial: "setup",
    data: {
      roomId: "",
    },
    transitions: {
      setup: {
        join(data, payload: { roomId: string }) {
          data.roomId = payload.roomId;
          return "waiting";
        },
      },
    },
  },
);
