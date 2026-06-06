import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { useModels } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

/**
 * Combobox over the live model list, with free-text entry for any OpenRouter id.
 * Replaces the Streamlit model_selectbox (which fell back to a plain text input).
 */
export function ModelSelect({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
}) {
  const { data } = useModels();
  const models = data?.models ?? [];
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const showCustom =
    query.trim().length > 0 && !models.some((m) => m.toLowerCase() === query.trim().toLowerCase());

  function choose(model: string) {
    onChange(model);
    setOpen(false);
    setQuery("");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">{value || "Select a model…"}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search or type a model id…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>No model found.</CommandEmpty>
            {showCustom && (
              <CommandGroup heading="Custom">
                <CommandItem value={`custom-${query}`} onSelect={() => choose(query.trim())}>
                  Use “{query.trim()}”
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup heading="Models">
              {models.map((m) => (
                <CommandItem key={m} value={m} onSelect={() => choose(m)}>
                  <Check className={cn("mr-2 h-4 w-4", value === m ? "opacity-100" : "opacity-0")} />
                  {m}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
