using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.InteropServices.JavaScript;
using System.Runtime.Versioning;
using AngularTs.Wasm;

namespace AngularTs.Wasm.Todo;

public sealed record TodoItem(string Task, bool Done);

[SupportedOSPlatform("browser")]
public static partial class Todo
{
    private const int MaxItems = 8;
    private const string ScopeName = "csharpTodo:main";

    private static Scope _scope;
    private static Watch _watch;
    private static readonly List<TodoItem> Items = new();
    private static string _newTodo = string.Empty;

    [JSExport]
    public static void TodoBind(string? scopeName = null)
    {
        _scope = Scope.Named(scopeName ?? ScopeName);
        _watch = _scope.Watch("newTodo", OnScopeUpdate);

        Items.Clear();
        Items.Add(new TodoItem("Learn AngularTS", false));
        Items.Add(new TodoItem("Build a C# Wasm app", false));
        _newTodo = string.Empty;

        Sync();
    }

    [JSExport]
    public static void TodoAdd(string? title)
    {
        var normalized = (title ?? string.Empty).Trim();

        if (normalized.Length == 0 || Items.Count >= MaxItems)
        {
            return;
        }

        Items.Add(new TodoItem(normalized, false));
        _newTodo = string.Empty;
        Sync();
    }

    [JSExport]
    public static void TodoToggle(int index)
    {
        if (index < 0 || index >= Items.Count)
        {
            return;
        }

        var item = Items[index];
        Items[index] = item with { Done = !item.Done };
        Sync();
    }

    [JSExport]
    public static void TodoArchiveCompleted()
    {
        Items.RemoveAll(item => item.Done);
        Sync();
    }

    [JSExport]
    public static void TodoUnbind()
    {
        _watch.Unwatch();
        _scope.Unbind();
    }

    [JSExport]
    public static int TodoItemCount()
    {
        return Items.Count;
    }

    [JSExport]
    public static int TodoRemainingCount()
    {
        return RemainingCount();
    }

    [JSExport]
    public static string TodoItemsJson()
    {
        return _scope.GetJson("items");
    }

    private static void OnScopeUpdate(ScopeUpdate update)
    {
        if (update.Path != "newTodo")
        {
            return;
        }

        _newTodo = DecodeFlatJsonString(update.Json);
    }

    private static void Sync()
    {
        _scope.SetJson("items", EncodeItemsJson());
        _scope.SetJson("remainingCount", RemainingCount().ToString());
        _scope.SetJson("newTodo", EncodeJsonString(_newTodo));
        _ = _scope.GetJson("items");
        _scope.Sync();
    }

    private static int RemainingCount()
    {
        return Items.Count(item => !item.Done);
    }

    private static string EncodeItemsJson()
    {
        return "[" + string.Join(
            ",",
            Items.Select(item =>
                "{\"task\":" +
                EncodeJsonString(item.Task) +
                ",\"done\":" +
                (item.Done ? "true" : "false") +
                "}")) + "]";
    }

    private static string EncodeJsonString(string value)
    {
        return "\"" +
            value
                .Replace("\\", "\\\\", StringComparison.Ordinal)
                .Replace("\"", "\\\"", StringComparison.Ordinal)
                .Replace("\n", "\\n", StringComparison.Ordinal)
                .Replace("\r", "\\r", StringComparison.Ordinal)
                .Replace("\t", "\\t", StringComparison.Ordinal) +
            "\"";
    }

    private static string DecodeFlatJsonString(string value)
    {
        if (value.Length >= 2 && value[0] == '"' && value[^1] == '"')
        {
            return value[1..^1];
        }

        return value;
    }
}
