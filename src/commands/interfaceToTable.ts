import * as vscode from "vscode";
import * as ts from "typescript";
import * as utils from "tsutils";

export function interfaceToTable(this: vscode.ExtensionContext) {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    return;
  }

  const { document, selection } = editor;
  const { line, character } = selection.start;
  const { fileName } = document;

  const text = document.getText();
  const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest);
  const position = ts.getPositionOfLineAndCharacter(source, line, character);
  const token = utils.getTokenAtPosition(source, position);

  if (!token) {
    return;
  }

  const { parent } = token;

  if (parent && utils.isInterfaceDeclaration(parent)) {
    const { name, members, heritageClauses } = parent;

    console.log(`interface ${name.escapedText} {...}`, parent);

    members.forEach((member) => {
      console.log(">", member);
    });

    if (heritageClauses) {
      heritageClauses.forEach((member) => {
        console.log(">>", member);
      });
    }
  }
}
