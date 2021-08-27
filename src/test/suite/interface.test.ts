import { commands } from "vscode";

import { DEFINITION_TO_TABLE_COMMAND } from "../../commands/definitionToTable";
import { assertClipboardEqualDefinition, test, withTSEditor } from "../utils";

suite("Basic interfaces", () => {
  test("should export a basic interface with a single property", () => {
    return withTSEditor(`interface Test { a: string }`, async () => {
      await commands.executeCommand(DEFINITION_TO_TABLE_COMMAND);

      await assertClipboardEqualDefinition({
        name: "Test",
        props: [{ name: "a", type: "string", optional: false }],
      });
    });
  });

  test("should export a basic interface with multiple properties", () => {
    return withTSEditor(`interface Test { a: string; b: string }`, async () => {
      await commands.executeCommand(DEFINITION_TO_TABLE_COMMAND);

      await assertClipboardEqualDefinition({
        name: "Test",
        props: [
          { name: "a", type: "string", optional: false },
          { name: "b", type: "string", optional: false },
        ],
      });
    });
  });

  test("should export an interface with mixed optional properties", () => {
    return withTSEditor(
      `interface Test { a?: string; b?: string }`,
      async () => {
        await commands.executeCommand(DEFINITION_TO_TABLE_COMMAND);

        await assertClipboardEqualDefinition({
          name: "Test",
          props: [
            { name: "a", type: "string", optional: true },
            { name: "b", type: "string", optional: true },
          ],
        });
      }
    );
  });
});
