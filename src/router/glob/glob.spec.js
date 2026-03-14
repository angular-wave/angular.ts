import { Glob, hasGlobs } from "./glob.js";

describe("hasGlobs", () => {
  it("should return true for strings containing asterisk (*)", () => {
    expect(hasGlobs("file*.js")).toBe(true);
  });

  it("should return true for strings containing exclamation mark (!)", () => {
    expect(hasGlobs("!important")).toBe(true);
  });

  it("should return true for strings containing comma (,)", () => {
    expect(hasGlobs("file1.js,file2.js")).toBe(true);
  });

  it("should return true for strings containing multiple glob characters", () => {
    expect(hasGlobs("!file*.js,file?.ts")).toBe(true);
  });

  it("should return false for strings without glob characters", () => {
    expect(hasGlobs("file.js")).toBe(false);
  });

  it("should return false for an empty string", () => {
    expect(hasGlobs("")).toBe(false);
  });

  it("should return false for strings with special characters not in the glob list", () => {
    expect(hasGlobs("file#name@2025")).toBe(false);
  });
});

describe("Glob", function () {
  it("should match exact strings", function () {
    let state = "about.person.item";

    expect(new Glob("about.person.item").matches(state)).toBe(true);
    expect(new Glob("about.person.item.foo").matches(state)).toBe(false);
    expect(new Glob("foo.about.person.item").matches(state)).toBe(false);
  });

  it("with a single wildcard (*) should match a top level state", function () {
    let glob = new Glob("*");

    expect(glob.matches("foo")).toBe(true);
    expect(glob.matches("bar")).toBe(true);
    expect(glob.matches("baz")).toBe(true);
    expect(glob.matches("foo.bar")).toBe(false);
    expect(glob.matches(".baz")).toBe(false);
  });

  it("with a single wildcard (*) should match any single non-empty segment", function () {
    let state = "about.person.item";

    expect(new Glob("*.person.item").matches(state)).toBe(true);
    expect(new Glob("*.*.item").matches(state)).toBe(true);
    expect(new Glob("*.person.*").matches(state)).toBe(true);
    expect(new Glob("*.*.*").matches(state)).toBe(true);

    expect(new Glob("*.*.*.*").matches(state)).toBe(false);
    expect(new Glob("*.*.person.item").matches(state)).toBe(false);
    expect(new Glob("*.person.item.foo").matches(state)).toBe(false);
    expect(new Glob("foo.about.person.*").matches(state)).toBe(false);
  });

  it("with a double wildcard (**) should match any valid state name", function () {
    let glob = new Glob("**");

    expect(glob.matches("foo")).toBe(true);
    expect(glob.matches("bar")).toBe(true);
    expect(glob.matches("foo.bar")).toBe(true);
  });

  it("with a double wildcard (**) should match zero or more segments", function () {
    let state = "about.person.item";

    expect(new Glob("**").matches(state)).toBe(true);
    expect(new Glob("**.**").matches(state)).toBe(true);
    expect(new Glob("**.*").matches(state)).toBe(true);
    expect(new Glob("**.person.item").matches(state)).toBe(true);
    expect(new Glob("**.person.**").matches(state)).toBe(true);
    expect(new Glob("**.person.**.item").matches(state)).toBe(true);
    expect(new Glob("**.person.**.*").matches(state)).toBe(true);
    expect(new Glob("**.item").matches(state)).toBe(true);
    expect(new Glob("about.**").matches(state)).toBe(true);
    expect(new Glob("about.**.person.item").matches(state)).toBe(true);
    expect(new Glob("about.person.item.**").matches(state)).toBe(true);
    expect(new Glob("**.about.person.item").matches(state)).toBe(true);
    expect(new Glob("**.about.**.person.item.**").matches(state)).toBe(true);
    expect(new Glob("**.**.about.person.item").matches(state)).toBe(true);

    expect(new Glob("**.person.**.*.*").matches(state)).toBe(false);
    expect(new Glob("**.person.**.*.item").matches(state)).toBe(false);

    // Tests for #2438
    expect(new Glob("**.todo.*").matches("awesome.edit.todo.inbox")).toBe(true);
    expect(new Glob("*.todo.*").matches("awesome.edit.todo.inbox")).toBe(false);
    expect(new Glob("**.todo.*.*").matches("awesome.edit.todo.inbox")).toBe(
      false,
    );
    expect(new Glob("**.todo.**").matches("awesome.edit.todo.inbox")).toBe(
      true,
    );
    expect(new Glob("**.todo.**.*").matches("awesome.edit.todo.inbox")).toBe(
      true,
    );
  });
});
