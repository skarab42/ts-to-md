import { window, TextEditor } from "vscode";

export function getActiveEditor(): TextEditor {
  const editor = window.activeTextEditor;

  if (!editor) {
    throw new Error("No active editor found");
  }

  return editor;
}
