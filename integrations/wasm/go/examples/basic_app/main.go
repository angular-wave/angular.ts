//go:build js && wasm

package main

import (
	"strings"
	"syscall/js"

	angularwasm "angular.ts/wasm/go"
)

type Todo struct {
	Task string `json:"task"`
	Done bool   `json:"done"`
}

type TodoApp struct {
	scope     angularwasm.BrowserScope
	watch     angularwasm.BrowserWatch
	items     []Todo
	newTodo   string
	titleSeen string
}

var keptFunctions []js.Func

func main() {
	app := &TodoApp{}
	registerController(app)

	js.Global().Call(
		"dispatchEvent",
		js.Global().Get("CustomEvent").New("angular-ts-go-ready"),
	)

	select {}
}

func setFunc(target js.Value, name string, fn func(js.Value, []js.Value) any) {
	wrapped := js.FuncOf(fn)
	keptFunctions = append(keptFunctions, wrapped)
	target.Set(name, wrapped)
}

func (app *TodoApp) bind(_ js.Value, args []js.Value) any {
	scopeName := "goTodo:main"
	if len(args) > 0 && args[0].Truthy() {
		scopeName = args[0].String()
	}

	app.scope = angularwasm.BrowserNamed(scopeName)
	app.items = []Todo{
		{Task: "Learn AngularTS", Done: false},
		{Task: "Build a Go Wasm app", Done: false},
	}
	app.newTodo = ""
	app.titleSeen = ""
	app.bindScope(scopeName)

	return nil
}

func (app *TodoApp) onNewTodoChanged(value string) {
	app.newTodo = value
	app.titleSeen = value
}

func (app *TodoApp) add(_ js.Value, args []js.Value) any {
	title := app.newTodo
	if len(args) > 0 {
		title = args[0].String()
	}

	title = strings.TrimSpace(title)
	if title == "" {
		return nil
	}

	app.items = append(app.items, Todo{Task: title})
	app.newTodo = ""
	app.titleSeen = ""

	return nil
}

func (app *TodoApp) toggle(_ js.Value, args []js.Value) any {
	if len(args) == 0 {
		return nil
	}

	index := args[0].Int()
	if index < 0 || index >= len(app.items) {
		return nil
	}

	app.items[index].Done = !app.items[index].Done

	return nil
}

func (app *TodoApp) archive(_ js.Value, _ []js.Value) any {
	open := make([]Todo, 0, len(app.items))
	for _, item := range app.items {
		if !item.Done {
			open = append(open, item)
		}
	}

	app.items = open

	return nil
}

func (app *TodoApp) unbind(_ js.Value, _ []js.Value) any {
	app.unbindScope()

	return nil
}

func (app *TodoApp) remainingCount() int {
	count := 0
	for _, item := range app.items {
		if !item.Done {
			count++
		}
	}

	return count
}
