/// <reference types="jasmine" />

const mode = new URL(window.location.href).searchParams.get("mode");

if (mode === "failure") {
  describe("Playwright Jasmine bridge", () => {
    it("captures failed expectations", () => {
      expect(1).toBe(2);
    });
  });
} else {
  fdescribe("Playwright Jasmine bridge", () => {
    it("captures focused runs", () => {
      expect(true).toBeTrue();
    });
  });
}
