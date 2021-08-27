import { commands } from "vscode";

import { DEFINITION_TO_TABLE_COMMAND } from "../../commands/definitionToTable";
import { assertClipboardEqualDefinition, test, withTSEditor } from "../utils";

suite("Interfaces", () => {
  test("should export a basic interface with a single property", () => {
    return withTSEditor(`interface Test { a: string }`, async () => {
      await commands.executeCommand(DEFINITION_TO_TABLE_COMMAND);

      await assertClipboardEqualDefinition({
        name: "Test",
        props: [{ name: "a", type: "string", optional: false }],
      });
    });
  });

  test("should export a basic interface with multiple properties and multiple types", () => {
    return withTSEditor(`interface Test { a: string; b: number }`, async () => {
      await commands.executeCommand(DEFINITION_TO_TABLE_COMMAND);

      // TODO(HiDeoo) Add more types

      await assertClipboardEqualDefinition({
        name: "Test",
        props: [
          { name: "a", type: "string", optional: false },
          { name: "b", type: "number", optional: false },
        ],
      });
    });
  });

  test("should export an interface with mixed optional properties", () => {
    return withTSEditor(
      `interface Test { a: string; b?: string }`,
      async () => {
        await commands.executeCommand(DEFINITION_TO_TABLE_COMMAND);

        await assertClipboardEqualDefinition({
          name: "Test",
          props: [
            { name: "a", type: "string", optional: false },
            { name: "b", type: "string", optional: true },
          ],
        });
      }
    );
  });

  test("should export an interface with union types");

  test("should export an interface with functions as properties");

  test("should export an interface extending another one");

  test("should export an interface extending multiple ones");

  test(
    "should export an interface extending another one transformed with an utility type"
  );

  test("should export an interface with a string index signature");

  test("should export an interface with a number index signature");

  test("should export a generic interface");
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
