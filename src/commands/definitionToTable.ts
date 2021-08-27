import {
  getNearestDefinition,
  createProgramAndGetSourceFile,
  getDocumentationCommentAsString,
} from "../lib/ts-utils";
import { SignatureKind, SymbolFlags } from "typescript";
import { getActiveEditor } from "../lib/vsc-utils";
import { ExtensionContext, window, env } from "vscode";
import { toMarkdownTable } from "../lib/toMarkdownTable";

export interface Definition {
  name: string;
  docs: string;
  props: DefinitionProp[];
}

interface DefinitionProp {
  name: string;
  type: string;
  docs: string;
  optional: boolean;
  defaultValue?: string;
}

export async function definitionToTable(this: ExtensionContext) {
  try {
    const editor = getActiveEditor();
    const { document, selection } = editor;
    const { diagnostics, sourceFile, checker } = createProgramAndGetSourceFile(
      document.fileName,
      document.getText()
    );

    if (diagnostics.length) {
      window.showWarningMessage(
        "Could not generate definitions for your type/interface due to type-checking issues." +
          "Please fix your code TypeScript errors and try again."
      );
      return;
    }

    const nearestType = getNearestDefinition(sourceFile, selection.start);

    if (!nearestType) {
      return;
    }

    const type = checker.getTypeAtLocation(nearestType.name);
    const stringIndex = type.getStringIndexType();
    const numberIndex = type.getNumberIndexType();
    const props = type.getProperties();

    if (!stringIndex && !numberIndex && !props.length) {
      window.showWarningMessage(
        "Could not generate markdown for empty definition."
      );
      return;
    }

    const symbol = type.symbol ?? type.aliasSymbol;

    if (!symbol) {
      window.showWarningMessage(
        "Could not generate markdown for this type of definition."
      );
      return;
    }

    const docs = getDocumentationCommentAsString(checker, symbol);

    let escapedName = symbol.escapedName;

    if (type.aliasSymbol) {
      escapedName = type.aliasSymbol.escapedName;
    }

    const defs: Definition = {
      name: escapedName.toString(),
      props: [],
      docs,
    };

    if (stringIndex || numberIndex) {
      const index = stringIndex ?? numberIndex;
      defs.props.push({
        name: `[key: ${numberIndex ? "number" : "string"}]`,
        type: checker.typeToString(index!),
        defaultValue: undefined,
        optional: true,
        docs,
      });
    }

    for (const prop of props) {
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
    window.showInformationMessage("Markdown definition copied to clipboard");
  } catch (error) {
    console.log(error);
    window.showWarningMessage(error.stack);
  }
}