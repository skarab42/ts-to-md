import { commands } from "vscode";

import { DEFINITION_TO_TABLE_COMMAND } from "../../commands/definitionToTable";
import { assertClipboardEqualDefinition, test, withTSEditor } from "../utils";

suite("Interfaces", () => {
  test("should export a basic interface with a single property", () => {
    return withTSEditor(`interface Test { a: string }`, async () => {
      await commands.executeCommand(DEFINITION_TO_TABLE_COMMAND);

      await assertClipboardEqualDefinition({
        name: "Test",
        props: [{ name: "a", type: "string" }],
      });
    });
  });

  test("should export a basic interface with multiple properties and multiple types", () => {
    return withTSEditor(
      `interface Test { a: string; b: number; c: boolean[]; }`,
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

  test("should export an interface with mixed optional properties", () => {
    return withTSEditor(
      `interface Test { a: string; b?: string }`,
      async () => {
        await commands.executeCommand(DEFINITION_TO_TABLE_COMMAND);

        await assertClipboardEqualDefinition({
          name: "Test",
          props: [
            { name: "a", type: "string" },
            { name: "b", type: "string", optional: true },
          ],
        });
      }
    );
  });

  test("should export an interface with union types", () => {
    return withTSEditor(`interface Test { a: string | number }`, async () => {
      await commands.executeCommand(DEFINITION_TO_TABLE_COMMAND);

      await assertClipboardEqualDefinition({
        name: "Test",
        props: [{ name: "a", type: "string | number" }],
      });
    });
  });

  test("should export an interface with functions as properties", () => {
    return withTSEditor(
      `interface Test { a: (b: string) => boolean; c(d: number): string[] }`,
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

  test("should export an interface with a property using a type alias", () => {
    return withTSEditor(
      `interface Test { a: Alias }; type Alias = string`,
      async () => {
        await commands.executeCommand(DEFINITION_TO_TABLE_COMMAND);

        await assertClipboardEqualDefinition({
          name: "Test",
          props: [{ name: "a", type: "string" }],
        });
      }
    );
  });

  test("should export an interface extending another one", () => {
    return withTSEditor(
      `interface Test extends Test1 { a: string }; interface Test1 { b: number }`,
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

  test("should export an interface extending multiple ones", () => {
    return withTSEditor(
      `interface Test extends Test1, Test2 { a: string }; interface Test1 { b: number }; interface Test2 { c: boolean }`,
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

  test("should export an interface extending another one transformed with an utility type", () => {
    return withTSEditor(
      `interface Test extends Omit<Test1, 'c'> { a: string }; interface Test1 { b: number; c: boolean };`,
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

  test("should export an interface with a string index signature", () => {
    return withTSEditor(
      `interface Test { a: boolean; [key: string]: boolean }`,
      async () => {
        await commands.executeCommand(DEFINITION_TO_TABLE_COMMAND);

        await assertClipboardEqualDefinition({
          name: "Test",
          props: [
            { name: "[key: string]", type: "boolean", optional: true },
            { name: "a", type: "boolean" },
          ],
        });
      }
    );
  });

  test("should export an interface with a number index signature", () => {
    return withTSEditor(
      `interface Test { 1: boolean; [key: number]: boolean }`,
      async () => {
        await commands.executeCommand(DEFINITION_TO_TABLE_COMMAND);

        await assertClipboardEqualDefinition({
          name: "Test",
          props: [
            { name: "[key: number]", type: "boolean", optional: true },
            { name: "1", type: "boolean" },
          ],
        });
      }
    );
  });

  test("should export a generic interface", () => {
    return withTSEditor(
      `interface Test<T, U> { key: T; value: U }`,
      async () => {
        await commands.executeCommand(DEFINITION_TO_TABLE_COMMAND);

        await assertClipboardEqualDefinition({
          name: "Test",
          props: [
            { name: "key", type: "T" },
            { name: "value", type: "U" },
          ],
        });
      }
    );
  });
});

suite("Interface documentation", () => {
  test("should export an interface documentation");

  test("should export an interface property documentation");

  test("should export an interface property default value");

  test(
    "should not export an interface property documentation not matching the JSDoc syntax"
  );
});

suite("Interface errors", () => {
  test("should not export an empty interface");

  test("should not export an interface with invalid TypeScript code");
});
