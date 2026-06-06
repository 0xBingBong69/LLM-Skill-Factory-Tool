import { NavLink } from "react-router-dom";
import { CircleDot, Factory, Library, Settings, Sparkles } from "lucide-react";
import { useConfig } from "@/lib/queries";
import { DOCS_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const NAV_ITEMS = [
  { to: "/library", label: "Library", icon: Library },
  { to: "/new", label: "New Skill", icon: Sparkles },
  { to: "/batch", label: "Batch", icon: Factory },
  { to: "/config", label: "Config", icon: Settings },
];

export function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Primary">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )
          }
        >
          <Icon className="h-4 w-4" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export function Sidebar() {
  const { data: config } = useConfig();
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-card px-4 py-5 lg:flex">
      <div className="mb-6 flex items-center gap-2 px-2">
        <Factory className="h-6 w-6 text-primary" />
        <div>
          <div className="text-sm font-semibold leading-tight">Skill Factory</div>
          <div className="text-xs text-muted-foreground">Author great SKILL.md</div>
        </div>
      </div>

      <NavList />

      <div className="mt-auto space-y-3 pt-6 text-xs">
        <div className="flex items-center gap-2">
          <CircleDot
            className={cn("h-3.5 w-3.5", config?.has_key ? "text-success" : "text-muted-foreground")}
          />
          <span className={config?.has_key ? "text-foreground" : "text-muted-foreground"}>
            {config?.has_key ? "API key set" : "No API key"}
          </span>
        </div>
        {config && (
          <div className="truncate text-muted-foreground" title={config.default_model}>
            Model: {config.default_model}
          </div>
        )}
        <a
          href={DOCS_URL}
          target="_blank"
          rel="noreferrer"
          className="block text-primary hover:underline"
        >
          SKILL.md &amp; OpenRouter docs
        </a>
      </div>
    </aside>
  );
}
