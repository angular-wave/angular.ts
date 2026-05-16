// @ts-nocheck
/// <reference types="jasmine" />
import { createElementFromHTML, dealoc, getScope } from "../../shared/dom.ts";
import { Angular } from "../../angular.ts";
import { createInjector } from "../../core/di/injector.ts";
import { wait, waitUntil } from "../../shared/test-utils.ts";

const EL = document.getElementById("app");

describe("ngInclude", () => {
  describe("basic", () => {
    let element;

    let $rootScope;

    let $templateCache;

    let $compile;

    let module;

    let injector;

    let angular;

    let errorLog = [];

    beforeEach(() => {
      errorLog = [];
      dealoc(document.getElementById("app"));
      delete window.angular;
      angular = window.angular = new Angular();
      module = angular
        .module("myModule", ["ng"])
        .decorator("$exceptionHandler", function () {
          return (exception) => {
            errorLog.push(exception.message);
          };
        });
      // module = window.angular.module("myModule", []);
      injector = createInjector(["myModule"]);
      $rootScope = injector.get("$rootScope");
      $templateCache = injector.get("$templateCache");
      $compile = injector.get("$compile");
    });

    // afterEach(() => {
    //   dealoc(element);
    // });

    it("should trust and use literal urls", async () => {
      const element = createElementFromHTML(
        "<div><div ng-include=\"'/public/test.html'\"></div></div>",
      );

      const injector = angular.bootstrap(element);

      $rootScope = injector.get("$rootScope");
      await waitUntil(() => element.textContent === "hello\n");
      expect(element.textContent).toEqual("hello\n");
    });

    it("should trust and use trusted urls", async () => {
      const element = createElementFromHTML(
        '<div><div ng-include="fooUrl">test</div></div>',
      );

      const injector = angular.bootstrap(element);

      const $sce = injector.get("$sce");

      $rootScope = injector.get("$rootScope");
      $rootScope.fooUrl = $sce.trustAsResourceUrl(
        `${window.location.origin}/mock/hello`,
      );
      await waitUntil(() => element.textContent === "Hello");
      expect(element.textContent).toEqual("Hello");
    });

    it("should include an external file", async () => {
      element = createElementFromHTML(
        '<div><ng-include src="url"></ng-include></div>',
      );
      const body = document.getElementById("app");

      body.append(element);
      const injector = angular.bootstrap(element);

      $rootScope = injector.get("$rootScope");
      $templateCache = injector.get("$templateCache");
      $templateCache.set("myUrl", [200, "{{name}}", {}]);
      $rootScope.name = "misko";
      $rootScope.url = "myUrl";
      await waitUntil(() => body.textContent === "misko");
      expect(body.textContent).toEqual("misko");
    });

    it("should support normalized data-src aliases", async () => {
      element = createElementFromHTML(
        '<div><ng-include data-src="url"></ng-include></div>',
      );
      const body = document.getElementById("app");

      body.append(element);
      const injector = angular.bootstrap(element);

      $rootScope = injector.get("$rootScope");
      $templateCache = injector.get("$templateCache");
      $templateCache.set("myUrl", [200, "{{name}}", {}]);
      $rootScope.name = "misko";
      $rootScope.url = "myUrl";
      await waitUntil(() => body.textContent === "misko");
      expect(body.textContent).toEqual("misko");
    });

    it('should support ng-include="src" syntax', async () => {
      element = createElementFromHTML(
        '<div><div ng-include="url"></div></div>',
      );
      const injector = angular.bootstrap(element);

      $rootScope = injector.get("$rootScope");
      $rootScope.expr = "Alibaba";
      $rootScope.url = "/mock/interpolation";
      await waitUntil(() => element.textContent === "Alibaba");
      expect(element.textContent).toEqual("Alibaba");
    });

    it("should support normalized data-ng-include aliases", async () => {
      element = createElementFromHTML(
        '<div><div data-ng-include="url"></div></div>',
      );
      const injector = angular.bootstrap(element);

      $rootScope = injector.get("$rootScope");
      $rootScope.expr = "Alibaba";
      $rootScope.url = "/mock/interpolation";
      await waitUntil(() => element.textContent === "Alibaba");
      expect(element.textContent).toEqual("Alibaba");
    });

    it("should fetch and cache template URLs as provided", async () => {
      const element = createElementFromHTML(
        '<ng-include src="url"></ng-include>',
      );

      const injector = angular.bootstrap(element, ["myModule"]);

      const $rootScope = injector.get("$rootScope");

      const $templateCache = injector.get("$templateCache");

      $rootScope.url = "https://angular-wave.github.io/angular.ts/";

      await waitUntil(() => $templateCache.get($rootScope.url) !== undefined);
      expect($templateCache.get($rootScope.url)).toBeDefined();
    });

    it("should remove previously included text if a falsy value is bound to src", async () => {
      element = createElementFromHTML(
        '<div><ng-include src="url"></ng-include></div>',
      );
      const injector = angular.bootstrap(element);

      $rootScope = injector.get("$rootScope");
      $rootScope.expr = "igor";
      $rootScope.url = "/mock/interpolation";
      await waitUntil(() => element.textContent === "igor");
      expect(element.textContent).toEqual("igor");

      $rootScope.url = undefined;
      await waitUntil(() => element.textContent === "");
      expect(element.textContent).toEqual("");
    });

    it("should fire $includeContentRequested event on scope after making the xhr call", async () => {
      let called = false;

      module.run(($rootScope) => {
        $rootScope.$on("$includeContentRequested", (event) => {
          called = true;
        });
      });
      element = createElementFromHTML(
        '<div><div><ng-include src="url"></ng-include></div></div>',
      );
      const injector = angular.bootstrap(element, ["myModule"]);

      $rootScope = injector.get("$rootScope");
      $rootScope.url = "/mock/interpolation";
      await waitUntil(() => called);
      expect(called).toBe(true);
    });

    it("should fire $includeContentLoaded event on child scope after linking the content", async () => {
      let called = false;

      window.angular.module("myModule", []).run(($rootScope) => {
        $rootScope.$on("$includeContentLoaded", () => {
          called = true;
        });
      });
      element = createElementFromHTML(
        '<div><div><ng-include src="url"></ng-include></div></div>',
      );
      const injector = angular.bootstrap(element, ["myModule"]);

      $rootScope = injector.get("$rootScope");
      $rootScope.url = "/mock/interpolation";
      await waitUntil(() => called);
      expect(called).toBe(true);
    });

    it("should fire $includeContentError event when content request fails", async () => {
      const contentLoadedSpy = jasmine.createSpy("content loaded");

      const contentErrorSpy = jasmine.createSpy("content error");

      module.run(($rootScope) => {
        $rootScope.url = "/mock/401";
        $rootScope.$on("$includeContentLoaded", contentLoadedSpy);
        $rootScope.$on("$includeContentError", contentErrorSpy);
      });

      element = createElementFromHTML(
        '<div><div><ng-include src="url"></ng-include></div></div>',
      );

      const injector = angular.bootstrap(element, ["myModule"]);

      $rootScope = injector.get("$rootScope");
      await waitUntil(() => contentErrorSpy.calls.any());
      expect(contentLoadedSpy).not.toHaveBeenCalled();
      expect(contentErrorSpy).toHaveBeenCalled();
    });

    it("should evaluate onload expression when a partial is loaded", async () => {
      element = createElementFromHTML(
        '<div><div><ng-include src="url" onload="loaded = true"></ng-include></div></div>',
      );
      const injector = angular.bootstrap(element, ["myModule"]);

      $rootScope = injector.get("$rootScope");
      expect($rootScope.loaded).not.toBeDefined();
      $rootScope.url = "/mock/hello";
      await waitUntil(() => $rootScope.loaded === true);
      expect(element.textContent).toEqual("Hello");
      expect($rootScope.loaded).toBe(true);
    });

    it("should create child scope and destroy old one", async () => {
      element = createElementFromHTML(
        '<div><ng-include src="url"></ng-include></div>',
      );
      const injector = angular.bootstrap(element, ["myModule"]);

      $rootScope = injector.get("$rootScope");
      expect($rootScope._children.length).toBe(1);

      $rootScope.url = "/mock/hello";
      await waitUntil(() => element.textContent === "Hello");
      expect($rootScope._children.length).toBe(2);
      expect(element.textContent).toBe("Hello");

      $rootScope.url = "/mock/401";

      await waitUntil(
        () => $rootScope._children.length === 1 && element.textContent === "",
      );
      expect($rootScope._children.length).toBe(1);
      expect(element.textContent).toBe("");
    });

    it("should do xhr request and cache it", async () => {
      element = createElementFromHTML(
        '<div><ng-include src="url"></ng-include></div>',
      );
      const injector = angular.bootstrap(element, ["myModule"]);

      $rootScope = injector.get("$rootScope");
      $rootScope.url = "/mock/hello";
      await waitUntil(() => element.textContent === "Hello");

      expect(element.textContent).toEqual("Hello");
      $rootScope.url = null;
      await waitUntil(() => element.textContent === "");
      expect(element.textContent).toEqual("");
      $rootScope.url = "/mock/hello";
      await waitUntil(() => element.textContent === "Hello");
      // No request being made
      expect(element.textContent).toEqual("Hello");
    });

    it("should clear content when error during xhr request", async () => {
      element = createElementFromHTML(
        '<div><ng-include src="url">content</ng-include></div>',
      );
      const injector = angular.bootstrap(element, ["myModule"]);

      $rootScope = injector.get("$rootScope");
      $rootScope.url = "/mock/401";
      await waitUntil(() => element.textContent === "");
      expect(element.textContent).toBe("");
    });

    it("should be async even if served from cache", async () => {
      element = createElementFromHTML(
        '<div><ng-include src="url"></ng-include></div>',
      );
      const injector = angular.bootstrap(element, ["myModule"]);

      $rootScope = injector.get("$rootScope");
      $rootScope.url = "/mock/hello";

      await waitUntil(() => element.textContent === "Hello");
      expect(element.textContent).toBe("Hello");
    });

    it("should discard pending xhr callbacks if a new template is requested before the current finished loading", async () => {
      element = createElementFromHTML(
        "<div><ng-include src='templateUrl'></ng-include></div>",
      );
      const injector = angular.bootstrap(element, ["myModule"]);

      $rootScope = injector.get("$rootScope");
      $rootScope.templateUrl = "/mock/hello";
      $rootScope.expr = "test";
      $rootScope.templateUrl = "/mock/interpolation";
      expect(element.textContent).toBe("");

      await waitUntil(() => element.textContent === "test");
      expect(element.textContent).toBe("test");
    });

    it("should not break attribute bindings on the same element", async () => {
      window.angular.module("myModule", []);
      element = createElementFromHTML(
        '<div><span foo="#/{{hrefUrl}}" ng-include="includeUrl"></span></div>',
      );
      const injector = angular.bootstrap(element, ["myModule"]);

      $rootScope = injector.get("$rootScope");
      $rootScope.hrefUrl = "fooUrl1";
      $rootScope.includeUrl = "/mock/hello";
      await waitUntil(() => element.textContent === "Hello");
      expect(element.textContent).toBe("Hello");
      expect(element.querySelector("span").getAttribute("foo")).toBe(
        "#/fooUrl1",
      );

      $rootScope.hrefUrl = "fooUrl2";
      await waitUntil(
        () => element.querySelector("span").getAttribute("foo") === "#/fooUrl2",
      );
      expect(element.textContent).toBe("Hello");
      expect(element.querySelector("span").getAttribute("foo")).toBe(
        "#/fooUrl2",
      );

      $rootScope.includeUrl = "/mock/hello2";
      await waitUntil(() => element.textContent === "Hello2");
      expect(element.textContent).toBe("Hello2");
      expect(element.querySelector("span").getAttribute("foo")).toBe(
        "#/fooUrl2",
      );
    });

    it("should construct SVG template elements with correct namespace", async () => {
      window.angular.module("myModule", []).directive("test", () => ({
        templateNamespace: "svg",
        templateUrl: "/mock/my-rect.html",
        replace: true,
      }));
      EL.innerHTML = "<svg><test></test></svg>";
      angular.bootstrap(EL, ["myModule"]);
      await waitUntil(() => EL.querySelectorAll("rect").length === 2);
      const child = EL.querySelectorAll("rect");

      expect(child.length).toBe(2);
      expect(child[0] instanceof SVGRectElement).toBe(true);
    });

    it("should compile only the template content of an SVG template", async () => {
      window.angular.module("myModule", []).directive("test", () => ({
        templateNamespace: "svg",
        templateUrl: "/mock/my-rect2.html",
        replace: true,
      }));
      element = createElementFromHTML("<svg><test></test></svg>");
      const injector = angular.bootstrap(element, ["myModule"]);

      $rootScope = injector.get("$rootScope");
      await waitUntil(() => element.querySelectorAll("rect").length > 0);
      expect(element.querySelectorAll("a").length).toBe(0);
    });

    it("should not compile template if original scope is destroyed", (done) => {
      window.angular.module("myModule", []);
      element = createElementFromHTML(
        '<div ng-if="show"><div ng-include="\'/mock/hello\'"></div></div>',
      );
      const injector = angular.bootstrap(element, ["myModule"]);

      $rootScope = injector.get("$rootScope");
      $rootScope.show = true;
      $rootScope.show = false;
      setTimeout(() => {
        expect(element.textContent).toBe("");
        done();
      }, 200);
    });

    describe("autoscroll", () => {
      let autoScrollSpy;

      let $animate;

      it("should call $anchorScroll if autoscroll attribute is present", async () => {
        window.angular.module("myModule", [
          function ($provide) {
            autoScrollSpy = jasmine.createSpy("$anchorScroll");
            $provide.value("$anchorScroll", autoScrollSpy);
          },
        ]);
        element = createElementFromHTML(
          '<div><ng-include src="tpl" autoscroll></ng-include></div>',
        );
        const injector = angular.bootstrap(element, ["myModule"]);

        $rootScope = injector.get("$rootScope");
        $animate = injector.get("$animate");
        $rootScope.tpl = "/mock/hello";

        await waitUntil(() => autoScrollSpy.calls.any());
        expect(autoScrollSpy).toHaveBeenCalled();
      });

      it("should call $anchorScroll if autoscroll evaluates to true", async () => {
        window.angular.module("myModule", [
          function ($provide) {
            autoScrollSpy = jasmine.createSpy("$anchorScroll");
            $provide.value("$anchorScroll", autoScrollSpy);
          },
        ]);
        element = createElementFromHTML(
          '<div><ng-include src="tpl" autoscroll="value"></ng-include></div>',
        );
        const injector = angular.bootstrap(element, ["myModule"]);

        $rootScope = injector.get("$rootScope");

        $rootScope.tpl = "/mock/hello";
        $rootScope.value = true;

        await waitUntil(() => autoScrollSpy.calls.any());
        expect(autoScrollSpy).toHaveBeenCalled();
      });

      it("should not call $anchorScroll if autoscroll attribute is not present", async () => {
        window.angular.module("myModule", [
          function ($provide) {
            autoScrollSpy = jasmine.createSpy("$anchorScroll");
            $provide.value("$anchorScroll", autoScrollSpy);
          },
        ]);

        element = createElementFromHTML(
          '<div><ng-include src="tpl"></ng-include></div>',
        );
        const injector = angular.bootstrap(element, ["myModule"]);

        $rootScope = injector.get("$rootScope");

        $rootScope.tpl = "/mock/hello";
        await waitUntil(() => element.textContent === "Hello");
        expect(autoScrollSpy).not.toHaveBeenCalled();
      });

      it("should not call $anchorScroll if autoscroll evaluates to false", async () => {
        window.angular.module("myModule", [
          function ($provide) {
            autoScrollSpy = jasmine.createSpy("$anchorScroll");
            $provide.value("$anchorScroll", autoScrollSpy);
          },
        ]);

        element = createElementFromHTML(
          '<div><ng-include src="tpl" autoscroll="value"></ng-include></div>',
        );
        const injector = angular.bootstrap(element, ["myModule"]);

        $rootScope = injector.get("$rootScope");

        $rootScope.tpl = "/mock/hello";
        $rootScope.value = false;

        $rootScope.tpl = "/mock/hello";
        $rootScope.value = undefined;

        $rootScope.tpl = "/mock/hello";
        $rootScope.value = null;

        await waitUntil(() => element.textContent === "Hello");
        expect(autoScrollSpy).not.toHaveBeenCalled();
      });

      // it('should only call $anchorScroll after the "enter" animation completes', inject(
      //   compileAndLink(
      //     '<div><ng-include src="tpl" autoscroll></ng-include></div>',
      //   ),
      //   ($rootScope, $animate, $timeout) => {
      //     expect(autoScrollSpy).not.toHaveBeenCalled();

      //     expect($animate.queue.shift().event).toBe("enter");

      //     $animate.flush();
      //     ;

      //     expect(autoScrollSpy).toHaveBeenCalled();
      //   },
      // ));
    });

    describe("and transcludes", () => {
      let element;

      afterEach(() => {
        if (element) {
          dealoc(element);
        }
      });

      it("should allow access to directive controller from children when used in a replace template", async () => {
        let controller;

        window.angular
          .module("myModule", [])
          .directive("template", () => ({
            template: "<div ng-include=\"'/mock/directive'\"></div>",
            replace: true,
            controller() {
              this.flag = true;
            },
          }))
          .directive("test", () => ({
            require: "^template",
            link(scope, el, attr, ctrl) {
              controller = ctrl;
            },
          }));
        element = createElementFromHTML("<div><div template></div></div>");
        const injector = angular.bootstrap(element, ["myModule"]);

        $rootScope = injector.get("$rootScope");

        await waitUntil(() => controller !== undefined);
        expect(controller.flag).toBe(true);
      });

      it("should compile its content correctly (although we remove it later)", async () => {
        let testElement;

        window.angular.module("myModule", []).directive("test", () => ({
          link(scope, element) {
            testElement = element;
          },
        }));

        element = createElementFromHTML(
          "<div><div ng-include=\"'/mock/empty'\"><div test></div></div></div>",
        );
        const injector = angular.bootstrap(element, ["myModule"]);

        $rootScope = injector.get("$rootScope");

        await waitUntil(() => testElement !== undefined);
        expect(testElement.nodeName).toBe("DIV");
      });

      it("should link directives on the same element after the content has been loaded", async () => {
        let contentOnLink;

        window.angular.module("myModule", []).directive("test", () => ({
          link(scope, element) {
            contentOnLink = element.textContent;
          },
        }));
        element = createElementFromHTML(
          "<div><div ng-include=\"'/mock/hello'\" test></div>",
        );
        const injector = angular.bootstrap(element, ["myModule"]);

        $rootScope = injector.get("$rootScope");
        await waitUntil(() => contentOnLink === "Hello");
        expect(contentOnLink).toBe("Hello");
      });

      it("should add the content to the element before compiling it", async () => {
        let root;

        window.angular.module("myModule", []).directive("test", () => ({
          link(scope, el) {
            root = el.parentElement.parentElement.parentElement;
          },
        }));
        element = createElementFromHTML(
          "<div><div ng-include=\"'/mock/directive'\"></div>",
        );
        const injector = angular.bootstrap(element, ["myModule"]);

        $rootScope = injector.get("$rootScope");
        await waitUntil(() => root !== undefined);
        expect(root).toBe(element);
      });
    });

    // describe("and animations", () => {
    //   let body;
    //   let element;
    //   let $rootElement;

    //   function html(content) {
    //     $rootElement.html(content);
    //     element = $rootElement.children()[0];
    //     return element;
    //   }

    //   // beforeEach(
    //   //   module(
    //   //     () =>
    //   //       // we need to run animation on attached elements;
    //   //       function (_$rootElement_) {
    //   //         $rootElement = _$rootElement_;
    //   //         body = (document.body);
    //   //         body.append($rootElement);
    //   //       },
    //   //   ),
    //   // );

    //   afterEach(() => {
    //     dealoc(body);
    //     dealoc(element);
    //   });

    //   // beforeEach(module("ngAnimateMock"));

    //   afterEach(() => {
    //     dealoc(element);
    //   });

    //   it("should fire off the enter animation", () => {
    //     let item;

    //     $templateCache.set("enter", [200, "<div>data</div>", {}]);
    //     $rootScope.tpl = "enter";
    //     element = $compile(
    //       html("<div><div " + 'ng-include="tpl">' + "</div></div>"),
    //     )($rootScope);
    //     ;

    //     const animation = $animate.queue.pop();
    //     expect(animation.event).toBe("enter");
    //     expect(animation.element.textContent).toBe("data");
    //   });

    //   it("should fire off the leave animation", () => {
    //     let item;
    //     $templateCache.set("enter", [200, "<div>data</div>", {}]);
    //     $rootScope.tpl = "enter";
    //     element = $compile(
    //       html("<div><div " + 'ng-include="tpl">' + "</div></div>"),
    //     )($rootScope);
    //     ;

    //     let animation = $animate.queue.shift();
    //     expect(animation.event).toBe("enter");
    //     expect(animation.element.textContent).toBe("data");

    //     $rootScope.tpl = "";
    //     ;

    //     animation = $animate.queue.shift();
    //     expect(animation.event).toBe("leave");
    //     expect(animation.element.textContent).toBe("data");
    //   });

    //   it("should animate two separate ngInclude elements", () => {
    //     let item;
    //     $templateCache.set("one", [200, "one", {}]);
    //     $templateCache.set("two", [200, "two", {}]);
    //     $rootScope.tpl = "one";
    //     element = $compile(
    //       html("<div><div " + 'ng-include="tpl">' + "</div></div>"),
    //     )($rootScope);
    //     ;

    //     const item1 = $animate.queue.shift().element;
    //     expect(item1.textContent).toBe("one");

    //     $rootScope.tpl = "two";
    //     ;

    //     const itemA = $animate.queue.shift().element;
    //     const itemB = $animate.queue.shift().element;
    //     expect(itemA.getAttribute("ng-include")).toBe("tpl");
    //     expect(itemB.getAttribute("ng-include")).toBe("tpl");
    //     expect(itemA).not.toEqual(itemB);
    //   });

    //   it("should destroy the previous leave animation if a new one takes place", () => {
    //     module(($provide) => {
    //       $provide.decorator("$animate", ($delegate, $$q) => {
    //         const emptyPromise = Promise.withResolvers().promise;
    //         emptyPromise.done = () => { /* empty */ };

    //         $delegate.leave = function () {
    //           return emptyPromise;
    //         };
    //         return $delegate;
    //       });
    //     });
    //     () => {
    //       let item;
    //       const $scope = $rootScope.$new();
    //       element = $compile(
    //         html("<div>" + '<div ng-include="inc">Yo</div>' + "</div>"),
    //       )($scope);

    //       $templateCache.set("one", [200, "<div>one</div>", {}]);
    //       $templateCache.set("two", [200, "<div>two</div>", {}]);

    //       let destroyed;
    //       const inner = element.children(0);
    //       inner.on("$destroy", () => {
    //         destroyed = true;
    //       });

    //       expect(destroyed).toBe(true);
    //     };
    //   });
    // });
  });
});
