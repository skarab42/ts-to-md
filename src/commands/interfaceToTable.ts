import ts from "typescript";
import * as vscode from "vscode";
import { getActiveEditor } from "../lib/vsc-utils";
import {
  createProgramAndGetSourceFile,
  getDocumentationCommentAsString,
  getNearestInterface,
  getPositionOfLineAndCharacter,
  getTypeOfSymbolAtLocationAsString,
} from "../lib/ts-utils";

export async function interfaceToTable(this: vscode.ExtensionContext) {
  try {
    const editor = getActiveEditor();
    const { document, selection } = editor;
    const { program, sourceFile } = createProgramAndGetSourceFile(
      document.fileName
    );

    const position = getPositionOfLineAndCharacter(sourceFile, selection.start);
    const nearestInterface = getNearestInterface(sourceFile, position);

    if (!nearestInterface) {
      return;
    }

    const checker = program.getTypeChecker();
    const symbol = checker.getSymbolAtLocation(nearestInterface.name);

    if (!symbol) {
      return;
    }

    const { members, escapedName } = symbol;
    const docs = getDocumentationCommentAsString(checker, symbol);

    const lines = [`# Interface ${escapedName}`];

    if (docs) {
      lines.push(docs);
    }

    if (members) {
      members.forEach((memberSymbol) => {
        const type = getTypeOfSymbolAtLocationAsString(checker, memberSymbol);

        if (type) {
          lines.push(`${memberSymbol.escapedName} - ${type}`);
        }
      });
    }

    console.log(lines.join("\n"));
  } catch (error) {
    console.log(error);
  }
}
