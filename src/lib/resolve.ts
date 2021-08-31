// Ref: https://github.dev/prettier/prettier-vscode/blob/main/src/extension.ts
// Ref: https://github.com/microsoft/vscode-eslint/blob/1f7b610c3a0f4e8966fd356363e224d805ac1faf/client/src/extension.ts
import fs from "fs";
import path from "path";
import { sys } from "typescript";
import { execSync } from "child_process";
import { commands, Uri, workspace } from "vscode";
import { resolveGlobalNodePath, resolveGlobalYarnPath } from "./files";

type PackageManagers = "npm" | "yarn" | "pnpm";
type GlobalPath = { cache: string | undefined; get(): string | undefined };

// const tsModuleCache: Map<string, string> = new Map();

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

    if (fs.existsSync(globalModulePath)) {
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

  if (fs.existsSync(pkgfile)) {
    const pkg = JSON.parse(fs.readFileSync(pkgfile, "utf-8"));
    const deps = {
      ...(pkg.devDependencies ?? {}),
      ...(pkg.dependencies ?? {}),
    };

    if (deps[moduleName]) {
      const modulePath = path.join(dir, "node_modules", moduleName);
      if (fs.existsSync(modulePath)) {
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

export async function resolveModule(moduleName: string, documentUri: Uri) {
  const userDefinedPackagePath = workspace
    .getConfiguration("ts-to-md")
    .get<string>("typescriptPackagePath");

  if (userDefinedPackagePath && userDefinedPackagePath.length) {
    if (fs.existsSync(userDefinedPackagePath)) {
      return userDefinedPackagePath;
    }

    throw new Error(
      `TypeScript package not found at ${userDefinedPackagePath}`
    );
  }

  let modulePath = resolveLocalModule(moduleName, documentUri);

  if (!modulePath) {
    modulePath = await resolveGlobalModule(moduleName, documentUri);
  }

  if (!modulePath) {
    modulePath = path.dirname(path.dirname(sys.getExecutingFilePath()));
  }

  return modulePath;
}
