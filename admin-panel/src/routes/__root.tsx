import { HeadContent, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";

import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";

import appCss from "../styles.css?url";
import { ThemeProvider, useTheme } from "../components/theme-provider";

import type { QueryClient } from "@tanstack/react-query";
import { getCookie } from "@/lib/cookies";

interface MyRouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "NixOS Admin Panel",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  loader() {
    return {
      theme: getCookie("theme") === "dark" ? "dark" : "light",
    } as const;
  },

  shellComponent: RootProvider,
});

function RootProvider({ children }: { children: React.ReactNode }) {
  const { theme } = Route.useLoaderData();
  return (
    <ThemeProvider initialTheme={theme}>
      <RootDocument>{children}</RootDocument>
    </ThemeProvider>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();

  return (
    <html lang="en" className={theme === "dark" ? "dark" : undefined}>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}
