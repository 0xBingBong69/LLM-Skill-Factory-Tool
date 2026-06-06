import { useNavigate } from "react-router-dom";
import { Factory, Library, Moon, Settings, Sparkles, Sun } from "lucide-react";
import { useSkills } from "@/lib/queries";
import { useTheme } from "@/providers/theme-provider";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const { setTheme } = useTheme();
  const { data: skills } = useSkills();

  function go(to: string) {
    onOpenChange(false);
    navigate(to);
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search skills…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigate">
          <CommandItem onSelect={() => go("/library")}>
            <Library /> Library
          </CommandItem>
          <CommandItem onSelect={() => go("/new")}>
            <Sparkles /> New Skill
          </CommandItem>
          <CommandItem onSelect={() => go("/batch")}>
            <Factory /> Batch generate
          </CommandItem>
          <CommandItem onSelect={() => go("/config")}>
            <Settings /> Config
          </CommandItem>
        </CommandGroup>

        {skills && skills.length > 0 && (
          <CommandGroup heading="Skills">
            {skills.map((s) => (
              <CommandItem key={s.name} value={`skill ${s.name}`} onSelect={() => go(`/skills/${s.name}`)}>
                <Library /> {s.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandGroup heading="Theme">
          <CommandItem
            onSelect={() => {
              setTheme("light");
              onOpenChange(false);
            }}
          >
            <Sun /> Light theme
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setTheme("dark");
              onOpenChange(false);
            }}
          >
            <Moon /> Dark theme
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
