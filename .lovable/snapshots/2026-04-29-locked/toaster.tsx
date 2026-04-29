import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import { Check } from "lucide-react";

const stripCheckmark = (val: unknown): { text: unknown; hasCheck: boolean } => {
  if (typeof val === "string") {
    const cleaned = val.replace(/[✔✓✅]/g, "").trim();
    return { text: cleaned, hasCheck: cleaned !== val };
  }
  return { text: val, hasCheck: false };
};

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, duration, ...props }) {
        const { text: cleanTitle, hasCheck } = stripCheckmark(title);
        return (
          <Toast key={id} duration={duration ?? 3000} {...props}>
            {hasCheck && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white shrink-0">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </span>
            )}
            <div className="grid gap-0.5">
              {cleanTitle && <ToastTitle className="text-[#5C4A36] font-semibold">{cleanTitle as React.ReactNode}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
