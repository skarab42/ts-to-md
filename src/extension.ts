import * as vscode from "vscode";

import {
  definitionToTable,
  DEFINITION_TO_TABLE_COMMAND,
} from "./commands/definitionToTable";

export function activate(context: vscode.ExtensionContext) {
  const { subscriptions } = context;

  subscriptions.push(
    vscode.commands.registerCommand(
      DEFINITION_TO_TABLE_COMMAND,
      definitionToTable,
      context
    )
  );
}
