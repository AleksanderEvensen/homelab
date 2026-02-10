import { useState, useCallback } from "react";
import {
  ChevronDown,
  ChevronRight,
  File,
  Folder,
  FolderOpen,
  FolderTree,
  X,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { getFileContent } from "@/lib/server-fns";
import type { TreeEntry } from "@/lib/server-fns";

interface RepoTreeData {
  repoPath: string;
  tree: TreeEntry[];
}

interface FileViewerState {
  path: string;
  content: string;
  highlightedHtml: string;
  error: string | null;
  supported: boolean;
}

// --- Tree node component ---

function TreeNode({
  entry,
  depth,
  onFileClick,
  selectedPath,
}: {
  entry: TreeEntry;
  depth: number;
  onFileClick: (path: string) => void;
  selectedPath: string | null;
}) {
  const [expanded, setExpanded] = useState(false);

  if (entry.type === "directory") {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-1.5 py-1 px-1 hover:bg-muted/50 transition-colors text-left"
          style={{ paddingLeft: `${depth * 12 + 4}px` }}
        >
          {expanded ? (
            <ChevronDown className="size-3 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="size-3 text-muted-foreground shrink-0" />
          )}
          {expanded ? (
            <FolderOpen className="size-3.5 text-amber-500 shrink-0" />
          ) : (
            <Folder className="size-3.5 text-amber-500 shrink-0" />
          )}
          <span className="text-xs truncate">{entry.name}</span>
        </button>
        {expanded &&
          entry.children?.map((child) => (
            <TreeNode
              key={child.path}
              entry={child}
              depth={depth + 1}
              onFileClick={onFileClick}
              selectedPath={selectedPath}
            />
          ))}
      </div>
    );
  }

  const isSelected = selectedPath === entry.path;

  return (
    <button
      onClick={() => onFileClick(entry.path)}
      className={`w-full flex items-center gap-1.5 py-1 px-1 transition-colors text-left ${
        isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
      }`}
      style={{ paddingLeft: `${depth * 12 + 20}px` }}
    >
      <File className="size-3.5 text-muted-foreground shrink-0" />
      <span className="text-xs truncate">{entry.name}</span>
    </button>
  );
}

// --- Main component ---

export default function RepoFileBrowser({ data }: { data: RepoTreeData }) {
  const [fileView, setFileView] = useState<FileViewerState | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileClick = useCallback(
    async (path: string) => {
      // If already viewing this file, close it
      if (fileView?.path === path) {
        setFileView(null);
        return;
      }

      setLoading(true);
      try {
        const result = await getFileContent({ data: path });
        setFileView(result);
      } catch (err) {
        setFileView({
          path,
          content: "",
          highlightedHtml: "",
          error: err instanceof Error ? err.message : "Failed to load file",
          supported: false,
        });
      } finally {
        setLoading(false);
      }
    },
    [fileView?.path],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderTree className="size-4" />
          Repository Files
        </CardTitle>
        <CardDescription>{data.repoPath}</CardDescription>
      </CardHeader>

      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row border-t border-border min-h-[900px] max-h-[900px]">
          {/* File tree */}
          <div className="sm:w-64 shrink-0 border-b sm:border-b-0 sm:border-r border-border overflow-y-auto max-h-[900px] sm:max-h-[900px]">
            <div className="py-1">
              {data.tree.map((entry) => (
                <TreeNode
                  key={entry.path}
                  entry={entry}
                  depth={0}
                  onFileClick={handleFileClick}
                  selectedPath={fileView?.path ?? null}
                />
              ))}
            </div>
          </div>

          {/* File content viewer */}
          <div className="flex-1 overflow-hidden flex flex-col min-w-0">
            {loading && (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            )}

            {!loading && !fileView && (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <p className="text-xs">Select a file to view</p>
              </div>
            )}

            {!loading && fileView && (
              <>
                {/* File header */}
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/30 shrink-0">
                  <span className="text-xs font-medium truncate">{fileView.path}</span>
                  <button
                    onClick={() => setFileView(null)}
                    className="p-0.5 hover:bg-muted rounded transition-colors shrink-0"
                  >
                    <X className="size-3.5 text-muted-foreground" />
                  </button>
                </div>

                {/* File body */}
                {fileView.error ? (
                  <div className="flex-1 flex items-center justify-center gap-2 text-muted-foreground p-4">
                    <AlertCircle className="size-4" />
                    <p className="text-xs">{fileView.error}</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-auto bg-neutral-950">
                    {fileView.highlightedHtml ? (
                      <div
                        className="p-3 text-xs leading-relaxed [&_pre]:!bg-transparent [&_pre]:!m-0 [&_pre]:!p-0 [&_code]:!text-xs [&_code]:!leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: fileView.highlightedHtml }}
                      />
                    ) : (
                      <pre className="p-3 text-xs leading-relaxed text-neutral-300 font-mono">
                        <code>{fileView.content}</code>
                      </pre>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
