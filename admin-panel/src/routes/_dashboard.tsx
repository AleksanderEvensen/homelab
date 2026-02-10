import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  createFileRoute,
  Link,
  LinkOptions,
  linkOptions,
  Outlet,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { CogIcon, LayoutDashboardIcon, LucideIcon, Moon, Sun, LogOut } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { authClient } from "@/lib/auth-client";
import { DashboardLayoutHeader } from "@/components/dashboard-header";
import { createIsomorphicFn } from "@tanstack/react-start";
import { auth } from "@/lib/auth";
import { getRequestHeaders } from "@tanstack/react-start/server";

const getSession = createIsomorphicFn()
  .client(async () => {
    const { data, error } = await authClient.getSession();
    if (error || data?.user.id == null) {
      return null;
    }

    return data;
  })
  .server(async () => {
    const data = await auth.api.getSession({
      headers: getRequestHeaders(),
    });
    if (data == null) {
      return null;
    }
    return data;
  });

export const Route = createFileRoute("/_dashboard")({
  beforeLoad: async ({ location }) => {
    const session = await getSession();
    if (session == null) {
      throw redirect({
        to: "/login",
        search: {
          redirectTo: location.pathname,
        },
      });
    }
    return session;
  },
  component: DashboardLayout,
});

function DashboardLayout() {
  return (
    <SidebarProvider>
      <AppSidebar variant="sidebar" />
      <SidebarInset className="h-screen overflow-y-auto overscroll-none">
        <DashboardLayoutHeader />
        <div className="p-4">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

type SidebarGroup = {
  id: string;
  label?: string;
  items: {
    label: string;
    link: LinkOptions;

    icon?: LucideIcon;
  }[];
};

const sidebarMenuGroups: SidebarGroup[] = [
  {
    id: "main",
    items: [
      //
      {
        label: "Dashboard",
        icon: LayoutDashboardIcon,
        link: linkOptions({ to: "/", activeOptions: { exact: true } }),
      },
      {
        label: "Settings",
        icon: CogIcon,
        link: linkOptions({ to: "/settings" }),
      },
    ],
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { theme, toggleTheme } = useTheme();
  const { data: session, isPending } = authClient.useSession();
  const navigate = useNavigate();

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className="h-12">
            <SidebarMenuButton
              render={
                <Link aria-label="Til forsiden" to="/" className="h-full w-full cursor-pointer" />
              }
            >
              <span>Homelab</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {sidebarMenuGroups.map((group) => (
          <SidebarGroup key={group.id}>
            {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
            <SidebarMenu>
              {group.items.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    render={
                      <Link
                        {...item.link}
                        className="[&.active]:bg-sidebar-primary [&.active]:text-sidebar-primary-foreground"
                        activeProps={{ className: "active" }}
                      />
                    }
                  >
                    {item.icon && <item.icon />}
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={toggleTheme} tooltip="Toggle theme">
              {theme === "dark" ? <Moon /> : <Sun />}
              <span>{theme === "dark" ? "Dark" : "Light"} mode</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {session?.user && (
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={async () => {
                  await authClient.signOut();
                  await navigate({
                    to: "/login",
                    search: {
                      redirectTo: window.location.pathname,
                    },
                  });
                }}
                disabled={isPending}
                tooltip="Sign out"
              >
                <LogOut />
                <span>Sign out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
