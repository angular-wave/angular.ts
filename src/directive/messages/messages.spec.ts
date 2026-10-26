/// <reference types="jasmine" />
import { defined, htmlNode } from "../../shared/test-fixtures.spec.ts";

import { Angular } from "../../angular.ts";
import { wait, waitUntil } from "../../shared/test-utils.ts";
import { isString } from "../../shared/utils.ts";
import { dealoc, getController } from "../../shared/dom.ts";

describe("ngMessages", () => {
  let $rootScope: FixtureScope,
    $compile: ng.CompileService,
    $templateCache: ng.TemplateCacheService,
    el: HTMLElement;

  beforeEach(() => {
    el = defined(document.getElementById("app"));
    dealoc(el);
    window.angular = new Angular();
    window.angular.createModule("app", []).directive("messageWrap", () => ({
      transclude: true,
      scope: {
        col: "=col",
      },
      template: '<div ng-messages="col"><ng-transclude></ng-transclude></div>',
    }));
    window.angular.bootstrap(el, ["app"]).invoke([
      "$rootScope",
      "$compile",
      "$templateCache",
      (
        _$rootScope_: FixtureScope,
        _$compile_: ng.CompileService,
        _$templateCache_: ng.TemplateCacheService,
      ) => {
        $rootScope = _$rootScope_;
        $compile = _$compile_;
        $templateCache = _$templateCache_;
      },
    ]);
  });

  function messageChildren(element: ParentNode) {
    return element.querySelectorAll("[ng-message], [ng-message-exp]");
  }

  function s(str: string | null) {
    return defined(str).replace(/\s+/g, "");
  }

  function trim(value: unknown) {
    return isString(value) ? value.trim() : value;
  }

  function toLabel(value: unknown) {
    return JSON.stringify(value) ?? String(value);
  }

  let element: HTMLElement;

  it("should render based off of a hashmap collection", async () => {
    element = htmlNode(
      $compile(
        '<div ng-messages="col">' +
          '  <div ng-message="val">Message is set</div>' +
          "</div>",
      )($rootScope),
    );
    await wait();
    expect(element.textContent).not.toContain("Message is set");

    $rootScope.col = { val: true };
    await wait();

    expect(element.textContent).toContain("Message is set");
  });

  it("should support normalized data aliases for message collection and key", async () => {
    element = htmlNode(
      $compile(
        '<div data-ng-messages="col">' +
          '  <div data-ng-message="val">Message is set</div>' +
          "</div>",
      )($rootScope),
    );
    await wait();
    expect(element.textContent).not.toContain("Message is set");

    $rootScope.col = { val: true };
    await wait();

    expect(element.textContent).toContain("Message is set");
  });

  it("should render the same message if multiple message keys match", async () => {
    element = htmlNode(
      $compile(
        '<div ng-messages="col">' +
          '  <div ng-message="one, two, three">Message is set</div>' +
          "</div>",
      )($rootScope),
    );
    await wait();
    expect(element.textContent).not.toContain("Message is set");

    $rootScope.col = { one: true };
    await wait();
    expect(element.textContent).toContain("Message is set");

    $rootScope.col = { two: true, one: false };
    await wait();
    expect(element.textContent).toContain("Message is set");

    $rootScope.col = { three: true, two: false };
    await wait();
    expect(element.textContent).toContain("Message is set");

    $rootScope.col = { three: false };
    await wait();
    expect(element.textContent).not.toContain("Message is set");
  });

  it("should use the when attribute when an element directive is used", async () => {
    element = htmlNode(
      $compile(
        '<ng-messages for="col">' +
          '  <ng-message when="val">Message is set</div>' +
          "</ng-messages>",
      )($rootScope),
    );
    await wait();
    expect(element.textContent).not.toContain("Message is set");

    $rootScope.col = { val: true };
    await wait();
    expect(element.textContent).toContain("Message is set");
  });

  it("should render the same message if multiple message keys match based on the when attribute", async () => {
    element = htmlNode(
      $compile(
        '<ng-messages for="col">' +
          '  <ng-message when=" one two three ">Message is set</div>' +
          "</ng-messages>",
      )($rootScope),
    );
    await wait();
    expect(element.textContent).not.toContain("Message is set");

    $rootScope.col = { one: true };
    await wait();
    expect(element.textContent).toContain("Message is set");

    $rootScope.col = { two: true, one: false };
    await wait();
    expect(element.textContent).toContain("Message is set");

    $rootScope.col = { three: true, two: false };
    await wait();
    expect(element.textContent).toContain("Message is set");

    $rootScope.col = { three: false };
    await wait();
    expect(element.textContent).not.toContain("Message is set");
  });

  it("should allow a dynamic expression to be set when ng-message-exp is used", async () => {
    element = htmlNode(
      $compile(
        '<div ng-messages="col">' +
          '  <div ng-message-exp="variable">Message is crazy</div>' +
          "</div>",
      )($rootScope),
    );
    await wait();
    expect(element.textContent).not.toContain("Message is crazy");

    $rootScope.variable = "error";
    $rootScope.col = { error: true };
    await wait();
    expect(element.textContent).toContain("Message is crazy");

    $rootScope.col = { error: false, failure: true };
    await wait();
    expect(element.textContent).not.toContain("Message is crazy");

    $rootScope.variable = ["failure"];
    await wait();
    expect(element.textContent).toContain("Message is crazy");

    $rootScope.variable = null;
    await wait();
    expect(element.textContent).not.toContain("Message is crazy");
  });

  it("should allow a dynamic expression to be set when the when-exp attribute is used", async () => {
    element = htmlNode(
      $compile(
        '<ng-messages for="col">' +
          '  <ng-message when-exp="variable">Message is crazy</ng-message>' +
          "</ng-messages>",
      )($rootScope),
    );
    await wait();
    expect(element.textContent).not.toContain("Message is crazy");

    $rootScope.variable = "error, failure";
    $rootScope.col = { error: true };
    await wait();
    expect(element.textContent).toContain("Message is crazy");

    $rootScope.col = { error: false, failure: true };
    await wait();
    expect(element.textContent).toContain("Message is crazy");

    $rootScope.variable = [];
    await wait();
    expect(element.textContent).not.toContain("Message is crazy");

    $rootScope.variable = null;
    await wait();
    expect(element.textContent).not.toContain("Message is crazy");
  });

  [null, false, 0, [], [{}], "", { val2: true }].forEach((collection) => {
    it(`should render empty when ${toLabel(collection)} is used as the collection value`, async () => {
      element = htmlNode(
        $compile(
          '<div ng-messages="col">' +
            '  <div ng-message="val">Message is set</div>' +
            "</div>",
        )($rootScope),
      );
      await wait();

      $rootScope.col = collection;
      await wait();

      expect(element.textContent).not.toContain("Message is set");
    });
  });

  [true, 1, {}, [], [null]].forEach((value) => {
    it(`should insert and remove matching inner elements when ${toLabel(value)} is used as a value`, async () => {
      element = htmlNode(
        $compile(
          '<div ng-messages="col">' +
            '  <div ng-message="blue">This message is blue</div>' +
            '  <div ng-message="red">This message is red</div>' +
            "</div>",
        )($rootScope),
      );
      await wait();

      $rootScope.col = {};
      await wait();

      expect(messageChildren(element).length).toBe(0);
      expect(trim(element.textContent)).toEqual("");

      $rootScope.col = {
        blue: true,
        red: false,
      };
      await wait();

      expect(messageChildren(element).length).toBe(1);
      expect(trim(element.textContent)).toEqual("This message is blue");

      $rootScope.col = {
        red: value,
      };
      await wait();

      expect(messageChildren(element).length).toBe(1);
      expect(trim(element.textContent)).toEqual("This message is red");

      $rootScope.col = null;
      await wait();

      expect(messageChildren(element).length).toBe(0);
      expect(trim(element.textContent)).toEqual("");

      $rootScope.col = {
        blue: 0,
        red: null,
      };
      await wait();

      expect(messageChildren(element).length).toBe(0);
      expect(trim(element.textContent)).toEqual("");
    });
  });

  it("should display the elements in the order defined in the DOM", async () => {
    element = htmlNode(
      $compile(
        '<div ng-messages="col">' +
          '  <div ng-message="one">Message#one</div>' +
          '  <div ng-message="two">Message#two</div>' +
          '  <div ng-message="three">Message#three</div>' +
          "</div>",
      )($rootScope),
    );
    await wait();
    $rootScope.col = {
      three: true,
      one: true,
      two: true,
    };
    await wait();

    for (const key of ["one", "two", "three"] as const) {
      expect(s(element.textContent)).toEqual(`Message#${key}`);

      $rootScope.col[key] = false;
      await wait();
    }

    expect(s(element.textContent)).toEqual("");
  });

  it("should add ng-active/ng-inactive CSS classes to the element when errors are/aren't displayed", async () => {
    element = htmlNode(
      $compile(
        '<div ng-messages="col">' +
          '  <div ng-message="ready">This message is ready</div>' +
          "</div>",
      )($rootScope),
    );
    await wait();
    $rootScope.col = {};
    await wait();
    expect(element.classList.contains("ng-active")).toBe(false);
    expect(element.classList.contains("ng-inactive")).toBe(true);

    $rootScope.col = { ready: true };
    await wait();
    expect(element.classList.contains("ng-active")).toBe(true);
    expect(element.classList.contains("ng-inactive")).toBe(false);
  });

  it("should automatically re-render the messages when other directives dynamically change them", async () => {
    element = htmlNode(
      $compile(
        '<div ng-messages="col">' +
          '  <div ng-message="primary">Enter something</div>' +
          '  <div ng-repeat="item in items">' +
          '    <div ng-message-exp="item.name">{{ item.text }}</div>' +
          "  </div>" +
          "</div>",
      )($rootScope),
    );
    await wait();
    $rootScope.col = {};
    $rootScope.items = [
      { text: "Your age is incorrect", name: "age" },
      { text: "You're too tall man!", name: "height" },
      { text: "Your hair is too long", name: "hair" },
    ];
    await wait();

    expect(messageChildren(element).length).toBe(0);
    expect(trim(element.textContent)).toEqual("");

    $rootScope.col = { hair: true };
    await wait();

    expect(messageChildren(element).length).toBe(1);
    expect(trim(element.textContent)).toEqual("Your hair is too long");

    $rootScope.col = { age: true, hair: true };
    await wait();

    expect(messageChildren(element).length).toBe(1);
    expect(trim(element.textContent)).toEqual("Your age is incorrect");

    messageItems($rootScope).shift();
    await wait();
    expect(messageChildren(element).length).toBe(1);
    expect(trim(element.textContent)).toEqual("Your hair is too long");

    $rootScope.items.length = 0;
    $rootScope.col.primary = true;
    await wait();
    expect(messageChildren(element).length).toBe(1);
    expect(trim(element.textContent)).toEqual("Enter something");
  });

  it("should be compatible with ngBind", async () => {
    element = htmlNode(
      $compile(
        '<div ng-messages="col">' +
          '        <div ng-message="required" ng-bind="errorMessages.required"></div>' +
          '        <div ng-message="extra" ng-bind="errorMessages.extra"></div>' +
          "</div>",
      )($rootScope),
    );

    $rootScope.col = {
      required: true,
      extra: true,
    };

    $rootScope.errorMessages = {
      required: "Fill in the text field.",
      extra: "Extra error message.",
    };
    await wait();

    expect(messageChildren(element).length).toBe(1);
    expect(trim(element.textContent)).toEqual("Fill in the text field.");

    $rootScope.col.required = false;
    $rootScope.col.extra = true;
    await wait();

    expect(messageChildren(element).length).toBe(1);
    expect(trim(element.textContent)).toEqual("Extra error message.");

    $rootScope.errorMessages.extra = "New error message.";
    await wait();

    expect(messageChildren(element).length).toBe(1);
    expect(trim(element.textContent)).toEqual("New error message.");
  });

  // issue #12856
  it("should only detach the message object that is associated with the message node being removed", async () => {
    // Create a basic ng-messages set up
    element = htmlNode(
      $compile(
        '<div ng-messages="col">' +
          '  <div ng-message="primary">Enter something</div>' +
          "</div>",
      )($rootScope),
    );
    await wait();
    // Trigger the message to be displayed
    $rootScope.col = { primary: true };
    await wait();
    expect(messageChildren(element).length).toEqual(1);
    const oldMessageNode = messageChildren(element)[0];

    // Remove the message
    $rootScope.col = { primary: undefined };
    await wait();
    expect(messageChildren(element).length).toBe(0);

    // Add the message back in
    $rootScope.col = { primary: true };

    // There should only be the new message node
    await wait();
    expect(messageChildren(element).length).toEqual(1);
    const newMessageNode = messageChildren(element)[0];

    expect(newMessageNode).not.toBe(oldMessageNode);
  });

  describe("ngMessage nested nested inside elements", () => {
    it(
      "should not crash or leak memory when the messages are transcluded, the first message is " +
        "visible, and ngMessages is removed by ngIf",
      async () => {
        element = htmlNode(
          $compile(
            '<div><div ng-if="show"><div message-wrap col="col">' +
              '        <div ng-message="a">A</div>' +
              '        <div ng-message="b">B</div>' +
              "</div></div></div>",
          )($rootScope),
        );
        await wait();
        $rootScope.show = true;
        $rootScope.col = {
          a: true,
          b: true,
        };
        await wait();

        $rootScope.show = false;
        await wait();
        expect(messageChildren(element).length).toBe(0);
      },
    );

    it(
      "should not crash, but show deeply nested messages correctly after a message " +
        "has been destroyed",
      async () => {
        element = htmlNode(
          $compile(
            '<div ng-messages="col" ng-messages-multiple>' +
              '<div class="another-wrapper">' +
              '<div ng-message="a">A</div>' +
              '<div class="wrapper">' +
              '<div ng-message="b">B</div>' +
              '<div ng-message="c">C</div>' +
              "</div>" +
              '<div ng-message="d">D</div>' +
              "</div>" +
              "</div>",
          )($rootScope),
        );
        await wait();

        $rootScope.col = {
          a: true,
          b: true,
        };
        await wait();

        expect(messageChildren(element).length).toBe(2);
        expect(trim(element.textContent)).toEqual("AB");

        const ctrl = messagesController(element);

        const deregisterSpy = spyOn(ctrl, "deregister").and.callThrough();

        const nodeB = element.querySelector('[ng-message="b"]');

        defined(nodeB).dispatchEvent(new Event("$destroy"));
        defined(nodeB).remove();
        await wait();

        expect(deregisterSpy).toHaveBeenCalled();
        expect(messageChildren(element).length).toBe(1);
        expect(trim(element.textContent)).toEqual("A");
      },
    );
  });

  it("should remove the rendered ngMessage when the message no longer matches", async () => {
    const html =
      '<div ng-messages="items">' +
      '<div ng-message="a">{{forA}}</div>' +
      "</div>";

    element = htmlNode($compile(html)($rootScope));

    $rootScope.forA = "A";
    $rootScope.items = { a: true };
    await wait();

    const renderedMessage = messageChildren(element)[0];

    expect(element.textContent).toBe("A");

    $rootScope.items = {};
    await wait();

    expect(element.textContent).toBe("");
    expect(renderedMessage.isConnected).toBeFalse();
  });

  it("should unregister the ngMessage even if it was never attached", async () => {
    const html =
      '<div ng-messages="items">' +
      '<div ng-if="show"><div ng-message="x">ERROR</div></div>' +
      "</div>";

    element = htmlNode($compile(html)($rootScope));

    const ctrl = messagesController(element);

    await wait();
    expect(messageChildren(element).length).toBe(0);
    expect(Object.keys(defined(ctrl)._messages).length).toEqual(0);

    $rootScope.show = true;
    await wait();
    expect(messageChildren(element).length).toBe(0);
    expect(Object.keys(defined(ctrl)._messages).length).toEqual(1);

    $rootScope.show = false;
    await wait();
    expect(messageChildren(element).length).toBe(0);
    expect(Object.keys(defined(ctrl)._messages).length).toEqual(0);
  });

  it("should not get stuck waiting to re-render when the collection is null", async () => {
    const html =
      '<div ng-messages="items">' +
      '<div ng-if="show"><div ng-message="x">ERROR</div></div>' +
      "</div>";

    element = htmlNode($compile(html)($rootScope));

    const ctrl = messagesController(element);

    await wait();

    $rootScope.items = null;
    await wait();
    expect(defined(ctrl)._renderLater).toBeFalse();

    $rootScope.show = true;
    await wait();
    expect(defined(ctrl)._renderLater).toBeFalse();
    expect(Object.keys(defined(ctrl)._messages).length).toEqual(1);

    $rootScope.show = false;
    await wait();
    expect(defined(ctrl)._renderLater).toBeFalse();
    expect(Object.keys(defined(ctrl)._messages).length).toEqual(0);
  });

  describe("default message", () => {
    it("should render a default message when no message matches", async () => {
      element = htmlNode(
        $compile(
          '<div ng-messages="col">' +
            '  <div ng-message="val">Message is set</div>' +
            "  <div ng-message-default>Default message is set</div>" +
            "</div>",
        )($rootScope),
      );
      $rootScope.col = { unexpected: false };
      await wait();
      expect(element.textContent.trim()).toBe("");
      expect(element.classList.contains("ng-active")).toBeFalse();

      $rootScope.col = { unexpected: true };
      await wait();
      expect(element.textContent.trim()).toBe("Default message is set");
      expect(element.classList.contains("ng-active")).toBeTrue();

      $rootScope.col = { unexpected: false };
      await wait();
      expect(element.textContent.trim()).toBe("");
      expect(element.classList.contains("ng-active")).toBeFalse();

      $rootScope.col = { val: true, unexpected: true };
      await wait();
      expect(element.textContent.trim()).toBe("Message is set");
      expect(element.classList.contains("ng-active")).toBeTrue();
    });

    it("should not render a default message with ng-messages-multiple if another error matches", async () => {
      element = htmlNode(
        $compile(
          '<div ng-messages="col" ng-messages-multiple>' +
            '  <div ng-message="val">Message is set</div>' +
            '  <div ng-message="other">Other message is set</div>' +
            "  <div ng-message-default>Default message is set</div>" +
            "</div>",
        )($rootScope),
      );
      await wait();
      expect(element.textContent.trim()).toBe("");

      $rootScope.col = { val: true, other: false, unexpected: false };
      await wait();
      expect(element.textContent.trim()).toBe("Message is set");

      $rootScope.col = { val: true, other: true, unexpected: true };
      await wait();
      expect(element.textContent.trim()).toBe(
        "Message is set  Other message is set",
      );

      $rootScope.col = { val: false, other: false, unexpected: true };
      await wait();
      expect(element.textContent.trim()).toBe("Default message is set");
    });

    it("should handle a default message with ngIf", async () => {
      element = htmlNode(
        $compile(
          '<div ng-messages="col">' +
            '  <div ng-message="val">Message is set</div>' +
            '  <div ng-if="default" ng-message-default>Default message is set</div>' +
            "</div>",
        )($rootScope),
      );
      $rootScope.default = true;
      $rootScope.col = { unexpected: true };
      await wait();
      expect(element.textContent.trim()).toBe("Default message is set");

      $rootScope.default = false;
      await wait();
      expect(element.textContent.trim()).toBe("");

      $rootScope.default = true;
      await wait();
      expect(element.textContent.trim()).toBe("Default message is set");

      $rootScope.col = { val: true };
      await wait();
      expect(element.textContent.trim()).toBe("Message is set");
    });
  });

  describe("when including templates", () => {
    it("should work with a dynamic collection model managed by ngRepeat", async () => {
      $templateCache.set(
        "abc.html",
        '<div ng-message="a">A</div>' +
          '<div ng-message="b">B</div>' +
          '<div ng-message="c">C</div>',
      );

      $rootScope.items = [{}, {}, {}];

      element = htmlNode(
        $compile(
          '<div><div ng-repeat="item in items">' +
            '<div ng-messages="item">' +
            '<div ng-messages-include="abc.html"></div>' +
            "</div>" +
            "</div></div>",
        )($rootScope),
      );
      await wait();

      messageItems($rootScope)[0].a = true;
      messageItems($rootScope)[1].b = true;
      messageItems($rootScope)[2].c = true;
      await wait();

      const repeated = element.children;

      expect(messageChildren(element).length).toBe(3);
      expect(messageChildren(repeated[0]).length).toBe(1);
      expect(messageChildren(repeated[1]).length).toBe(1);
      expect(messageChildren(repeated[2]).length).toBe(1);
      expect(s(element.textContent)).toBe("ABC");

      messageItems($rootScope)[0].a = false;
      messageItems($rootScope)[0].c = true;
      messageItems($rootScope)[1].b = false;
      messageItems($rootScope)[2].c = false;
      messageItems($rootScope)[2].a = true;
      await wait();

      expect(s(element.textContent)).toBe("CA");

      messageItems($rootScope)[1].b = true;
      messageItems($rootScope).reverse();
      await wait();

      expect(s(element.textContent)).toBe("ABC");
    });

    it("should load a remote template using the src attribute form", async () => {
      $templateCache.set(
        "abc.html",
        '<div ng-message="a">A</div>' +
          '<div ng-message="b">B</div>' +
          '<div ng-message="c">C</div>',
      );

      element = htmlNode(
        $compile(
          '<ng-messages for="data">' +
            '<ng-messages-include src="abc.html"></ng-messages-include>' +
            "</ng-messages>",
        )($rootScope),
      );

      $rootScope.data = {
        a: 1,
        b: 2,
        c: 3,
      };
      await wait();

      expect(messageChildren(element).length).toBe(1);
      expect(trim(element.textContent)).toEqual("A");

      $rootScope.data = {
        c: 3,
      };
      await wait();

      expect(messageChildren(element).length).toBe(1);
      expect(trim(element.textContent)).toEqual("C");
    });

    it("should cache the template after download", async () => {
      expect($templateCache.get("/mock/hello")).toBeUndefined();
      element = htmlNode(
        $compile(
          '<div ng-messages="data"><div ng-messages-include="/mock/hello"></div></div>',
        )($rootScope),
      );
      await waitUntil(() => $templateCache.has("/mock/hello"));
      expect($templateCache.get("/mock/hello")).toBeDefined();
    });

    it("should re-render the messages after download without an extra digest", async () => {
      element = htmlNode(
        $compile(
          '<div ng-messages="data">' +
            '  <div ng-messages-include="/mock/my-messages"></div>' +
            '  <div ng-message="failed">Your value is that of failure</div>' +
            "</div>",
        )($rootScope),
      );
      $rootScope.data = {
        required: true,
        failed: true,
      };

      await waitUntil(
        () => trim(element.textContent) === "You did not enter a value",
      );

      expect(messageChildren(element).length).toBe(1);
      expect(trim(element.textContent)).toEqual("You did not enter a value");
    });

    it("should allow for overriding the remote template messages within the element depending on where the remote template is placed", async () => {
      $templateCache.set(
        "abc.html",
        '<div><div ng-message="a">A</div>' +
          '<div ng-message="b">B</div>' +
          '<div ng-message="c">C</div></div>',
      );

      element = htmlNode(
        $compile(
          '<div ng-messages="data">' +
            '  <div ng-message="a">AAA</div>' +
            '  <div ng-messages-include="abc.html"></div>' +
            '  <div ng-message="c">CCC</div>' +
            "</div>",
        )($rootScope),
      );
      await wait();
      $rootScope.data = {
        a: 1,
        b: 2,
        c: 3,
      };
      await wait();
      expect(messageChildren(element).length).toBe(1);
      expect(trim(element.textContent)).toEqual("AAA");

      $rootScope.data = {
        b: 2,
        c: 3,
      };
      await wait();
      expect(messageChildren(element).length).toBe(1);
      expect(trim(element.textContent)).toEqual("B");

      $rootScope.data = {
        c: 3,
      };
      await wait();
      expect(messageChildren(element).length).toBe(1);
      expect(trim(element.textContent)).toEqual("C");
    });

    it("should prioritize an included previous message even if it registered later", async () => {
      $templateCache.set("include.html", '<div ng-message="a">A</div>');

      const html =
        '<div ng-messages="items">' +
        "<div ng-include=\"'include.html'\"></div>" +
        '<div ng-message="b">B</div>' +
        '<div ng-message="c">C</div>' +
        "</div>";

      $rootScope.items = {
        a: true,
        b: true,
        c: true,
      };

      element = htmlNode($compile(html)($rootScope));
      await wait();

      expect(messageChildren(element).length).toBe(1);
      expect(trim(element.textContent)).toBe("A");
    });

    it("should not throw if the template is empty", async () => {
      const html =
        '<div ng-messages="items">' +
        '<div ng-messages-include="messages1.html"></div>' +
        '<div ng-messages-include="messages2.html"></div>' +
        "</div>";

      $templateCache.set("messages1.html", "");
      $templateCache.set("messages2.html", "   ");
      element = htmlNode($compile(html)($rootScope));
      await wait();
      expect(element.textContent).toBe("");
      expect(element.childNodes.length).toBe(2);
    });
  });

  describe("when multiple", () => {
    ["multiple", "ng-messages-multiple"].forEach((attribute) => {
      it(`should show all truthy messages when ${attribute} is present`, async () => {
        element = htmlNode(
          $compile(
            `<div ng-messages="data" ${attribute}>` +
              `  <div ng-message="one">1</div>` +
              `  <div ng-message="two">2</div>` +
              `  <div ng-message="three">3</div>` +
              `</div>`,
          )($rootScope),
        );
        await wait();

        $rootScope.data = {
          one: true,
          two: false,
          three: true,
        };
        await wait();

        expect(messageChildren(element).length).toBe(2);
        expect(s(element.textContent)).toContain("13");
      });
    });

    it("should render all truthy messages from a remote template", async () => {
      $templateCache.set(
        "xyz.html",
        '<div><div ng-message="x">X</div>' +
          '<div ng-message="y">Y</div>' +
          '<div ng-message="z">Z</div></div>',
      );
      await wait();
      element = htmlNode(
        $compile(
          '<div ng-messages="data" ng-messages-multiple="true">' +
            '<div ng-messages-include="xyz.html"></div>' +
            "</div>",
        )($rootScope),
      );
      await wait();
      $rootScope.data = {
        x: "a",
        y: null,
        z: true,
      };
      await wait();
      expect(messageChildren(element).length).toBe(2);
      expect(s(element.textContent)).toEqual("XZ");

      $rootScope.data.y = {};
      await wait();
      expect(messageChildren(element).length).toBe(3);
      expect(s(element.textContent)).toEqual("XYZ");
    });

    it("should render and override all truthy messages from a remote template", async () => {
      $templateCache.set(
        "xyz.html",
        '<div ng-message="x">X</div>' +
          '<div ng-message="y">Y</div>' +
          '<div ng-message="z">Z</div>',
      );

      element = htmlNode(
        $compile(
          '<div ng-messages="data" ng-messages-multiple="true">' +
            '<div ng-message="y">YYY</div>' +
            '<div ng-message="z">ZZZ</div>' +
            '<div ng-messages-include="xyz.html"></div>' +
            "</div>",
        )($rootScope),
      );
      await wait();
      $rootScope.data = {
        x: "a",
        y: null,
        z: true,
      };
      await wait();
      expect(messageChildren(element).length).toBe(2);
      expect(s(element.textContent)).toEqual("ZZZX");

      $rootScope.data.y = {};
      await wait();
      expect(messageChildren(element).length).toBe(3);
      expect(s(element.textContent)).toEqual("YYYZZZX");
    });
  });
  it("treats a missing ngMessages expression as an empty collection", async () => {
    element = htmlNode(
      $compile(
        '<div ng-messages><span ng-message="required">required</span></div>',
      )($rootScope),
    );

    await wait();

    expect(element.textContent).toBe("");
  });
});

interface FixtureScope extends ng.Scope {
  "new"(childInstance?: ng.Scope): FixtureScope;
  newIsolate(childInstance?: ng.Scope): FixtureScope;
  col?:
    | (string | number | boolean | {}[] | { val2: boolean } | null)
    | null
    | {
        val?: boolean;
        one?: boolean;
        two?: boolean;
        three?: boolean;
        error?: boolean;
        failure?: boolean;
        blue?: boolean | number;
        red?: boolean | {} | null;
        ready?: boolean;
        hair?: boolean;
        age?: boolean;
        primary?: boolean | undefined;
        required?: boolean;
        extra?: boolean;
        a?: boolean;
        b?: boolean;
        unexpected?: boolean;
        other?: boolean;
      }
    | boolean[];
  variable?: string | null | string[];
  items?:
    | null
    | { length?: number; a?: boolean; b?: boolean; c?: boolean }
    | { text?: string; name?: string; a?: boolean; b?: boolean; c?: boolean }[];
  errorMessages?: { required?: string; extra?: string };
  show?: boolean;
  forA?: string;
  default?: boolean;
  data?: {
    a?: number;
    b?: number;
    c?: number;
    required?: boolean;
    failed?: boolean;
    one?: boolean;
    two?: boolean;
    three?: boolean;
    x?: string;
    y?: unknown;
    z?: boolean;
  };
}

interface MessagesController {
  _messages: object;
  _renderLater: boolean;
  deregister(comment: Comment, isDefault: boolean): void;
}
function isMessagesController(value: unknown): value is MessagesController {
  return (
    typeof value === "object" &&
    value !== null &&
    "deregister" in value &&
    typeof value.deregister === "function" &&
    "_messages" in value &&
    typeof value._messages === "object" &&
    value._messages !== null &&
    "_renderLater" in value &&
    typeof value._renderLater === "boolean"
  );
}
function messagesController(element: Element): MessagesController {
  const controller = getController(element, "ngMessages");
  if (!isMessagesController(controller))
    throw new TypeError("Missing message controller");
  return controller;
}
function messageItems(scope: FixtureScope) {
  const items = scope.items;
  if (!Array.isArray(items))
    throw new TypeError("Expected message fixture array");
  return items;
}
