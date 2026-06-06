import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { LibraryBig, Sparkles } from "lucide-react";
import { useSkills } from "@/lib/queries";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { FacetFilters } from "@/components/skills/FacetFilters";
import { SkillGrid } from "@/components/skills/SkillGrid";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function LibraryPage() {
  const { data: skills, isLoading, isError, refetch } = useSkills();
  const [query, setQuery] = useState("");
  const [types, setTypes] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  const allTypes = useMemo(
    () => Array.from(new Set((skills ?? []).map((s) => s.skill_type))).sort(),
    [skills],
  );
  const allTags = useMemo(
    () => Array.from(new Set((skills ?? []).flatMap((s) => s.tags))).sort(),
    [skills],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (skills ?? []).filter((m) => {
      if (q && !`${m.name} ${m.description} ${m.domain_focus}`.toLowerCase().includes(q)) return false;
      if (types.length && !types.includes(m.skill_type)) return false;
      if (tags.length && !tags.some((t) => m.tags.includes(t))) return false;
      return true;
    });
  }, [skills, query, types, tags]);

  const toggle = (value: string, list: string[], set: (v: string[]) => void) =>
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);

  return (
    <div>
      <PageHeader
        title="Library"
        description="Browse, search, and manage your skills."
        actions={
          <Button asChild>
            <Link to="/new">
              <Sparkles /> New Skill
            </Link>
          </Button>
        }
      />

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      )}

      {isError && <ErrorState message="Couldn't load your skills." onRetry={() => refetch()} />}

      {skills && skills.length === 0 && (
        <EmptyState
          icon={<LibraryBig className="h-6 w-6" />}
          title="No skills yet"
          description="Create your first skill — the wizard takes you from a spec to a validated SKILL.md."
          action={
            <Button asChild>
              <Link to="/new">Create your first skill</Link>
            </Button>
          }
        />
      )}

      {skills && skills.length > 0 && (
        <div className="space-y-4">
          <FacetFilters
            query={query}
            onQuery={setQuery}
            types={allTypes}
            selectedTypes={types}
            onToggleType={(v) => toggle(v, types, setTypes)}
            tags={allTags}
            selectedTags={tags}
            onToggleTag={(v) => toggle(v, tags, setTags)}
          />
          <p className="text-sm text-muted-foreground">
            {filtered.length} of {skills.length} skills
          </p>
          {filtered.length > 0 ? (
            <SkillGrid skills={filtered} />
          ) : (
            <EmptyState title="No matches" description="Try a different search or clear the filters." />
          )}
        </div>
      )}
    </div>
  );
}
