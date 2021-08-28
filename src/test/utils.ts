import Mocha from "mocha";
import assert from "assert";
import {
  commands,
  env,
  Position,
  Selection,
  TextEditor,
  Uri,
  window,
  workspace,
} from "vscode";
import path from "path";

import { Definition } from "../commands/definitionToTable";
import { toMarkdownTable } from "../lib/toMarkdownTable";

export function test(title: string, fn?: Mocha.AsyncFunc) {
  if (fn) {
    Mocha.test(title, function () {
      this.timeout(5000);

      return fn.call(this);
    });
  } else {
    Mocha.test(title);
  }
}

export async function withTSEditor(
  content: string,
  run: () => Promise<void>,
  cursorPosition?: Position
) {
  const editor = await showEditor(Uri.parse("untitled:ts-to-md-test.ts"));

  await editor.edit((editBuilder) => {
    editBuilder.insert(new Position(0, 0), content);
  });

  return runAtPosition(editor, run, cursorPosition);
}

export async function withFixtureEditor(
  name: string,
  run: () => Promise<void>,
  cursorPosition?: Position
) {
  // We need the original TypeScript fixtures outside of the dist folder.
  const fixturePath = path.join(
    __dirname,
    `../../src/test/fixtures/${name}.ts`
  );

  const editor = await showEditor(Uri.parse(`file:${fixturePath}`));

  return runAtPosition(editor, run, cursorPosition);
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

export function emptyClipboard() {
  return env.clipboard.writeText("");
}

export function assertEmptyClipboard() {
  return assertClipboardEqual("");
}

async function showEditor(uri: Uri): Promise<TextEditor> {
  const document = await workspace.openTextDocument(uri);

  // Add a little bit of delay after opening a new file with a document language set to TypeScript as the extension is
  // loaded when the language is changed to TypeScript rather than when the command is activated.
  await delay(500);

  return window.showTextDocument(document);
}

async function runAtPosition(
  editor: TextEditor,
  run: () => Promise<void>,
  cursorPosition = new Position(0, 0)
) {
  const selection = new Selection(cursorPosition, cursorPosition);
  editor.selection = selection;

  await run();

  return commands.executeCommand("workbench.action.closeAllEditors");
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
