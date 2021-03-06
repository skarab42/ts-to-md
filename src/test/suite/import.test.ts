import { commands, Position } from "vscode";

import { DEFINITION_TO_TABLE_COMMAND } from "../../commands/definitionToTable";
import {
  assertClipboardEqualDefinition,
  test,
  withFixtureEditor,
} from "../utils";

const timeout = 10_000;

suite("Imports", () => {
  test("should resolve an imported type", async function () {
    this.timeout(timeout);

    return withFixtureEditor(
      "import",
      async () => {
        await commands.executeCommand(DEFINITION_TO_TABLE_COMMAND);

        await assertClipboardEqualDefinition({
          name: "Test1",
          props: [
            { name: "a", type: "string" },
            { name: "b", type: "number" },
          ],
        });
      },
      new Position(2, 0)
    );
  });

  test("should resolve an imported interface", async function () {
    this.timeout(timeout);

    return withFixtureEditor(
      "import",
      async () => {
        await commands.executeCommand(DEFINITION_TO_TABLE_COMMAND);

        await assertClipboardEqualDefinition({
          name: "Test2",
          props: [
            { name: "a", type: "number" },
            { name: "b", type: "string" },
          ],
        });
      },
      new Position(4, 0)
    );
  });
});
