import {
  getActiveEditor,
  writeAndOpenMarkdownDocument,
} from "../lib/vsc-utils";
import {
  getNearestInterface,
  getPositionOfLineAndCharacter,
  createProgramAndGetSourceFile,
  getDocumentationCommentAsString,
  getTypeOfSymbolAtLocationAsString,
} from "../lib/ts-utils";
import { ExtensionContext, window } from "vscode";

export async function interfaceToTable(this: ExtensionContext) {
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

    const lines = [`# Interface ${escapedName}\n`];

    if (docs) {
      lines.push(`${docs}\n`);
    }

    if (members) {
      members.forEach((memberSymbol) => {
        const type = getTypeOfSymbolAtLocationAsString(checker, memberSymbol);

        if (type) {
          lines.push(`${memberSymbol.escapedName} - ${type}`);
        }
      });
    }

    const markdownText = lines.join("\n");

    await writeAndOpenMarkdownDocument(
      document,
      escapedName as string,
      markdownText
    );
  } catch (error) {
    console.log(error);
    window.showWarningMessage(error.stack);
  }
}
