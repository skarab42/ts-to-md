import { commands } from "vscode";
import sinon from "sinon";

import { DEFINITION_TO_TABLE_COMMAND } from "../../commands/definitionToTable";
import {
  assertClipboardEqualDefinition,
  assertEmptyClipboard,
  test,
  withTSEditor,
} from "../utils";

suite("Types", () => {
  test("should export a basic type with a single property", () => {
    return withTSEditor(`type Test = { a: string }`, async () => {
      await commands.executeCommand(DEFINITION_TO_TABLE_COMMAND);

      await assertClipboardEqualDefinition({
        name: "Test",
        props: [{ name: "a", type: "string" }],
      });
    });
  });

  test("should export a basic tye with multiple properties and multiple types", () => {
    return withTSEditor(
      `type Test = { a: string; b: number; c: boolean[]; }`,
      async () => {
        await commands.executeCommand(DEFINITION_TO_TABLE_COMMAND);

        await assertClipboardEqualDefinition({
          name: "Test",
          props: [
            { name: "a", type: "string" },
            { name: "b", type: "number" },
            { name: "c", type: "boolean[]" },
          ],
        });
      }
    );
  });

  test("should export a type with mixed optional properties", () => {
    return withTSEditor(`type Test = { a: string; b?: string }`, async () => {
      await commands.executeCommand(DEFINITION_TO_TABLE_COMMAND);

      await assertClipboardEqualDefinition({
        name: "Test",
        props: [
          { name: "a", type: "string" },
          { name: "b", type: "string", optional: true },
        ],
      });
    });
  });

  test("should export a type with union types", () => {
    return withTSEditor(`type Test = { a: string | number }`, async () => {
      await commands.executeCommand(DEFINITION_TO_TABLE_COMMAND);

      await assertClipboardEqualDefinition({
        name: "Test",
        props: [{ name: "a", type: "string | number" }],
      });
    });
  });

  test("should export a type with functions as properties", () => {
    return withTSEditor(
      `type Test = { a: (b: string) => boolean; c(d: number): string[] }`,
      async () => {
        await commands.executeCommand(DEFINITION_TO_TABLE_COMMAND);

        await assertClipboardEqualDefinition({
          name: "Test",
          props: [
            { name: "a", type: "(b: string) => boolean" },
            { name: "c", type: "(d: number) => string[]" },
          ],
        });
      }
    );
  });

  test("should export a type with a property using a type alias", () => {
    return withTSEditor(
      `type Test = { a: Alias }; type Alias = string`,
      async () => {
        await commands.executeCommand(DEFINITION_TO_TABLE_COMMAND);

        await assertClipboardEqualDefinition({
          name: "Test",
          props: [{ name: "a", type: "string" }],
        });
      }
    );
  });

  test("should export a type with an intersection", () => {
    return withTSEditor(
      `type Test = { a: string } & Test1; type Test1 = { b: number }`,
      async () => {
        await commands.executeCommand(DEFINITION_TO_TABLE_COMMAND);

        await assertClipboardEqualDefinition({
          name: "Test",
          props: [
            { name: "a", type: "string" },
            { name: "b", type: "number" },
          ],
        });
      }
    );
  });

  test("should export a type with multiple intersections", () => {
    return withTSEditor(
      `type Test = { a: string } & Test1 & Test2; type Test1 = { b: number }; type Test2 = { c: boolean }`,
      async () => {
        await commands.executeCommand(DEFINITION_TO_TABLE_COMMAND);

        await assertClipboardEqualDefinition({
          name: "Test",
          props: [
            { name: "a", type: "string" },
            { name: "b", type: "number" },
            { name: "c", type: "boolean" },
          ],
        });
      }
    );
  });

  test("should export a type with an intersection combined with an utility type", () => {
    return withTSEditor(
      `type Test = { a: string } & Omit<Test1, 'c'>; type Test1 = { b: number; c: boolean }`,
      async () => {
        await commands.executeCommand(DEFINITION_TO_TABLE_COMMAND);

        await assertClipboardEqualDefinition({
          name: "Test",
          props: [
            { name: "a", type: "string" },
            { name: "b", type: "number" },
          ],
        });
      }
    );
  });

  test("should export a mapped type mapping over a type", () => {
    return withTSEditor(
      `type Test = ToNumber<Test1>;
    type Test1 = { a: string; b: boolean };
    type ToNumber<T> = {
      [key in keyof T]: number
    }`,
      async () => {
        await commands.executeCommand(DEFINITION_TO_TABLE_COMMAND);

        await assertClipboardEqualDefinition({
          name: "ToNumber<Test1>",
          props: [
            { name: "a", type: "number" },
            { name: "b", type: "number" },
          ],
        });
      }
    );
  });

  test("should export a mapped type mapping over an interface", () => {
    return withTSEditor(
      `type Test<K extends keyof Test1> = {
    [key in K]: number;
  } & { c: string };
  interface Test1 {
    a: string;
    b: number;
  }`,
      async () => {
        await commands.executeCommand(DEFINITION_TO_TABLE_COMMAND);

        await assertClipboardEqualDefinition({
          name: "Test<K>",
          props: [
            { name: "[key in K]", type: "number" },
            { name: "c", type: "string" },
          ],
        });
      }
    );
  });

  test("should export a generic type", () => {
    return withTSEditor(`type Test<T> = { a: T }`, async () => {
      await commands.executeCommand(DEFINITION_TO_TABLE_COMMAND);

      await assertClipboardEqualDefinition({
        name: "Test<T>",
        props: [{ name: "a", type: "T" }],
      });
    });
  });
});

suite("Type errors", () => {
  let consoleLogStub: sinon.SinonStub;

  setup(() => {
    consoleLogStub = sinon.stub(console, "log");
  });

  teardown(() => {
    consoleLogStub.restore();
  });

  test("should not export a type which is not an object type", () => {
    return withTSEditor(`type Test = string`, async () => {
      await commands.executeCommand(DEFINITION_TO_TABLE_COMMAND);

      sinon.assert.calledOnce(consoleLogStub);
      await assertEmptyClipboard();
    });
  });

  test("should not export an empty object type", () => {
    return withTSEditor(`type Test = {}`, async () => {
      await commands.executeCommand(DEFINITION_TO_TABLE_COMMAND);

      sinon.assert.calledOnce(consoleLogStub);
      await assertEmptyClipboard();
    });
  });

  test("should not export a type with invalid TypeScript code", () => {
    return withTSEditor(`type Test = {}; type A`, async () => {
      await commands.executeCommand(DEFINITION_TO_TABLE_COMMAND);

      sinon.assert.calledOnce(consoleLogStub);
      await assertEmptyClipboard();
    });
  });
});
