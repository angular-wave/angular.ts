import { dealoc } from "../../shared/dom.js";
import { Angular } from "../../angular.js";
import { wait } from "../../shared/test-utils.js";

describe("ngView", () => {
  describe("scrollIntoView", () => {
    let elem, $anchorScroll, $viewScroll;

    beforeEach(() => {
      dealoc(document.getElementById("app"));
      window.angular = new Angular();
      window.angular.module("defaultModule", []);
      let $injector = window.angular.bootstrap(document.getElementById("app"), [
        "defaultModule",
      ]);

      $injector.invoke((_$viewScroll_, _$anchorScroll_) => {
        $anchorScroll = _$anchorScroll_;
        $viewScroll = _$viewScroll_;
      });
      elem = [{ scrollIntoView: jasmine.createSpy("scrollIntoView") }];
    });

    it("should scroll element into view after timeout", async () => {
      $viewScroll(elem[0]);
      expect(elem[0].scrollIntoView).not.toHaveBeenCalled();

      await wait(100);
      expect(elem[0].scrollIntoView).toHaveBeenCalled();
    });

    it("should return the promise from the timeout", async () => {
      dealoc(document.getElementById("app"));
      const promise = $viewScroll(elem[0]);

      await wait(10);
      expect(elem[0].scrollIntoView).toHaveBeenCalled();
      expect(promise).toBeDefined();
    });
  });

  describe("useAnchorScroll", () => {
    let elem, $anchorScroll, $viewScroll;

    beforeEach(() => {
      dealoc(document.getElementById("app"));
      window.angular = new Angular();
      let module = window.angular.module("defaultModule", []);
      module.config(($provide, $viewScrollProvider) => {
        $provide.decorator("$anchorScroll", function ($delegate) {
          return jasmine.createSpy("$anchorScroll");
        });
        $viewScrollProvider.useAnchorScroll();
      });

      let $injector = window.angular.bootstrap(document.getElementById("app"), [
        "defaultModule",
      ]);

      $injector.invoke((_$viewScroll_, _$anchorScroll_) => {
        $anchorScroll = _$anchorScroll_;
        $viewScroll = _$viewScroll_;
      });
      elem = [{ scrollIntoView: jasmine.createSpy("scrollIntoView") }];
    });

    it("should call $anchorScroll", () => {
      $viewScroll();
      expect($anchorScroll).toHaveBeenCalled();
    });
  });
});
