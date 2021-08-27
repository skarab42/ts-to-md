import { window, TextEditor } from "vscode";

export function getActiveEditor(): TextEditor {
  const editor = window.activeTextEditor;

  if (!editor) {
    throw new Error("No active editor found");
  }

  return editor;
}

// export async function showWarnings(warnings: string[]) {
//   if (warnings.length === 0) {
//     return true;
//   }

//   const showWarnings = "Show warnings";
//   const continueAnyway = "Continue anyway";

//   let message = warnings[0]!;

//   if (warnings.length > 1) {
//     message += ` and ${warnings.length - 1} more...`;
//   }

//   const action = await window.showWarningMessage(
//     message,
//     showWarnings,
//     continueAnyway
//   );

//   if (action === showWarnings) {
//     const text = warnings.join("\n---\n");
//     console.log(text);
//     return false;
//   }

//   return action === continueAnyway;
// }
