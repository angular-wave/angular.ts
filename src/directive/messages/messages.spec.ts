// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { wait } from "../../shared/test-utils.ts";
import { isString } from "../../shared/utils.ts";
import { dealoc, getController } from "../../shared/dom.ts";

describe("ngMessages", () => {
  let $rootScope, $compile, $templateCache, el;

  beforeEach(() => {
    el = document.getElementById("app");
    dealoc(el);
    window.angular = new Angular();
    window.angular.module("app", []).directive("messageWrap", () => ({
      transclude: true,
      scope: {
        col: "=col",
      },
      template: '<div ng-messages="col"><ng-transclude></ng-transclude></div>',
    }));
    window.angular
      .bootstrap(el, ["app"])
      .invoke((_$rootScope_, _$compile_, _$templateCache_) => {
        $rootScope = _$rootScope_;
        $compile = _$compile_;
        $templateCache = _$templateCache_;
      });
  });

  function messageChildren(element) {
    return element.querySelectorAll("[ng-message], [ng-message-exp]");
  }

  function s(str) {
    return str.replace(/\s+/g, "");
  }

  function trim(value) {
    return isString(value) ? value.trim() : value;
  }

  function toLabel(value) {
    return JSON.stringify(value) ?? String(value);
  }

  let element;

  it("should render based off of a hashmap collection", async () => {
    element = $compile(
      '<div ng-messages="col">' +
        '  <div ng-message="val">Message is set</div>' +
        "</div>",
    )($rootScope);
    await wait();
    expect(element.textContent).not.toContain("Message is set");

    $rootScope.col = { val: true };
    await wait();

    expect(element.textContent).toContain("Message is set");
  });

  it("should support normalized data aliases for message collection and key", async () => {
    element = $compile(
      '<div data-ng-messages="col">' +
        '  <div data-ng-message="val">Message is set</div>' +
        "</div>",
    )($rootScope);
    await wait();
    expect(element.textContent).not.toContain("Message is set");

    $rootScope.col = { val: true };
    await wait();

    expect(element.textContent).toContain("Message is set");
  });

  it("should render the same message if multiple message keys match", async () => {
    element = $compile(
      '<div ng-messages="col">' +
        '  <div ng-message="one, two, three">Message is set</div>' +
        "</div>",
    )($rootScope);
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
    element = $compile(
      '<ng-messages for="col">' +
        '  <ng-message when="val">Message is set</div>' +
        "</ng-messages>",
    )($rootScope);
    await wait();
    expect(element.textContent).not.toContain("Message is set");

    $rootScope.col = { val: true };
    await wait();
    expect(element.textContent).toContain("Message is set");
  });

  it("should render the same message if multiple message keys match based on the when attribute", async () => {
    element = $compile(
      '<ng-messages for="col">' +
        '  <ng-message when=" one two three ">Message is set</div>' +
        "</ng-messages>",
    )($rootScope);
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
    element = $compile(
      '<div ng-messages="col">' +
        '  <div ng-message-exp="variable">Message is crazy</div>' +
        "</div>",
    )($rootScope);
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
    element = $compile(
      '<ng-messages for="col">' +
        '  <ng-message when-exp="variable">Message is crazy</ng-message>' +
        "</ng-messages>",
    )($rootScope);
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
      element = $compile(
        '<div ng-messages="col">' +
          '  <div ng-message="val">Message is set</div>' +
          "</div>",
      )($rootScope);
      await wait();

      $rootScope.col = collection;
      await wait();

      expect(element.textContent).not.toContain("Message is set");
    });
  });

  [true, 1, {}, [], [null]].forEach((value) => {
    it(`should insert and remove matching inner elements when ${toLabel(value)} is used as a value`, async () => {
      element = $compile(
        '<div ng-messages="col">' +
          '  <div ng-message="blue">This message is blue</div>' +
          '  <div ng-message="red">This message is red</div>' +
          "</div>",
      )($rootScope);
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
    element = $compile(
      '<div ng-messages="col">' +
        '  <div ng-message="one">Message#one</div>' +
        '  <div ng-message="two">Message#two</div>' +
        '  <div ng-message="three">Message#three</div>' +
        "</div>",
    )($rootScope);
    await wait();
    $rootScope.col = {
      three: true,
      one: true,
      two: true,
    };
    await wait();

    for (const key of ["one", "two", "three"]) {
      expect(s(element.textContent)).toEqual(`Message#${key}`);

      $rootScope.col[key] = false;
      await wait();
    }

    expect(s(element.textContent)).toEqual("");
  });

  it("should add ng-active/ng-inactive CSS classes to the element when errors are/aren't displayed", async () => {
    element = $compile(
      '<div ng-messages="col">' +
        '  <div ng-message="ready">This message is ready</div>' +
        "</div>",
    )($rootScope);
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
    element = $compile(
      '<div ng-messages="col">' +
        '  <div ng-message="primary">Enter something</div>' +
        '  <div ng-repeat="item in items">' +
        '    <div ng-message-exp="item.name">{{ item.text }}</div>' +
        "  </div>" +
        "</div>",
    )($rootScope);
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
    //
    // // remove the age!
    // $rootScope.items.shift();
    //
    // await wait();
    //
    // expect(messageChildren(element).length).toBe(1);
    // expect(trim(element.textContent)).toEqual("Your hair is too long");
    //
    // // remove the hair!
    // $rootScope.items.length = 0;
    // $rootScope.col.primary = true;
    // await wait();
    //
    // expect(messageChildren(element).length).toBe(1);
    // expect(trim(element.textContent)).toEqual("Enter something");
  });

  it("should be compatible with ngBind", async () => {
    element = $compile(
      '<div ng-messages="col">' +
        '        <div ng-message="required" ng-bind="errorMessages.required"></div>' +
        '        <div ng-message="extra" ng-bind="errorMessages.extra"></div>' +
        "</div>",
    )($rootScope);

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
    // We are going to spy on the `leave` method to give us control over
    // when the element is actually removed
    //spyOn($animate, "leave");

    // Create a basic ng-messages set up
    element = $compile(
      '<div ng-messages="col">' +
        '  <div ng-message="primary">Enter something</div>' +
        "</div>",
    )($rootScope);
    await wait();
    // Trigger the message to be displayed
    $rootScope.col = { primary: true };
    await wait();
    expect(messageChildren(element).length).toEqual(1);
    const oldMessageNode = messageChildren(element)[0];

    // Remove the message
    $rootScope.col = { primary: undefined };
    // Since we have spied on the `leave` method, the message node is still in the DOM
    //expect($animate.leave).toHaveBeenCalled();
    // const nodeToRemove = $animate.leave.calls.mostRecent().args[0][0];
    // expect(nodeToRemove).toBe(oldMessageNode);

    // Add the message back in
    $rootScope.col = { primary: true };
    // Simulate the animation completing on the node
    // (nodeToRemove).remove();

    // We should not get another call to `leave`
    //expect($animate.leave).not.toHaveBeenCalled();

    // There should only be the new message node
    await wait();
    expect(messageChildren(element).length).toEqual(1);
    const newMessageNode = messageChildren(element);

    expect(newMessageNode).not.toBe(oldMessageNode);
  });

  describe("ngMessage nested nested inside elements", () => {
    it(
      "should not crash or leak memory when the messages are transcluded, the first message is " +
        "visible, and ngMessages is removed by ngIf",
      async () => {
        element = $compile(
          '<div><div ng-if="show"><div message-wrap col="col">' +
            '        <div ng-message="a">A</div>' +
            '        <div ng-message="b">B</div>' +
            "</div></div></div>",
        )($rootScope);
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
        element = $compile(
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
        )($rootScope);
        await wait();

        $rootScope.col = {
          a: true,
          b: true,
        };
        await wait();

        expect(messageChildren(element).length).toBe(2);
        expect(trim(element.textContent)).toEqual("AB");

        const ctrl = getController(element, "ngMessages");

        const deregisterSpy = spyOn(ctrl, "deregister").and.callThrough();

        const nodeB = element.querySelector('[ng-message="b"]');

        nodeB.dispatchEvent(new Event("$destroy"));
        nodeB.remove();
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

    element = $compile(html)($rootScope);

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

    element = $compile(html)($rootScope);

    const ctrl = getController(element, "ngMessages");

    await wait();
    expect(messageChildren(element).length).toBe(0);
    expect(Object.keys(ctrl._messages).length).toEqual(0);

    $rootScope.show = true;
    await wait();
    expect(messageChildren(element).length).toBe(0);
    expect(Object.keys(ctrl._messages).length).toEqual(1);

    $rootScope.show = false;
    await wait();
    expect(messageChildren(element).length).toBe(0);
    expect(Object.keys(ctrl._messages).length).toEqual(0);
  });

  it("should not get stuck waiting to re-render when the collection is null", async () => {
    const html =
      '<div ng-messages="items">' +
      '<div ng-if="show"><div ng-message="x">ERROR</div></div>' +
      "</div>";

    element = $compile(html)($rootScope);

    const ctrl = getController(element, "ngMessages");

    await wait();

    $rootScope.items = null;
    await wait();
    expect(ctrl._renderLater).toBeFalse();

    $rootScope.show = true;
    await wait();
    expect(ctrl._renderLater).toBeFalse();
    expect(Object.keys(ctrl._messages).length).toEqual(1);

    $rootScope.show = false;
    await wait();
    expect(ctrl._renderLater).toBeFalse();
    expect(Object.keys(ctrl._messages).length).toEqual(0);
  });

  describe("default message", () => {
    it("should render a default message when no message matches", async () => {
      element = $compile(
        '<div ng-messages="col">' +
          '  <div ng-message="val">Message is set</div>' +
          "  <div ng-message-default>Default message is set</div>" +
          "</div>",
      )($rootScope);
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
      element = $compile(
        '<div ng-messages="col" ng-messages-multiple>' +
          '  <div ng-message="val">Message is set</div>' +
          '  <div ng-message="other">Other message is set</div>' +
          "  <div ng-message-default>Default message is set</div>" +
          "</div>",
      )($rootScope);
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
      element = $compile(
        '<div ng-messages="col">' +
          '  <div ng-message="val">Message is set</div>' +
          '  <div ng-if="default" ng-message-default>Default message is set</div>' +
          "</div>",
      )($rootScope);
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

      element = $compile(
        '<div><div ng-repeat="item in items">' +
          '<div ng-messages="item">' +
          '<div ng-messages-include="abc.html"></div>' +
          "</div>" +
          "</div></div>",
      )($rootScope);
      await wait();

      $rootScope.items[0].a = true;
      $rootScope.items[1].b = true;
      $rootScope.items[2].c = true;
      await wait();

      const repeated = element.children;

      expect(messageChildren(element).length).toBe(3);
      expect(messageChildren(repeated[0]).length).toBe(1);
      expect(messageChildren(repeated[1]).length).toBe(1);
      expect(messageChildren(repeated[2]).length).toBe(1);
      expect(s(element.textContent)).toBe("ABC");

      $rootScope.items[0].a = false;
      $rootScope.items[0].c = true;
      $rootScope.items[1].b = false;
      $rootScope.items[2].c = false;
      $rootScope.items[2].a = true;
      await wait();

      expect(s(element.textContent)).toBe("CA");

      $rootScope.items[1].b = true;
      $rootScope.items.reverse();
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

      element = $compile(
        '<ng-messages for="data">' +
          '<ng-messages-include src="abc.html"></ng-messages-include>' +
          "</ng-messages>",
      )($rootScope);

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
      element = $compile(
        '<div ng-messages="data"><div ng-messages-include="/mock/hello"></div></div>',
      )($rootScope);
      await wait();
      expect($templateCache.get("/mock/hello")).toBeDefined();
    });

    it("should re-render the messages after download without an extra digest", (done) => {
      element = $compile(
        '<div ng-messages="data">' +
          '  <div ng-messages-include="/mock/my-messages"></div>' +
          '  <div ng-message="failed">Your value is that of failure</div>' +
          "</div>",
      )($rootScope);
      $rootScope.data = {
        required: true,
        failed: true,
      };

      // expect(messageChildren(element).length).toBe(1);
      // expect(trim(element.textContent)).toEqual(
      //   "Your value is that of failure",
      // );

      setTimeout(() => {
        expect(messageChildren(element).length).toBe(1);
        expect(trim(element.textContent)).toEqual("You did not enter a value");
        done();
      }, 10);
    });

    it("should allow for overriding the remote template messages within the element depending on where the remote template is placed", async () => {
      $templateCache.set(
        "abc.html",
        '<div><div ng-message="a">A</div>' +
          '<div ng-message="b">B</div>' +
          '<div ng-message="c">C</div></div>',
      );

      element = $compile(
        '<div ng-messages="data">' +
          '  <div ng-message="a">AAA</div>' +
          '  <div ng-messages-include="abc.html"></div>' +
          '  <div ng-message="c">CCC</div>' +
          "</div>",
      )($rootScope);
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

      element = $compile(html)($rootScope);
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
      element = $compile(html)($rootScope);
      await wait();
      expect(element.textContent).toBe("");
      expect(element.childNodes.length).toBe(2);
    });
  });

  describe("when multiple", () => {
    ["multiple", "ng-messages-multiple"].forEach((attribute) => {
      it(`should show all truthy messages when ${attribute} is present`, async () => {
        element = $compile(
          `<div ng-messages="data" ${attribute}>` +
            `  <div ng-message="one">1</div>` +
            `  <div ng-message="two">2</div>` +
            `  <div ng-message="three">3</div>` +
            `</div>`,
        )($rootScope);
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
      element = $compile(
        '<div ng-messages="data" ng-messages-multiple="true">' +
          '<div ng-messages-include="xyz.html"></div>' +
          "</div>",
      )($rootScope);
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

      element = $compile(
        '<div ng-messages="data" ng-messages-multiple="true">' +
          '<div ng-message="y">YYY</div>' +
          '<div ng-message="z">ZZZ</div>' +
          '<div ng-messages-include="xyz.html"></div>' +
          "</div>",
      )($rootScope);
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
});
