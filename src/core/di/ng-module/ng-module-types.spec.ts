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
