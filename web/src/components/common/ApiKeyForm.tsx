import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import { api, qk } from "@/lib/queries";
import { useApiKey } from "@/providers/key-provider";
import { KEYS_URL } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModelSelect } from "@/components/common/ModelSelect";
import { toast } from "@/components/ui/sonner";

export function ApiKeyForm() {
  const { key, model, setKey, setModel } = useApiKey();
  const [show, setShow] = useState(false);
  const [testing, setTesting] = useState(false);
  const qc = useQueryClient();

  function refreshConfig() {
    qc.invalidateQueries({ queryKey: qk.config });
    qc.invalidateQueries({ queryKey: qk.models });
  }

  async function testKey() {
    setTesting(true);
    try {
      const { models } = await api.models();
      toast.success(`Connected — ${models.length} models available.`);
      refreshConfig();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reach OpenRouter.");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="api-key" required>
          OpenRouter API key
        </Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id="api-key"
              type={show ? "text" : "password"}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onBlur={refreshConfig}
              placeholder="sk-or-…"
              autoComplete="off"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? "Hide key" : "Show key"}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Button onClick={testKey} disabled={!key.trim() || testing} variant="secondary">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Test key
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Kept in this browser tab only, never written to disk. Get one at{" "}
          <a href={KEYS_URL} target="_blank" rel="noreferrer" className="text-primary hover:underline">
            openrouter.ai/keys
          </a>
          .
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="default-model">Default model</Label>
        <ModelSelect id="default-model" value={model} onChange={(v) => { setModel(v); refreshConfig(); }} />
        <p className="text-xs text-muted-foreground">
          Used when a screen doesn't pick a specific model.
        </p>
      </div>
    </div>
  );
}
