import { SymbolFlags } from "typescript";
import { getActiveEditor } from "../lib/vsc-utils";
import { ExtensionContext, window, env } from "vscode";
import {
  getNearestInterface,
  createProgramAndGetSourceFile,
  getDocumentationCommentAsString,
} from "../lib/ts-utils";

interface interfaceDef {
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
    const { checker, sourceFile } = createProgramAndGetSourceFile(
      document.fileName,
      document.getText()
    );

    const nearestInterface = getNearestInterface(sourceFile, selection.start);

    if (!nearestInterface) {
      return;
    }

    const type = checker.getTypeAtLocation(nearestInterface.name);
    const docs = getDocumentationCommentAsString(checker, type.symbol);

    const intDef: interfaceDef = {
      name: type.symbol.escapedName.toString(),
      props: [],
      docs,
    };

    console.log(type.getProperties());

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

      intDef.props.push({
        name: prop.getName(),
        type: checker.typeToString(propType),
        defaultValue,
        optional,
        docs,
      });
    }

    let markdownText = `# ${intDef.name}\n\n`;

    if (intDef.docs) {
      markdownText += `${intDef.docs}\n\n`;
    }

    const labels = ["name", "type", "optional", "default", "description"];
    const spearators: string[] = Array(labels.length).fill(
      "-",
      0,
      labels.length
    );

    markdownText += `| ${labels.join(" | ")} |\n`;
    markdownText += `| ${spearators.join(" | ")} |\n`;

    intDef.props.forEach((prop) => {
      const values = [
        prop.name,
        `\`${prop.type}\``,
        `\`${prop.optional}\``,
        prop.defaultValue ?? "n/a",
        prop.docs,
      ];
      markdownText += `| ${values.join(" | ")} |\n`;
    });

    env.clipboard.writeText(markdownText);
    window.showInformationMessage("Interface definition copied to clipboard");
  } catch (error) {
    console.log(error);
    window.showWarningMessage(error.stack);
  }
}
