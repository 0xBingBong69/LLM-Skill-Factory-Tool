import { Link } from "react-router-dom";
import { Download, FlaskConical, GitBranch, Pencil } from "lucide-react";
import type { SkillMeta } from "@/lib/api/types";
import { api } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function SkillCard({ meta }: { meta: SkillMeta }) {
  const slug = meta.name;
  return (
    <Card className="flex flex-col p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold leading-tight">
          <Link to={`/skills/${slug}`} className="hover:text-primary hover:underline">
            {slug}
          </Link>
        </h3>
        <Badge variant="secondary" className="shrink-0">
          {meta.skill_type}
        </Badge>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span>v{meta.version}</span>
        {meta.base_skill && (
          <span className="inline-flex items-center gap-1">
            <GitBranch className="h-3 w-3" /> extends {meta.base_skill}
          </span>
        )}
      </div>

      {meta.description && (
        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{meta.description}</p>
      )}

      {meta.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {meta.tags.map((t) => (
            <Badge key={t} variant="outline" className="rounded-md">
              {t}
            </Badge>
          ))}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <Button asChild size="sm" variant="secondary" className="flex-1">
          <Link to={`/skills/${slug}`}>
            <Pencil /> Edit
          </Link>
        </Button>
        <Button asChild size="sm" variant="secondary" className="flex-1">
          <Link to={`/skills/${slug}/test`}>
            <FlaskConical /> Test
          </Link>
        </Button>
        <Button asChild size="sm" variant="ghost" aria-label={`Export ${slug} as zip`}>
          <a href={api.exportUrl(slug)} download>
            <Download />
          </a>
        </Button>
      </div>
    </Card>
  );
}
