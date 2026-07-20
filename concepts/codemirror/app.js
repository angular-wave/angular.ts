const editorViews = new WeakMap();

window.angular
  .module("codemirrorConcept", [])
  .model("editorModel", () => ({
    status: "loading",
    title: "runtime-notes.js",
    text: "const runtime = 'CodeMirror';\nconsole.log(runtime);\n",
    cursorLine: 1,
    cursorColumn: 1,
    changeCount: 0,
    savedText: "const runtime = 'CodeMirror';\nconsole.log(runtime);\n",
  }))
  .controller(
    "DemoCtrl",
    class {
      static $inject = ["editorModel", "$scope"];

      constructor(editorModel, $scope) {
        this.editor = editorModel;
        this.destroyRuntime = () => {};
        $scope.$on("$destroy", () => this.destroyRuntime());
        requestAnimationFrame(() => this.mount());
      }

      save() {
        this.editor.savedText = this.editor.text;
      }

      reset() {
        this.replaceEditorText(this.editor.savedText);
      }

      insertLog() {
        this.insertText("\nconsole.log('AngularTS model sync');");
      }

      rename() {
        this.editor.title =
          this.editor.title === "runtime-notes.js"
            ? "runtime-proof.js"
            : "runtime-notes.js";
      }

      async mount() {
        const viewModule = await import(
          "https://esm.sh/@codemirror/view@6.36.8?bundle"
        );
        const { EditorView, keymap, lineNumbers } = viewModule;
        const updateModel = EditorView.updateListener.of((update) => {
          if (!update.docChanged && !update.selectionSet) return;

          const nextText = update.state.doc.toString();
          const cursor = update.state.selection.main.head;
          const line = update.state.doc.lineAt(cursor);

          if (this.editor.text !== nextText) {
            this.editor.text = nextText;
            this.editor.changeCount += 1;
          }

          this.editor.cursorLine = line.number;
          this.editor.cursorColumn = cursor - line.from + 1;
        });

        const view = new EditorView({
          parent: document.getElementById("editor-runtime"),
          doc: this.editor.text,
          extensions: [lineNumbers(), keymap.of([]), updateModel],
        });

        editorViews.set(this.editor, view);
        this.editor.status = "ready";

        this.destroyRuntime = () => {
          editorViews.get(this.editor)?.destroy();
          editorViews.delete(this.editor);
        };
      }

      insertText(value) {
        const view = editorViews.get(this.editor);

        if (!view) return;

        const selection = view.state.selection.main;

        view.dispatch({
          changes: {
            from: selection.from,
            to: selection.to,
            insert: value,
          },
          selection: {
            anchor: selection.from + value.length,
          },
          scrollIntoView: true,
        });
        view.focus();
      }

      replaceEditorText(value) {
        const view = editorViews.get(this.editor);

        if (!view) {
          this.editor.text = value;

          return;
        }

        view.dispatch({
          changes: {
            from: 0,
            to: view.state.doc.length,
            insert: value,
          },
          selection: {
            anchor: 0,
          },
          scrollIntoView: true,
        });
      }
    },
  );
