import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";
import { getGitStatus, getRepoTree } from "@/lib/server-fns";
import GitStatusCard from "@/components/GitStatusCard";
import RepoFileBrowser from "@/components/RepoFileBrowser";
import RebuildCard from "@/components/RebuildCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_dashboard/")({
  loader: async () => {
    try {
      const [gitStatus, repoTree] = await Promise.all([getGitStatus(), getRepoTree()]);
      return { gitStatus, repoTree, error: null as string | null };
    } catch (err) {
      return {
        gitStatus: null,
        repoTree: null,
        error: err instanceof Error ? err.message : "Failed to load homelab repository",
      };
    }
  },
  component: Dashboard,
});

function Dashboard() {
  const { gitStatus, repoTree, error } = Route.useLoaderData();

  return (
    <div className="mx-auto p-4 sm:p-6 space-y-4">
      <div className="mb-2">
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <p className="text-md text-muted-foreground">Homelab configuration management</p>
      </div>

      <RebuildCard />

      {error || !gitStatus || !repoTree ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="size-4" />
              Repository not found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {error ?? "Homelab repository is unavailable."}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Set <span className="font-mono">HOMELAB_REPO_PATH</span> to a valid git directory.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <GitStatusCard data={gitStatus} />
          <RepoFileBrowser data={repoTree} />
        </>
      )}
    </div>
  );
}
