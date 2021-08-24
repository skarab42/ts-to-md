import ts from "typescript";
import * as tsutils from "tsutils";

export interface ProgramAndSourceFile {
  program: ts.Program;
  sourceFile: ts.SourceFile;
}

export interface SelectionStart {
  line: number;
  character: number;
}

export function createProgramAndGetSourceFile(
  fileName: string,
  options?: ts.CompilerOptions
): ProgramAndSourceFile {
  const program = ts.createProgram([fileName], options ?? {});
  const sourceFile = program.getSourceFile(fileName);

  if (!sourceFile) {
    throw new Error(`Source file not found: ${fileName}`);
  }

  return { program, sourceFile };
}

export function getPositionOfLineAndCharacter(
  sourceFile: ts.SourceFileLike,
  { line, character }: SelectionStart
): number {
  return ts.getPositionOfLineAndCharacter(sourceFile, line, character);
}

export function getTokenAtPosition(
  sourceFile: ts.SourceFile,
  position: number
): ts.Node {
  const token = tsutils.getTokenAtPosition(sourceFile, position);

  if (!token) {
    throw new Error(`No token found at ${sourceFile.fileName}:${position}`);
  }

  return token;
}

export function getNearestInterface(
  sourceFile: ts.SourceFile,
  position: number
): ts.InterfaceDeclaration | null {
  if (position < 0) {
    return null;
  }

  const { parent } = getTokenAtPosition(sourceFile, position);

  if (parent && tsutils.isInterfaceDeclaration(parent)) {
    return parent;
  }

  return getNearestInterface(sourceFile, position - 1);
}

export function getDocumentationCommentAsString(
  checker: ts.TypeChecker,
  symbol: ts.Symbol
): string {
  return ts.displayPartsToString(symbol.getDocumentationComment(checker));
}

export function getTypeOfSymbolAtLocationAsString(
  checker: ts.TypeChecker,
  symbol: ts.Symbol
): string {
  const declaration = symbol.valueDeclaration;

  if (!declaration) {
    throw new Error("Undefined declaration");
  }

  return checker.typeToString(
    checker.getTypeOfSymbolAtLocation(symbol, declaration)
  );
}
