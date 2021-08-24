import ts from "typescript";

import * as vscode from "vscode";
import * as utils from "tsutils";

export async function interfaceToTable(this: vscode.ExtensionContext) {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    return;
  }

  try {
    const { document, selection } = editor;
    const { fileName } = document;
    const { line, character } = selection.start;
    const program = ts.createProgram([fileName], {});
    const sourceFile = program.getSourceFile(fileName);

    if (!sourceFile) {
      return;
    }

    const position = ts.getPositionOfLineAndCharacter(
      sourceFile,
      line,
      character
    );

    const token = utils.getTokenAtPosition(sourceFile, position);

    if (!token) {
      return;
    }

    const { parent } = token;

    if (parent && utils.isInterfaceDeclaration(parent)) {
      const checker = program.getTypeChecker();
      const symbol = checker.getSymbolAtLocation(parent.name);

      if (!symbol) {
        return;
      }

      const members = symbol.members;
      const name = symbol.escapedName;
      const docs = ts.displayPartsToString(
        symbol.getDocumentationComment(checker)
      );

      // console.log(">>>", { parent, token, symbol, members });
      console.log(">>>", { name, docs });

      if (members) {
        members.forEach((member) => {
          const type = checker.getTypeOfSymbolAtLocation(
            member,
            member.valueDeclaration!
          );
          console.log("---", member.escapedName, checker.typeToString(type));
        });
      }
    }
  } catch (error) {
    console.log(error);
  }
}
