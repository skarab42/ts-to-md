// Ref: https://github.dev/prettier/prettier-vscode/blob/main/src/extension.ts
// Ref: https://github.com/microsoft/vscode-eslint/blob/1f7b610c3a0f4e8966fd356363e224d805ac1faf/client/src/extension.ts
import fs from "fs";
import path from "path";
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

export async function resolveGlobalModule(
  moduleName: string,
  uri: Uri
): Promise<string> {
  const ws = workspace.getWorkspaceFolder(uri);
  const packageManager = await commands.executeCommand<"npm" | "pnpm" | "yarn">(
    "npm.packageManager",
    ws?.uri
  );

  if (!packageManager) {
    return Promise.reject();
  }

  const resolvedGlobalPackageManagerPath = globalPathGet(packageManager);

  if (resolvedGlobalPackageManagerPath) {
    const globalModulePath = path.join(
      resolvedGlobalPackageManagerPath,
      moduleName
    );

    if (fs.existsSync(globalModulePath)) {
      return Promise.resolve(globalModulePath);
    }
  }

  return Promise.reject();
}

function resolveLocalModuleRecursive(
  moduleName: string,
  dir: string,
  workspaceDir: string
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

  if (dir === workspaceDir) {
    return;
  }

  const modulePath = resolveLocalModuleRecursive(
    moduleName,
    path.dirname(dir),
    workspaceDir
  );

  // if (modulePath) {
  //   tsModuleCache.set(moduleId, modulePath);
  // }

  return modulePath;
}

export function resolveLocalModule(
  moduleName: string,
  file: Uri
): string | undefined {
  const workspaceDir = workspace.getWorkspaceFolder(file);

  if (!workspaceDir) {
    return;
  }

  return resolveLocalModuleRecursive(
    moduleName,
    path.dirname(file.fsPath),
    workspaceDir.uri.fsPath
  );
}

export async function resolveModule(moduleName: string, documentUri: Uri) {
  let modulePath = resolveLocalModule(moduleName, documentUri);

  if (!modulePath) {
    modulePath = await resolveGlobalModule(moduleName, documentUri);
  }

  return modulePath;
}
