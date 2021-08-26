import path from "path";
import ts from "typescript";
import * as tsutils from "tsutils";

interface ProgramAndSourceFile {
  program: ts.Program;
  sourceFile: ts.SourceFile;
  checker: ts.TypeChecker;
}

interface SelectionStart {
  line: number;
  character: number;
}

type VirtualFS = Map<string, ts.SourceFile>;
type FSEntry = { fileName: string; text: string };

function posixPath(input: string): string {
  return input.split(path.sep).join(path.posix.sep);
}

function forceTsExtension(input: string): string {
  if (![".ts", ".tsx"].includes(path.extname(input))) {
    return `${input}.ts`;
  }

  return input;
}

function createVirtualFS(
  entries: FSEntry[],
  target: ts.ScriptTarget = ts.ScriptTarget.ESNext
): VirtualFS {
  return new Map(
    entries.map(({ fileName, text }) => [
      fileName,
      ts.createSourceFile(fileName, text, target),
    ])
  );
}

function createCompilerHost(virtualFS: VirtualFS): ts.CompilerHost {
  return {
    getSourceFile: (fileName: string) => {
      console.log(">>>", fileName);
      return virtualFS.get(fileName);
    },
    fileExists: (fileName: string) => virtualFS.has(fileName),
    getCanonicalFileName: (fileName: string) => fileName,
    readFile: (fileName: string) => {
      return virtualFS.has(fileName)
        ? virtualFS.get(fileName)!.getFullText()
        : undefined;
    },
    writeFile: () => {},
    getNewLine: () => "\n",
    getDirectories: () => [],
    getCurrentDirectory: () => "/",
    getDefaultLibFileName: () => "",
    getEnvironmentVariable: () => "",
    useCaseSensitiveFileNames: () => true,
  };
}

export function createProgramAndGetSourceFile(
  fileName: string,
  text: string,
  options?: ts.CompilerOptions
): ProgramAndSourceFile {
  fileName = forceTsExtension(posixPath(fileName));

  const virtualFS = createVirtualFS([{ fileName, text }]);
  const compilerHost = createCompilerHost(virtualFS);
  const program = ts.createProgram([fileName], options ?? {}, compilerHost);
  const checker = program.getTypeChecker();

  const diagnostics = program.getGlobalDiagnostics();
  console.log({ diagnostics });

  return { program, checker, sourceFile: virtualFS.get(fileName)! };
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
