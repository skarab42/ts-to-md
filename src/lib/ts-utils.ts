import path from "path";
import glob from "glob";
import { getTokenAtPosition } from "tsutils";
import {
  Symbol,
  Program,
  SourceFile,
  TypeChecker,
  CompilerHost,
  ScriptTarget,
  createProgram,
  CompilerOptions,
  createSourceFile,
  displayPartsToString,
  InterfaceDeclaration,
  isInterfaceDeclaration,
  getPositionOfLineAndCharacter,
} from "typescript";
import { readFileSync } from "fs";

interface ProgramAndSourceFile {
  program: Program;
  sourceFile: SourceFile;
  checker: TypeChecker;
}

interface SelectionStart {
  line: number;
  character: number;
}

type VirtualFS = Map<string, SourceFile>;
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
  target: ScriptTarget = ScriptTarget.ESNext
): VirtualFS {
  return new Map(
    entries.map(({ fileName, text }) => [
      fileName,
      createSourceFile(fileName, text, target),
    ])
  );
}

function createCompilerHost(virtualFS: VirtualFS): CompilerHost {
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

const libFileNames: string[] = [];
const libFiles: FSEntry[] = glob
  .sync("**/node_modules/typescript/lib/lib.*.d.ts")
  .map((fileName) => {
    const shortFileName = path.basename(fileName);
    libFileNames.push(shortFileName);
    return {
      fileName: shortFileName,
      text: readFileSync(fileName, "utf-8"),
    };
  });

console.log({ libFiles });

export function createProgramAndGetSourceFile(
  fileName: string,
  text: string,
  options?: CompilerOptions
): ProgramAndSourceFile {
  // const program = createProgram([fileName], options ?? {});
  // const sourceFile = program.getSourceFile(fileName);

  fileName = forceTsExtension(posixPath(fileName));

  const virtualFS = createVirtualFS([...libFiles, { fileName, text }]);
  const compilerHost = createCompilerHost(virtualFS);
  const program = createProgram(
    [...libFileNames, fileName],
    options ?? {},
    compilerHost
  );
  const sourceFile = virtualFS.get(fileName);

  // --------

  const files = program.getSourceFiles();
  const compilerOptions = program.getCompilerOptions();
  const diagnostics = program.getGlobalDiagnostics();
  console.log({ program, files, compilerOptions, diagnostics });

  // --------

  const checker = program.getTypeChecker();

  return { program, checker, sourceFile: sourceFile! };
}

function getNearestInterfaceFromPosition(
  sourceFile: SourceFile,
  position: number
): InterfaceDeclaration | null {
  if (position < 0) {
    return null;
  }

  const token = getTokenAtPosition(sourceFile, position);

  if (!token) {
    throw new Error(`No token found at ${sourceFile.fileName}:${position}`);
  }

  if (token.parent && isInterfaceDeclaration(token.parent)) {
    return token.parent;
  }

  return getNearestInterfaceFromPosition(sourceFile, position - 1);
}

export function getNearestInterface(
  sourceFile: SourceFile,
  { line, character }: SelectionStart
): InterfaceDeclaration | null {
  return getNearestInterfaceFromPosition(
    sourceFile,
    getPositionOfLineAndCharacter(sourceFile, line, character)
  );
}

export function getDocumentationCommentAsString(
  checker: TypeChecker,
  symbol: Symbol
): string {
  return displayPartsToString(symbol.getDocumentationComment(checker));
}
