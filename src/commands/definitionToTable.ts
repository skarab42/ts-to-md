import { requireModule } from "../lib/resolve";
import { getDefinitions } from "../lib/ts-utils";
import { getActiveEditor } from "../lib/vsc-utils";
import { ExtensionContext, window, env } from "vscode";
import { toMarkdownTable } from "../lib/toMarkdownTable";

export const DEFINITION_TO_TABLE_COMMAND = "ts-to-md.definitionToTable";

export async function definitionToTable(this: ExtensionContext) {
  try {
    const editor = getActiveEditor();
    const { document, selection } = editor;
    const tsModule = await requireModule("typescript", document.uri);
    const tsDefinitions = getDefinitions({ document, selection, tsModule });

    env.clipboard.writeText(toMarkdownTable(tsDefinitions));
    window.showInformationMessage("Markdown definition copied to clipboard");
  } catch (error) {
    console.log(error);
    window.showWarningMessage(error.message);
  }
}
