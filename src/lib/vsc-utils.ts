import path from "path";
import { v4 as uuid } from "uuid";
import {
  window,
  TextEditor,
  TextDocument,
  WorkspaceEdit,
  Uri,
  workspace,
  Position,
} from "vscode";

export function getActiveEditor(): TextEditor {
  const editor = window.activeTextEditor;

  if (!editor) {
    throw new Error("No active editor found");
  }

  return editor;
}

export async function writeAndOpenMarkdownDocument(
  document: TextDocument,
  escapedName: string,
  text: string
) {
  const edit = new WorkspaceEdit();
  const fileName = `${escapedName}-${uuid()}.md`;
  const parentPath = path.dirname(document.fileName);
  const filePath = path.join(parentPath, fileName);
  const newFile = Uri.parse("untitled:" + filePath);
  const newDocument = await workspace.openTextDocument(newFile);

  edit.insert(newFile, new Position(0, 0), text);

  const success = await workspace.applyEdit(edit);

  if (!success) {
    throw new Error("Unable to edit the document");
  }

  window.showTextDocument(newDocument);
}
