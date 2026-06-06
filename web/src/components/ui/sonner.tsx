import { Toaster as Sonner } from "sonner";
import { useTheme } from "@/providers/theme-provider";

export function Toaster() {
  const { resolved } = useTheme();
  return (
    <Sonner
      theme={resolved}
      richColors
      closeButton
      position="bottom-right"
      toastOptions={{ classNames: { toast: "rounded-lg border" } }}
    />
  );
}

export { toast } from "sonner";
