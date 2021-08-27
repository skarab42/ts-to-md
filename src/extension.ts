import * as vscode from "vscode";
import pkg from "../package.json";
import * as commands from "./commands";

export function activate(context: vscode.ExtensionContext) {
  const { subscriptions } = context;

  subscriptions.push(
    ...Object.entries(commands).map(([name, command]) =>
      vscode.commands.registerCommand(`${pkg.name}.${name}`, command, context)
    )
  );
}
