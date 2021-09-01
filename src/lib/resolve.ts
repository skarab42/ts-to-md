// Ref: https://github.dev/prettier/prettier-vscode/blob/main/src/extension.ts
// Ref: https://github.com/microsoft/vscode-eslint/blob/1f7b610c3a0f4e8966fd356363e224d805ac1faf/client/src/extension.ts
import path from "path";
import { sys } from "typescript";
import { TsModule } from "./ts-utils";
import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { commands, Uri, workspace } from "vscode";
import { resolveGlobalNodePath, resolveGlobalYarnPath } from "./files";

type PackageManagers = "npm" | "yarn" | "pnpm";
type GlobalPath = { cache: string | undefined; get(): string | undefined };

// const tsModuleCache: Map<string, string> = new Map();

const defaultTsModulePath = path.dirname(
  path.dirname(sys.getExecutingFilePath())
);

const globalPaths: {
  [key: string]: GlobalPath;
} = {
  npm: {
    cache: undefined,
    get(): string | undefined {
      return resolveGlobalNodePath();
    },
  },
  pnpm: {
    cache: undefined,
    get(): string {
      const pnpmPath = execSync("pnpm root -g").toString().trim();
      return pnpmPath;
    },
  },
  yarn: {
    cache: undefined,
    get(): string | undefined {
      return resolveGlobalYarnPath();
    },
  },
};

function globalPathGet(packageManager: PackageManagers): string | undefined {
  const pm = globalPaths[packageManager];

  if (pm) {
    if (pm.cache === undefined) {
      pm.cache = pm.get();
    }

    return pm.cache;
  }

  return undefined;
}

async function resolveGlobalModule(
  moduleName: string,
  uri: Uri
): Promise<string | undefined> {
  const ws = workspace.getWorkspaceFolder(uri);
  const packageManager = await commands.executeCommand<"npm" | "pnpm" | "yarn">(
    "npm.packageManager",
    ws?.uri
  );

  if (!packageManager) {
    return;
  }

  const resolvedGlobalPackageManagerPath = globalPathGet(packageManager);

  if (resolvedGlobalPackageManagerPath) {
    const globalModulePath = path.join(
      resolvedGlobalPackageManagerPath,
      moduleName
    );

    if (existsSync(globalModulePath)) {
      return globalModulePath;
    }
  }

  return;
}

function resolveLocalModuleRecursive(
  moduleName: string,
  dir: string
): string | undefined {
  // const moduleId = `${dir}:${moduleName}`;

  // if (tsModuleCache.has(moduleId)) {
  //   return tsModuleCache.get(moduleId);
  // }

  const pkgfile = path.join(dir, "package.json");

  if (existsSync(pkgfile)) {
    const pkg = JSON.parse(readFileSync(pkgfile, "utf-8"));
    const deps = {
      ...(pkg.devDependencies ?? {}),
      ...(pkg.dependencies ?? {}),
    };

    if (deps[moduleName]) {
      const modulePath = path.join(dir, "node_modules", moduleName);
      if (existsSync(modulePath)) {
        return modulePath;
      }
    }
  }

  const nextDir = path.dirname(dir);

  if (nextDir === dir) {
    return;
  }

  const modulePath = resolveLocalModuleRecursive(moduleName, nextDir);

  // if (modulePath) {
  //   tsModuleCache.set(moduleId, modulePath);
  // }

  return modulePath;
}

function resolveLocalModule(moduleName: string, file: Uri): string | undefined {
  return resolveLocalModuleRecursive(moduleName, path.dirname(file.fsPath));
}

export function isScratchFile(filePath: string) {
  return !path.isAbsolute(filePath) || !existsSync(filePath);
}

function getUserDefinedModulePath(modulePath: string) {
  if (existsSync(modulePath)) {
    return modulePath;
  }

  throw new Error(`TypeScript package not found at ${modulePath}`);
}

export async function resolveModule(moduleName: string, documentUri: Uri) {
  const userDefinedModulePath =
    workspace
      .getConfiguration("ts-to-md")
      .get<string>("typescriptModule.path") ?? "";

  const userDefinedModulePathAsFallback =
    workspace
      .getConfiguration("ts-to-md")
      .get<boolean>("typescriptModule.pathAsFallback") ?? false;

  if (userDefinedModulePath.length && !userDefinedModulePathAsFallback) {
    return getUserDefinedModulePath(userDefinedModulePath);
  }

  if (isScratchFile(documentUri.fsPath)) {
    return defaultTsModulePath;
  }

  let modulePath = resolveLocalModule(moduleName, documentUri);

  if (!modulePath) {
    modulePath = await resolveGlobalModule(moduleName, documentUri);
  }

  if (
    !modulePath &&
    userDefinedModulePath.length &&
    userDefinedModulePathAsFallback
  ) {
    return getUserDefinedModulePath(userDefinedModulePath);
  }

  if (!modulePath) {
    modulePath = defaultTsModulePath;
  }

  return modulePath;
}

export async function requireModule(
  moduleName: string,
  documentUri: Uri
): Promise<TsModule> {
  return require(await resolveModule(moduleName, documentUri));
}
