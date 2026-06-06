import type { SkillMeta } from "@/lib/api/types";
import { SkillCard } from "./SkillCard";

export function SkillGrid({ skills }: { skills: SkillMeta[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {skills.map((m) => (
        <SkillCard key={m.name} meta={m} />
      ))}
    </div>
  );
}
