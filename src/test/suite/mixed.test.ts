import { commands } from "vscode";

import { DEFINITION_TO_TABLE_COMMAND } from "../../commands/definitionToTable";
import { assertClipboardEqualDefinition, withTSEditor } from "../utils";

suite("Types & Interfaces", () => {
  test("should export a type which is the intersection of multiple interfaces", () => {
    return withTSEditor(
      `type Test = Test1 & Test2; interface Test1 { a: string }; interface Test2 { b: number }`,
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

  test("should export an interface extending a type", () => {
    return withTSEditor(
      `interface Test extends Test1 { a: string }; type Test1 = { b: number }`,
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
});
