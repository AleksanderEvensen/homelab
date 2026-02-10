import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import {
  GitBranch,
  GitCommitHorizontal,
  ArrowDown,
  ArrowUp,
  RefreshCw,
  Download,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import TerminalOutput from "./TerminalOutput";
import { useCommandStream } from "@/hooks/useCommandStream";

interface GitStatusData {
  repoPath: string;
  branch: string;
  dirty: boolean;
  ahead: number;
  behind: number;
  lastFetch: string;
}

export default function GitStatusCard({ data }: { data: GitStatusData }) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const stream = useCommandStream();

  const handleRefresh = async () => {
    setRefreshing(true);
    await router.invalidate();
    setRefreshing(false);
  };

  const handlePull = () => {
    stream.start("git-pull");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="size-4" />
          Git Status
        </CardTitle>
        <CardDescription>{data.repoPath}</CardDescription>
        <CardAction>
          <Button variant="ghost" size="icon-sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="gap-1.5">
            <GitBranch className="size-3" />
            {data.branch}
          </Badge>

          <Badge variant={data.dirty ? "destructive" : "secondary"}>
            <GitCommitHorizontal className="size-3" />
            {data.dirty ? "dirty" : "clean"}
          </Badge>

          {data.behind > 0 && (
            <Badge variant="destructive" className="gap-1">
              <ArrowDown className="size-3" />
              {data.behind} behind
            </Badge>
          )}

          {data.ahead > 0 && (
            <Badge variant="secondary" className="gap-1">
              <ArrowUp className="size-3" />
              {data.ahead} ahead
            </Badge>
          )}

          {data.behind === 0 && data.ahead === 0 && <Badge variant="secondary">up to date</Badge>}
        </div>

        {/* Terminal output for pull command */}
        {(stream.lines.length > 0 || stream.isRunning) && (
          <div className="mt-4">
            <TerminalOutput
              lines={stream.lines}
              isRunning={stream.isRunning}
              exitCode={stream.exitCode}
              duration={stream.duration}
              error={stream.error}
            />
          </div>
        )}
      </CardContent>

      <CardFooter className="gap-2">
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                disabled={data.behind === 0 || stream.isRunning}
              />
            }
          >
            <Download className="size-3.5" />
            Pull Changes
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Pull Changes</AlertDialogTitle>
              <AlertDialogDescription>
                This will run <code className="text-xs bg-muted px-1 py-0.5">git pull</code> in{" "}
                {data.repoPath}. If conflicts occur, the operation will stop and show the error.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handlePull}>Pull</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <span className="text-[11px] text-muted-foreground ml-auto">
          fetched {new Date(data.lastFetch).toLocaleTimeString()}
        </span>
      </CardFooter>
    </Card>
  );
}
