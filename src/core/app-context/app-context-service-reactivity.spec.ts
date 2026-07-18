/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { wait } from "../../shared/test-utils.ts";
import { AppContext } from "./app-context.ts";

interface SessionService {
  session: SessionModel;
  rotate(token: string): void;
}

type ConnectionState = ng.Scope & {
  status: string;
  stats: ng.Scope & { attempts: number };
  messages: ng.Scope & string[];
};

type SessionModel = ng.Scope & { token: string };

function createDetachedScope(): ng.Scope {
  const angular = new Angular();

  return angular.injector(["ng"]).get("$rootScope") as ng.Scope;
}

describe("AppContext service reactivity without DOM", () => {
  it("creates service-owned reactive state with zero root records", async () => {
    const context = new AppContext();
    const connection = context.createReactive({
      status: "idle",
      stats: { attempts: 0 },
      messages: [] as string[],
    }) as unknown as ConnectionState;
    const consumer = createDetachedScope() as ng.Scope & {
      connection?: ConnectionState;
    };
    const observedStatuses: string[] = [];
    const observedAttempts: number[] = [];
    const observedMessageCounts: number[] = [];

    expect(context.roots.length).toBe(0);
    expect(context.getCurrentRoot()).toBeUndefined();

    consumer.connection = connection;
    consumer.$watch("connection.status", (value: string) => {
      observedStatuses.push(value);
    });
    consumer.$watch("connection.stats.attempts", (value: number) => {
      observedAttempts.push(value);
    });
    consumer.$watch("connection.messages.length", (value: number) => {
      observedMessageCounts.push(value);
    });

    await wait();

    connection.status = "open";
    connection.stats.attempts = 1;
    connection.messages.push("connected");

    await wait();

    expect(context.roots.length).toBe(0);
    expect(observedStatuses).toEqual(["idle", "open"]);
    expect(observedAttempts).toEqual([0, 1]);
    expect(observedMessageCounts).toEqual([0, 1]);
    expect(connection.$handler._listenerScheduler).toBe(
      context.modelScheduler._listenerScheduler,
    );

    consumer.$destroy();

    expect(connection.$handler._foreignListeners.has("status")).toBeFalse();
    expect(
      connection.stats.$handler._foreignListeners.has("attempts"),
    ).toBeFalse();
    expect(
      connection.messages.$handler._foreignListeners.has("length"),
    ).toBeFalse();

    connection.status = "closed";
    connection.stats.attempts = 2;
    connection.messages.push("disconnected");

    await wait();

    expect(observedStatuses).toEqual(["idle", "open"]);
    expect(observedAttempts).toEqual([0, 1]);
    expect(observedMessageCounts).toEqual([0, 1]);

    context.destroy();

    expect(connection.$handler._destroyed).toBeTrue();
  });

  it("schedules service-owned model work without root records", () => {
    const context = new AppContext();
    const calls: string[] = [];

    context.modelScheduler.schedule(() => {
      calls.push("connect");
    });
    context.modelScheduler.schedule(() => {
      calls.push("heartbeat");
    });

    expect(context.roots.length).toBe(0);
    expect(context.modelScheduler.pending).toBe(2);

    context.modelScheduler.flush();

    expect(calls).toEqual(["connect", "heartbeat"]);
    expect(context.modelScheduler.pending).toBe(0);
  });

  it("injects app models into services without bootstrap elements", async () => {
    const angular = new Angular();

    angular
      .module("noDomModelServiceApp", ["ng"])
      .model("session", () => ({ token: "" }))
      .service("sessionService", [
        "session",
        function SessionService(this: SessionService, session: SessionModel) {
          this.session = session;
          this.rotate = (token: string) => {
            session.token = token;
          };
        },
      ]);

    const injector = angular.injector(["noDomModelServiceApp"]);
    const rootScope = injector.get("$rootScope") as ng.Scope;
    const rootRecord = angular._appContext.getRootByScope(rootScope);
    const session = injector.get("session") as SessionModel;
    const sessionService = injector.get("sessionService") as SessionService;
    const consumer = createDetachedScope() as ng.Scope & {
      session?: SessionModel;
    };
    const observedTokens: string[] = [];

    expect(rootRecord).toBeDefined();
    expect(rootRecord?.rootElement).toBeUndefined();
    expect(sessionService.session).toBe(session);
    expect(angular._appContext.getModel("session") as unknown).toBe(session);

    consumer.session = session;
    consumer.$watch("session.token", (value: string) => {
      observedTokens.push(value);
    });

    await wait();

    sessionService.rotate("abc");

    await wait();

    expect(observedTokens).toEqual(["", "abc"]);

    rootScope.$destroy();

    expect(angular._appContext.getModel("session") as unknown).toBe(session);

    sessionService.rotate("def");

    await wait();

    expect(observedTokens).toEqual(["", "abc", "def"]);

    consumer.$destroy();
    angular._appContext.destroy();

    expect(session.$handler._destroyed).toBeTrue();
  });

  it("isolates service-owned model state between app contexts", () => {
    const first = new AppContext();
    const second = new AppContext();
    const factory = () => ({ online: false });
    const firstConnection = first.registerModel("connection", factory);
    const secondConnection = second.registerModel("connection", factory);

    firstConnection.online = true;

    expect(firstConnection).not.toBe(secondConnection);
    expect(firstConnection.online).toBeTrue();
    expect(secondConnection.online).toBeFalse();
    expect(first.getModel("connection")).toBe(firstConnection);
    expect(second.getModel("connection")).toBe(secondConnection);
  });
});
