import {
  getActiveEditor,
  // writeAndOpenMarkdownDocument,
} from "../lib/vsc-utils";
import {
  getNearestInterface,
  getPositionOfLineAndCharacter,
  createProgramAndGetSourceFile,
  getDocumentationCommentAsString,
} from "../lib/ts-utils";
import { ExtensionContext, window } from "vscode";
import ts from "typescript";

interface interfaceDef {
  name: string;
  docs: string;
  props: InterfaceProp[];
}

interface InterfaceProp {
  name: string;
  type: string;
  desc?: string;
  optional: boolean;
}

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
    const type = checker.getTypeAtLocation(nearestInterface.name);
    const docs = getDocumentationCommentAsString(checker, type.symbol);

    const intDef: interfaceDef = {
      name: type.symbol.escapedName.toString(),
      docs,
      props: [],
    };

    for (const prop of type.getProperties()) {
      const declaration = prop.valueDeclaration || prop.declarations?.[0];
      const propType = checker.getTypeOfSymbolAtLocation(prop, declaration!);
      const optional = (prop.flags & ts.SymbolFlags.Optional) !== 0;

      intDef.props.push({
        name: prop.getName(),
        type: checker.typeToString(propType),
        optional,
      });
    }

    let markdownText = `# ${intDef.name}\n\n`;

    if (intDef.docs) {
      markdownText += `${intDef.docs}\n\n`;
    }

    intDef.props.forEach((prop) => {
      markdownText += `${prop.name} - ${prop.type} - ${prop.optional}\n`;
    });

    console.log(markdownText);

    // await writeAndOpenMarkdownDocument(document, intDef.name, markdownText);
  } catch (error) {
    console.log(error);
    window.showWarningMessage(error.stack);
  }
}
