import { createServerFn } from "@tanstack/react-start";
import { existsSync, statSync } from "node:fs";
import { env } from "@/env";
import { resolve, relative, extname } from "node:path";
import { authMiddleware } from "./auth-middleware";

function assertRepoExists(): string {
  const repoPath = env.HOMELAB_REPO_PATH;

  if (!existsSync(repoPath)) {
    throw new Error(
      `Homelab repo path does not exist: ${repoPath}. Set HOMELAB_REPO_PATH to a valid directory.`,
    );
  }

  if (!statSync(repoPath).isDirectory()) {
    throw new Error(`Homelab repo path is not a directory: ${repoPath}`);
  }

  if (!existsSync(resolve(repoPath, ".git"))) {
    throw new Error(`Homelab repo path is not a git repository (no .git found): ${repoPath}`);
  }

  return repoPath;
}

async function runGit(...args: string[]): Promise<string> {
  const repoPath = assertRepoExists();
  const proc = Bun.spawn(["git", "-C", repoPath, ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const text = await new Response(proc.stdout).text();
  await proc.exited;
  return text.trim();
}

export const getGitStatus = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const repoPath = assertRepoExists();

    try {
      await runGit("fetch", "--quiet");
    } catch {
      // Offline or no remote
    }

    const branch = await runGit("rev-parse", "--abbrev-ref", "HEAD");
    const porcelain = await runGit("status", "--porcelain");
    const dirty = porcelain.length > 0;

    let ahead = 0;
    let behind = 0;
    try {
      const aheadStr = await runGit("rev-list", "--count", "@{u}..HEAD");
      ahead = parseInt(aheadStr, 10) || 0;
      const behindStr = await runGit("rev-list", "--count", "HEAD..@{u}");
      behind = parseInt(behindStr, 10) || 0;
    } catch {
      // No upstream configured
    }

    return {
      repoPath,
      branch,
      dirty,
      ahead,
      behind,
      lastFetch: new Date().toISOString(),
    };
  });

// --- File tree ---

export interface TreeEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: TreeEntry[];
}

const IGNORED = new Set([".git", "node_modules", ".direnv", "result", ".devenv"]);

async function readDir(dirPath: string, basePath: string): Promise<TreeEntry[]> {
  const { readdirSync, statSync } = await import("node:fs");
  const entries: TreeEntry[] = [];
  const names = readdirSync(dirPath);

  for (const name of names) {
    if (IGNORED.has(name)) continue;

    const fullPath = resolve(dirPath, name);
    const relPath = relative(basePath, fullPath);
    const isDir = statSync(fullPath).isDirectory();

    if (isDir) {
      const children = await readDir(fullPath, basePath);
      entries.push({ name, path: relPath, type: "directory", children });
    } else {
      entries.push({ name, path: relPath, type: "file" });
    }
  }

  entries.sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return entries;
}

export const getRepoTree = createServerFn({ method: "GET" }).handler(async () => {
  const repoPath = assertRepoExists();
  const tree = await readDir(repoPath, repoPath);
  return { repoPath, tree };
});

// --- File content ---

const SUPPORTED_EXTENSIONS = new Set([
  ".nix",
  ".json",
  ".yaml",
  ".yml",
  ".toml",
  ".conf",
  ".cfg",
  ".ini",
  ".sh",
  ".bash",
  ".zsh",
  ".fish",
  ".py",
  ".ts",
  ".js",
  ".tsx",
  ".jsx",
  ".md",
  ".mdx",
  ".txt",
  ".lock",
  ".env",
  ".gitignore",
  ".editorconfig",
  ".lua",
  ".vim",
  ".css",
  ".html",
  ".xml",
  ".sql",
  ".dockerfile",
  ".rs",
  ".go",
  ".c",
  ".h",
  ".cpp",
  ".hpp",
]);

// Map extensions to shiki language identifiers
function getShikiLang(filePath: string): string | null {
  const ext = extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    ".nix": "nix",
    ".json": "json",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".toml": "toml",
    ".sh": "bash",
    ".bash": "bash",
    ".zsh": "zsh",
    ".fish": "fish",
    ".py": "python",
    ".ts": "typescript",
    ".js": "javascript",
    ".tsx": "tsx",
    ".jsx": "jsx",
    ".md": "markdown",
    ".mdx": "mdx",
    ".lua": "lua",
    ".vim": "viml",
    ".css": "css",
    ".html": "html",
    ".xml": "xml",
    ".sql": "sql",
    ".dockerfile": "dockerfile",
    ".rs": "rust",
    ".go": "go",
    ".c": "c",
    ".h": "c",
    ".cpp": "cpp",
    ".hpp": "cpp",
  };
  return map[ext] ?? null;
}

const MAX_FILE_SIZE = 512 * 1024; // 512KB

export const getFileContent = createServerFn({ method: "GET" })
  .inputValidator((filePath: string) => filePath)
  .handler(async ({ data: filePath }) => {
    const repoPath = assertRepoExists();
    const fullPath = resolve(repoPath, filePath);

    // Security: prevent path traversal
    if (!fullPath.startsWith(resolve(repoPath))) {
      throw new Error("Access denied");
    }

    const file = Bun.file(fullPath);
    const exists = await file.exists();
    if (!exists) {
      throw new Error("File not found");
    }

    if (file.size > MAX_FILE_SIZE) {
      return {
        path: filePath,
        content: "",
        highlightedHtml: "",
        error: "File too large to display (>512KB)",
        supported: false,
      };
    }

    const ext = extname(filePath).toLowerCase();
    const baseName = filePath.split("/").pop() ?? "";
    const supported =
      SUPPORTED_EXTENSIONS.has(ext) ||
      baseName === "flake.lock" ||
      baseName === "Makefile" ||
      baseName === "Dockerfile" ||
      !ext; // extensionless files (often scripts)

    if (!supported) {
      return {
        path: filePath,
        content: "",
        highlightedHtml: "",
        error: "Binary or unsupported file type",
        supported: false,
      };
    }

    const content = await file.text();

    let highlightedHtml = "";
    const lang = getShikiLang(filePath) ?? (baseName === "Dockerfile" ? "dockerfile" : null);
    if (lang) {
      try {
        const { codeToHtml } = await import("shiki");
        highlightedHtml = await codeToHtml(content, {
          lang,
          theme: "github-dark",
        });
      } catch {
        // Fallback: no highlighting
      }
    }

    return {
      path: filePath,
      content,
      highlightedHtml,
      error: null,
      supported: true,
    };
  });
