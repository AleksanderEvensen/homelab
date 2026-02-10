import { Link, linkOptions, useMatches } from "@tanstack/react-router";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useSidebar } from "@/components/ui/sidebar";
import { PanelLeftIcon } from "lucide-react";
import React, { useMemo } from "react";

export function DashboardLayoutHeader() {
  const { toggleSidebar } = useSidebar();
  const matches = useMatches();

  const crumbs = useMemo(() => {
    return matches.flatMap((match) => {
      if (!match.loaderData) return [];
      if (!("breadcrumbs" in match.loaderData)) return [];
      if (typeof match.loaderData.breadcrumbs !== "string") return [];
      return [
        {
          label: match.loaderData.breadcrumbs,
          link: linkOptions({ to: match.pathname }),
        },
      ];
    });
  }, [matches]);

  return (
    <header className="flex sticky bg-sidebar top-0 z-10 h-14 border-b shadow-xs flex-none">
      <div className="flex w-full items-center gap-1 px-4">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="-ml-1 size-7">
          <PanelLeftIcon className="size-5" />
        </Button>
        <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            {crumbs.map((v, i) => (
              <React.Fragment key={v.label + i}>
                <BreadcrumbItem>
                  <BreadcrumbLink render={<Link {...v.link} />} className="text-foreground">
                    {v.label}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {i < crumbs.length - 1 && <BreadcrumbSeparator />}
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  );
}
