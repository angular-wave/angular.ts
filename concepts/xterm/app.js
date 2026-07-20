const terminals = new WeakMap();

window.angular
  .module("xtermConcept", [])
  .model("terminalModel", () => ({
    status: "loading",
    connected: false,
    currentCommand: "",
    lastCommand: "",
    lineCount: 0,
  }))
  .controller(
    "DemoCtrl",
    class {
      static $inject = ["terminalModel", "$scope"];

      constructor(terminalModel, $scope) {
        this.terminal = terminalModel;
        this.destroyRuntime = () => {};
        $scope.$on("$destroy", () => this.destroyRuntime());
        requestAnimationFrame(() => this.mount());
      }

      connect() {
        const term = terminals.get(this.terminal);

        if (!term || this.terminal.connected) return;

        this.terminal.connected = true;
        this.terminal.status = "connected";
        term.writeln("\r\nconnected to angular-ts://runtime");
        this.writePrompt(term);
      }

      disconnect() {
        const term = terminals.get(this.terminal);

        if (!term || !this.terminal.connected) return;

        this.terminal.connected = false;
        this.terminal.status = "disconnected";
        term.writeln("\r\ndisconnected");
      }

      sendPing() {
        const term = terminals.get(this.terminal);

        if (!term || !this.terminal.connected) return;

        this.runCommand(term, "ping");
      }

      clear() {
        const term = terminals.get(this.terminal);

        if (!term) return;

        term.clear();
        this.terminal.currentCommand = "";
        this.terminal.lastCommand = "";
        this.terminal.lineCount = 0;
        this.writePrompt(term);
      }

      mount() {
        const term = new window.Terminal({
          cursorBlink: true,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 14,
          rows: 14,
        });

        terminals.set(this.terminal, term);
        term.open(document.getElementById("terminal-runtime"));
        term.writeln("AngularTS xterm.js concept");
        term.writeln("Type a command, then press Enter.");
        this.terminal.status = "ready";
        this.terminal.connected = true;
        this.writePrompt(term);

        term.onData((input) => this.handleInput(term, input));

        this.destroyRuntime = () => {
          term.dispose();
          terminals.delete(this.terminal);
        };
      }

      handleInput(term, input) {
        if (!this.terminal.connected) return;

        if (input === "\r") {
          term.writeln("");
          this.runCommand(term, this.terminal.currentCommand.trim());

          return;
        }

        if (input === "\u007f") {
          if (!this.terminal.currentCommand) return;

          this.terminal.currentCommand = this.terminal.currentCommand.slice(
            0,
            -1,
          );
          term.write("\b \b");

          return;
        }

        if (input < " " || input === "\u001b") return;

        this.terminal.currentCommand += input;
        term.write(input);
      }

      runCommand(term, command) {
        const normalized = command || "help";

        this.terminal.lastCommand = normalized;
        this.terminal.currentCommand = "";
        this.terminal.lineCount += 1;

        if (normalized === "ping") {
          term.writeln("pong from AngularTS model");
        } else if (normalized === "status") {
          term.writeln(`status=${this.terminal.status}`);
        } else {
          term.writeln(`echo: ${normalized}`);
        }

        this.writePrompt(term);
      }

      writePrompt(term) {
        term.write("\r\n$ ");
      }
    },
  );
