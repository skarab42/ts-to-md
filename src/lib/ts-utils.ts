import path from "path";
import glob from "glob";
import { existsSync, readFileSync } from "fs";
import { getTokenAtPosition } from "tsutils";
import {
  sys,
  Symbol,
  Program,
  SourceFile,
  Diagnostic,
  TypeChecker,
  CompilerHost,
  ScriptTarget,
  createProgram,
  CompilerOptions,
  createSourceFile,
  displayPartsToString,
  InterfaceDeclaration,
  isInterfaceDeclaration,
  isTypeAliasDeclaration,
  getPositionOfLineAndCharacter,
  TypeAliasDeclaration,
  InterfaceType,
  InterfaceTypeWithDeclaredMembers,
  findConfigFile,
  convertCompilerOptionsFromJson,
  parseConfigFileTextToJson,
  ModuleResolutionKind,
} from "typescript";

interface ProgramAndSourceFile {
  program: Program;
  sourceFile: SourceFile;
  checker: TypeChecker;
  diagnostics: readonly Diagnostic[];
}

interface SelectionStart {
  line: number;
  character: number;
}

type VirtualFS = Map<string, SourceFile>;
type FSEntry = { fileName: string; text: string };

const libFilesVirtualFS: VirtualFS = new Map();
const defaultLibFileNames: Set<string> = new Set();

function posixPath(input: string): string {
  return input.split(path.sep).join(path.posix.sep);
}

function forceTsExtension(input: string): string {
  if (![".ts", ".tsx"].includes(path.extname(input))) {
    return `${input}.ts`;
  }

  return input;
}

function getDefaultLibVirtualFS() {
  if (libFilesVirtualFS.size > 0) {
    return libFilesVirtualFS;
  }

  const cwd = path.dirname(sys.getExecutingFilePath());

  return createVirtualFS(
    glob.sync("lib.*.d.ts", { cwd }).map((fileName) => {
      defaultLibFileNames.add(fileName);
      return {
        fileName,
        text: readFileSync(path.join(cwd, fileName), "utf-8"),
      };
    })
  );
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

function getSourceFromCache(
  fileName: string,
  virtualFS: VirtualFS,
  target: ScriptTarget = ScriptTarget.ESNext
) {
  if (virtualFS.has(fileName)) {
    return virtualFS.get(fileName);
  }

  const sourceText = sys.readFile(fileName);

  if (!sourceText) {
    return;
  }

  const source = createSourceFile(fileName, sourceText, target);

  virtualFS.set(fileName, source);

  return source;
}

function createCompilerHost(
  virtualFS: VirtualFS,
  target: ScriptTarget = ScriptTarget.ESNext
): CompilerHost {
  return {
    getSourceFile: (fileName: string) => {
      return getSourceFromCache(fileName, virtualFS, target);
    },
    fileExists: (fileName: string) => {
      return !!getSourceFromCache(fileName, virtualFS, target);
    },
    getCanonicalFileName: (fileName: string) => fileName,
    readFile: (fileName: string) => sys.readFile(fileName),
    writeFile: () => {},
    getNewLine: () => "\n",
    getDirectories: () => [],
    getCurrentDirectory: () => "/",
    getEnvironmentVariable: () => "",
    useCaseSensitiveFileNames: () => true,
    getDefaultLibFileName: () => "lib.d.ts",
  };
}

function getCompilerOptions(fileName: string) {
  let options: CompilerOptions = {
    target: ScriptTarget.ESNext,
    moduleResolution: ModuleResolutionKind.NodeJs,
  };

  const configFileName = findConfigFile(path.dirname(fileName), (fileName) =>
    existsSync(fileName)
  );

  if (configFileName) {
    const contents = readFileSync(configFileName, "utf-8");
    const { config } = parseConfigFileTextToJson(configFileName, contents);
    const res = convertCompilerOptionsFromJson(
      config.compilerOptions,
      path.dirname(configFileName),
      path.basename(configFileName)
    );
    options = { ...options, ...res.options };
  }

  options.noEmit = true;
  options.noResolve = false;
  options.skipLibCheck = true;
  options.importHelpers = false;
  options.skipDefaultLibCheck = true;

  return options;
}

export function createProgramAndGetSourceFile(
  fileName: string,
  text: string
): ProgramAndSourceFile {
  fileName = forceTsExtension(posixPath(fileName));

  const options = getCompilerOptions(fileName);
  const virtualFS = new Map([
    ...getDefaultLibVirtualFS(),
    ...createVirtualFS([{ fileName, text }], options.target),
  ]);
  const rootNames = [...defaultLibFileNames, fileName];
  const compilerHost = createCompilerHost(virtualFS, options.target);
  const program = createProgram(rootNames, options, compilerHost);
  const sourceFile = virtualFS.get(fileName)!;
  const checker = program.getTypeChecker();
  const diagnostics = program.getSemanticDiagnostics();

  return { program, diagnostics, sourceFile, checker };
}

export function getDocumentationCommentAsString(
  checker: TypeChecker,
  symbol: Symbol
): string {
  return displayPartsToString(symbol.getDocumentationComment(checker));
}

function getNearestDefinitionFromPosition(
  sourceFile: SourceFile,
  position: number
): TypeAliasDeclaration | InterfaceDeclaration | null {
  if (position < 0) {
    return null;
  }

  const token = getTokenAtPosition(sourceFile, position);

  if (!token) {
    throw new Error(`No token found at ${sourceFile.fileName}:${position}`);
  }

  if (
    token.parent &&
    (isTypeAliasDeclaration(token.parent) ||
      isInterfaceDeclaration(token.parent))
  ) {
    return token.parent;
  }

  return getNearestDefinitionFromPosition(sourceFile, position - 1);
}

export function getNearestDefinition(
  sourceFile: SourceFile,
  { line, character }: SelectionStart
): TypeAliasDeclaration | InterfaceDeclaration | null {
  return getNearestDefinitionFromPosition(
    sourceFile,
    getPositionOfLineAndCharacter(sourceFile, line, character)
  );
}

export function isInterfaceTypeWithDeclaredMembers(
  interfaceType: InterfaceType
): interfaceType is InterfaceTypeWithDeclaredMembers {
  return (
    typeof (interfaceType as InterfaceTypeWithDeclaredMembers)
      .declaredStringIndexInfo !== "undefined" ||
    typeof (interfaceType as InterfaceTypeWithDeclaredMembers)
      .declaredNumberIndexInfo !== "undefined"
  );
}
