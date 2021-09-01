import path from "path";
import glob from "glob";
import { isScratchFile } from "./resolve";
import { getTokenAtPosition } from "tsutils";
import { existsSync, readFileSync } from "fs";
import { TextDocument, Selection } from "vscode";

import type {
  Symbol,
  Program,
  Diagnostic,
  SourceFile,
  TypeChecker,
  CompilerHost,
  ScriptTarget,
  InterfaceType,
  CompilerOptions,
  InterfaceDeclaration,
  TypeAliasDeclaration,
  InterfaceTypeWithDeclaredMembers,
} from "typescript";

export type TsModule = typeof import("typescript");

type VirtualFS = Map<string, SourceFile>;
type FSEntry = { fileName: string; text: string };

export interface DefinitionProp {
  name: string;
  type: string;
  docs: string;
  optional: boolean;
  defaultValue?: string;
}

export interface Definition {
  name: string;
  docs: string;
  props: DefinitionProp[];
}

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

let ts: TsModule;

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

  const cwd = path.dirname(ts.sys.getExecutingFilePath());

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
  target: ScriptTarget = ts.ScriptTarget.ESNext
): VirtualFS {
  return new Map(
    entries.map(({ fileName, text }) => [
      fileName,
      ts.createSourceFile(fileName, text, target),
    ])
  );
}

function getSourceFromCache(
  fileName: string,
  virtualFS: VirtualFS,
  target: ScriptTarget = ts.ScriptTarget.ESNext
) {
  if (virtualFS.has(fileName)) {
    return virtualFS.get(fileName);
  }

  const sourceText = ts.sys.readFile(fileName);

  if (!sourceText) {
    return;
  }

  const source = ts.createSourceFile(fileName, sourceText, target);

  virtualFS.set(fileName, source);

  return source;
}

function createCompilerHost(
  virtualFS: VirtualFS,
  target: ScriptTarget = ts.ScriptTarget.ESNext
): CompilerHost {
  return {
    getSourceFile: (fileName: string) => {
      return getSourceFromCache(fileName, virtualFS, target);
    },
    fileExists: (fileName: string) => {
      return !!getSourceFromCache(fileName, virtualFS, target);
    },
    getCanonicalFileName: (fileName: string) => fileName,
    readFile: (fileName: string) => ts.sys.readFile(fileName),
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
    target: ts.ScriptTarget.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
  };

  if (!isScratchFile(fileName)) {
    const configFileName = ts.findConfigFile(
      path.dirname(fileName),
      (fileName) => existsSync(fileName)
    );

    if (configFileName) {
      const contents = readFileSync(configFileName, "utf-8");
      const { config } = ts.parseConfigFileTextToJson(configFileName, contents);
      const res = ts.convertCompilerOptionsFromJson(
        config.compilerOptions,
        path.dirname(configFileName),
        path.basename(configFileName)
      );
      options = { ...options, ...res.options };
    }
  }

  options.noEmit = true;
  options.noResolve = false;
  options.skipLibCheck = true;
  options.importHelpers = false;
  options.skipDefaultLibCheck = true;

  return options;
}

function createProgramAndGetSourceFile(
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
  const program = ts.createProgram(rootNames, options, compilerHost);
  const sourceFile = virtualFS.get(fileName)!;
  const checker = program.getTypeChecker();
  const diagnostics = program.getSemanticDiagnostics();

  return { program, diagnostics, sourceFile, checker };
}

function getDocumentationCommentAsString(
  checker: TypeChecker,
  symbol: Symbol
): string {
  return ts.displayPartsToString(symbol.getDocumentationComment(checker));
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
    (ts.isTypeAliasDeclaration(token.parent) ||
      ts.isInterfaceDeclaration(token.parent))
  ) {
    return token.parent;
  }

  return getNearestDefinitionFromPosition(sourceFile, position - 1);
}

function getNearestDefinition(
  sourceFile: SourceFile,
  { line, character }: SelectionStart
): TypeAliasDeclaration | InterfaceDeclaration | null {
  return getNearestDefinitionFromPosition(
    sourceFile,
    ts.getPositionOfLineAndCharacter(sourceFile, line, character)
  );
}

function isInterfaceTypeWithDeclaredMembers(
  interfaceType: InterfaceType
): interfaceType is InterfaceTypeWithDeclaredMembers {
  return (
    typeof (interfaceType as InterfaceTypeWithDeclaredMembers)
      .declaredStringIndexInfo !== "undefined" ||
    typeof (interfaceType as InterfaceTypeWithDeclaredMembers)
      .declaredNumberIndexInfo !== "undefined"
  );
}

export function getDefinitions({
  document,
  selection,
  tsModule,
}: {
  document: TextDocument;
  selection: Selection;
  tsModule: TsModule;
}) {
  ts = tsModule;

  const { diagnostics, sourceFile, checker } = createProgramAndGetSourceFile(
    document.fileName,
    document.getText()
  );

  if (diagnostics.length) {
    throw new Error(
      "Could not generate definitions for your type/interface due to type-checking issues." +
        "Please fix your code TypeScript errors and try again."
    );
  }

  const nearestType = getNearestDefinition(sourceFile, selection.start);

  if (!nearestType) {
    throw new Error(
      "Could not find any type/interface nearest your mouse position."
    );
  }

  const type = checker.getTypeAtLocation(nearestType.name);
  const stringIndex = type.getStringIndexType();
  const numberIndex = type.getNumberIndexType();
  const props = type.getProperties();

  if (!stringIndex && !numberIndex && !props.length) {
    throw new Error("Could not generate markdown for empty definition.");
  }

  const symbol = type.symbol ?? type.aliasSymbol;

  if (!symbol) {
    throw new Error("Could not generate markdown for this type of definition.");
  }

  const docs = getDocumentationCommentAsString(checker, symbol);

  const defs: Definition = {
    name: checker.typeToString(type),
    props: [],
    docs,
  };

  if (
    (stringIndex || numberIndex) &&
    type.isClassOrInterface() &&
    isInterfaceTypeWithDeclaredMembers(type)
  ) {
    const index = type.declaredStringIndexInfo ?? type.declaredNumberIndexInfo;
    const parameter = index?.declaration?.parameters[0];

    if (index && parameter) {
      defs.props.push({
        name: `[${parameter.getFullText()}]`,
        type: checker.typeToString(index.type),
        defaultValue: undefined,
        optional: true,
        docs,
      });
    }
  }

  if (type.isUnionOrIntersection()) {
    for (const unionOrIntersectionType of type.types) {
      if (unionOrIntersectionType.aliasSymbol) {
        continue;
      }

      const declaration = unionOrIntersectionType.symbol.declarations?.[0];

      if (declaration && ts.isMappedTypeNode(declaration) && declaration.type) {
        defs.props.push({
          name: `[${declaration.typeParameter.getFullText()}]`,
          type: declaration.type.getText(),
          defaultValue: undefined,
          optional: false,
          docs,
        });
      }
    }
  }

  for (const prop of props) {
    const declaration = prop.valueDeclaration || prop.declarations?.[0];
    const propType = checker.getTypeOfSymbolAtLocation(prop, declaration!);
    const optional = (prop.flags & ts.SymbolFlags.Optional) !== 0;
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

  return defs;
}
