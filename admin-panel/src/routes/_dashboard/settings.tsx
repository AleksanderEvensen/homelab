import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KeyRound, Check } from "lucide-react";

export const Route = createFileRoute("/_dashboard/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { data: session } = authClient.useSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });

      if (result.error) {
        setError(result.error.message || "Failed to change password");
      } else {
        setSuccess(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-4">
      <div className="mb-2">
        <h1 className="text-sm font-semibold">Settings</h1>
        <p className="text-xs text-muted-foreground">
          Signed in as {session?.user?.name || session?.user?.email}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-4" />
            Change Password
          </CardTitle>
          <CardDescription>Enter your current password and choose a new one</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-3">
            <div className="grid gap-1.5">
              <label htmlFor="current-password" className="text-xs font-medium">
                Current password
              </label>
              <input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                className="flex h-9 w-full border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 text-sm focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
                required
              />
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="new-password" className="text-xs font-medium">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                className="flex h-9 w-full border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 text-sm focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
                required
                minLength={8}
              />
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="confirm-password" className="text-xs font-medium">
                Confirm new password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className="flex h-9 w-full border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 text-sm focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
                required
                minLength={8}
              />
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3 flex items-center gap-2">
                <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  Password changed successfully.
                </p>
              </div>
            )}
          </CardContent>

          <CardFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Changing..." : "Change password"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
