import { createFileRoute, stripSearchParams, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { z } from "zod";

export const Route = createFileRoute("/login")({
  validateSearch: z.object({
    redirectTo: z.string().default("/"),
  }),
  component: LoginPage,
  search: {
    middlewares: [
      stripSearchParams({
        redirectTo: "/",
      }),
    ],
  },
});

function LoginPage() {
  const { data: session, isPending } = authClient.useSession();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { redirectTo } = Route.useSearch();

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900 dark:border-neutral-800 dark:border-t-neutral-100" />
      </div>
    );
  }

  if (session?.user) {
    navigate({ to: redirectTo });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await authClient.signIn.username({ username, password });
      if (result.error) {
        setError(result.error.message || "Sign in failed");
      } else {
        navigate({ to: redirectTo });
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[60vh] px-4">
      <div className="w-full max-w-sm p-6">
        <h1 className="text-lg font-semibold leading-none tracking-tight">NixOS Admin</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 mb-6">
          Sign in to access the admin panel
        </p>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <label htmlFor="username" className="text-sm font-medium leading-none">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="flex h-9 w-full border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 text-sm focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
              required
            />
          </div>

          <div className="grid gap-2">
            <label htmlFor="password" className="text-sm font-medium leading-none">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full h-9 px-4 text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-400 border-t-white dark:border-neutral-600 dark:border-t-neutral-900" />
                <span>Signing in...</span>
              </span>
            ) : (
              "Sign in"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
