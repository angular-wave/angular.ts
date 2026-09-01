import { _storage } from "../injection-tokens.ts";
import { createPersistentProxy } from "../services/storage/storage.ts";
import { storageModule } from "./storage.ts";

describe("storage runtime module", () => {
  it("registers persistent storage with a custom runtime", () => {
    const factory = jasmine.createSpy("factory");
    const createModule = jasmine
      .createSpy("createModule")
      .and.returnValue({ factory });

    storageModule({
      createModule,
    } as unknown as Parameters<typeof storageModule>[0]);

    expect(createModule).toHaveBeenCalledWith("ng.storage", []);
    expect(factory).toHaveBeenCalledWith(_storage, jasmine.any(Function));
    expect(factory.calls.argsFor(0)[1]()).toBe(createPersistentProxy);
  });
});
