import {
  getNearestInterface,
  createProgramAndGetSourceFile,
  getDocumentationCommentAsString,
} from "../lib/ts-utils";
import { SymbolFlags } from "typescript";
import { getActiveEditor } from "../lib/vsc-utils";
import { ExtensionContext, window, env } from "vscode";
import { toMarkdownTable } from "../lib/toMarkdownTable";

export interface InterfaceDef {
  name: string;
  docs: string;
  props: InterfaceProp[];
}

interface InterfaceProp {
  name: string;
  type: string;
  docs: string;
  optional: boolean;
  defaultValue?: string;
}

export async function interfaceToTable(this: ExtensionContext) {
  try {
    const editor = getActiveEditor();
    const { document, selection } = editor;
    const { diagnostics, sourceFile, checker } = createProgramAndGetSourceFile(
      document.fileName,
      document.getText()
    );

    if (diagnostics.length) {
      window.showWarningMessage(
        "Could not generate definitions for your interface due to type-checking issues." +
          "Please fix your code TypeScript errors and try again."
      );
      return;
    }

    const nearestInterface = getNearestInterface(sourceFile, selection.start);

    if (!nearestInterface) {
      return;
    }

    const type = checker.getTypeAtLocation(nearestInterface.name);
    const docs = getDocumentationCommentAsString(checker, type.symbol);

    const defs: InterfaceDef = {
      name: type.symbol.escapedName.toString(),
      props: [],
      docs,
    };

    for (const prop of type.getProperties()) {
      const declaration = prop.valueDeclaration || prop.declarations?.[0];
      const propType = checker.getTypeOfSymbolAtLocation(prop, declaration!);
      const optional = (prop.flags & SymbolFlags.Optional) !== 0;
      const docs = getDocumentationCommentAsString(checker, prop);
      const jsDocs = prop.getJsDocTags();

      const defaultTag = jsDocs.find((tag) =>
        ["defaultvalue", "default"].includes(tag.name)
      );
      const defaultValue = defaultTag && defaultTag?.text?.[0]?.text;

      defs.props.push({
        name: prop.getName(),
        type: checker.typeToString(propType),
        defaultValue,
        optional,
        docs,
      });
    }

    env.clipboard.writeText(toMarkdownTable(defs));
    window.showInformationMessage("Interface definition copied to clipboard");
  } catch (error) {
    console.log(error);
    window.showWarningMessage(error.stack);
  }
}
