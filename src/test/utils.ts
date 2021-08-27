import Mocha from "mocha";
import assert from "assert";
import {
  commands,
  env,
  languages,
  Position,
  Selection,
  Uri,
  window,
  workspace,
} from "vscode";

import { Definition } from "../commands/definitionToTable";
import { toMarkdownTable } from "../lib/toMarkdownTable";

export function test(title: string, fn: Mocha.AsyncFunc) {
  Mocha.test(title, function () {
    this.timeout(5000);

    return fn.call(this);
  });
}

export async function withTSEditor(
  content: string,
  run: () => Promise<void>,
  cursorPosition = new Position(0, 0)
) {
  const document = await workspace.openTextDocument(
    Uri.parse("untitled:ts-to-md-test")
  );
  await languages.setTextDocumentLanguage(document, "typescript");

  // Add a little bit of delay after changing the document language to TypeScript as the extension is loaded when the
  // language is changed to TypeScript rather than when the command is activated.
  await delay(500);

  const editor = await window.showTextDocument(document);

  await editor.edit((editBuilder) => {
    editBuilder.insert(new Position(0, 0), content);
  });

  const selection = new Selection(cursorPosition, cursorPosition);
  editor.selection = selection;

  await run();

  return commands.executeCommand("workbench.action.closeAllEditors");
}

export async function assertClipboardEqualDefinition(
  definition: RecursivePartial<Definition>
) {
  return assertClipboardEqual(
    toMarkdownTable({
      name: definition.name ?? "",
      docs: definition.docs ?? "",
      props:
        definition.props?.map((prop) => ({
          name: prop?.name ?? "",
          type: prop?.type ?? "",
          docs: prop?.docs ?? "",
          optional: prop?.optional ?? false,
          defaultValue: prop?.defaultValue,
        })) ?? [],
    })
  );
}

async function assertClipboardEqual(expected: string) {
  const text = await env.clipboard.readText();

  assert.strictEqual(text, expected);
}

function delay(timeout: number) {
  return new Promise<void>((resolve) =>
    setTimeout(() => {
      resolve();
    }, timeout)
  );
}

type RecursivePartial<T> = {
  [P in keyof T]?: RecursivePartial<T[P]>;
};
