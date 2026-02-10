import { Hammer, AlertTriangle } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import TerminalOutput from "./TerminalOutput";
import { useCommandStream } from "@/hooks/useCommandStream";

export default function RebuildCard() {
  const stream = useCommandStream();

  const handleRebuild = () => {
    stream.start("nixos-rebuild");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hammer className="size-4" />
          NixOS Rebuild
        </CardTitle>
        <CardDescription>
          Run <code className="text-xs bg-muted px-1 py-0.5">nixos-rebuild switch</code> to apply
          configuration changes
        </CardDescription>
      </CardHeader>

      <CardContent>
        {(stream.lines.length > 0 || stream.isRunning) && (
          <TerminalOutput
            lines={stream.lines}
            isRunning={stream.isRunning}
            exitCode={stream.exitCode}
            duration={stream.duration}
            error={stream.error}
            sudoPromptVisible={stream.sudoPromptVisible}
            onSudoPassword={stream.sendPassword}
          />
        )}
      </CardContent>

      <CardFooter>
        <AlertDialog>
          <AlertDialogTrigger render={<Button disabled={stream.isRunning} />}>
            <Hammer className="size-3.5" />
            {stream.isRunning ? "Rebuilding..." : "Rebuild"}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogMedia className="bg-destructive/10">
                <AlertTriangle className="size-5 text-destructive" />
              </AlertDialogMedia>
              <AlertDialogTitle>Rebuild NixOS</AlertDialogTitle>
              <AlertDialogDescription>
                This will run{" "}
                <code className="text-xs bg-muted px-1 py-0.5">sudo nixos-rebuild switch</code>.
                Running services may restart and there could be brief downtime. Sudo password may be
                required.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRebuild}
                className="bg-destructive/10 text-destructive hover:bg-destructive/20"
              >
                Rebuild
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
