import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

export function FacetFilters({
  query,
  onQuery,
  types,
  selectedTypes,
  onToggleType,
  tags,
  selectedTags,
  onToggleTag,
}: {
  query: string;
  onQuery: (value: string) => void;
  types: string[];
  selectedTypes: string[];
  onToggleType: (value: string) => void;
  tags: string[];
  selectedTags: string[];
  onToggleTag: (value: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search name, description, domain…"
          className="pl-9"
          aria-label="Search skills"
        />
      </div>
      {types.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Type</span>
          {types.map((t) => (
            <Chip key={t} label={t} active={selectedTypes.includes(t)} onClick={() => onToggleType(t)} />
          ))}
        </div>
      )}
      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Tags</span>
          {tags.map((t) => (
            <Chip key={t} label={t} active={selectedTags.includes(t)} onClick={() => onToggleTag(t)} />
          ))}
        </div>
      )}
    </div>
  );
}
