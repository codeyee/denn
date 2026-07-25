import * as Tabs from "@radix-ui/react-tabs";
import { useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";

import type { ProfileSearchParams, ProfileTab } from "@/lib/types";

const PROFILE_TABS: Array<{ value: ProfileTab; label: string }> = [
  { value: "overview", label: "Overview" },
  { value: "completed", label: "Completed" },
  { value: "ratings", label: "Ratings & Reviews" },
  { value: "lists", label: "Lists" },
];

interface ProfileTabsProps {
  username: string;
  search: ProfileSearchParams;
  children: ReactNode;
}

export function ProfileTabs({
  username,
  search,
  children,
}: ProfileTabsProps) {
  const navigate = useNavigate();

  function changeTab(tab: string) {
    void navigate({
      to: "/user/$username",
      params: { username },
      search: cleanSearchForTab(tab as ProfileTab),
    });
  }

  return (
    <Tabs.Root value={search.tab} onValueChange={changeTab}>
      <div className="overflow-x-auto border-b border-white/10">
        <Tabs.List
          aria-label="Public profile sections"
          className="flex min-w-max gap-1"
        >
          {PROFILE_TABS.map((tab) => (
            <Tabs.Trigger
              key={tab.value}
              value={tab.value}
              className="min-h-11 rounded-t-lg border-b-2 border-transparent px-4 py-3 text-sm font-semibold text-white/60 outline-none transition-colors hover:text-white focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-white/70 data-[state=active]:border-fuchsia-300 data-[state=active]:text-white motion-reduce:transition-none"
            >
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </div>
      <Tabs.Content value={search.tab} className="outline-none">
        {children}
      </Tabs.Content>
    </Tabs.Root>
  );
}

function cleanSearchForTab(tab: ProfileTab): ProfileSearchParams {
  return { tab, page: 1 };
}
