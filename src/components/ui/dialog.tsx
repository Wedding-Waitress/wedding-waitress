import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  /** Make dialog full-screen on mobile (< 640px) */
  fullScreenOnMobile?: boolean;
  /** Render as a bottom sheet on mobile (< 768px). Desktop unchanged. */
  bottomSheetOnMobile?: boolean;
  /** Custom className for the overlay behind the dialog */
  overlayClassName?: string;
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, fullScreenOnMobile = false, bottomSheetOnMobile = false, overlayClassName, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay className={overlayClassName} />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed z-50 grid gap-4 border bg-background p-6 shadow-lg duration-200",
        // Default centered positioning (desktop)
        "left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]",
        // Default max dimensions
        "w-full max-w-lg",
        // Animations
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
        "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
        // Rounded corners on larger screens
        "sm:rounded-lg",
        // MOBILE FIX: iOS Safari's dynamic URL bar makes 100vh taller than
        // the visible area, so a vertically-centered tall dialog ends up with
        // its top half hidden behind the address bar. We top-align on mobile
        // and use dvh (dynamic viewport height) so the dialog always fits the
        // currently visible viewport on iPhone/Android.
        bottomSheetOnMobile
          ? [
              "max-md:left-0 max-md:right-0 max-md:bottom-0 max-md:top-auto",
              "max-md:translate-x-0 max-md:translate-y-0",
              "max-md:w-full max-md:max-w-full max-md:mx-0",
              "max-md:max-h-[85dvh] max-md:overflow-y-auto",
              "max-md:rounded-t-[20px] max-md:rounded-b-none",
              "max-md:data-[state=open]:slide-in-from-bottom max-md:data-[state=closed]:slide-out-to-bottom",
              "max-md:data-[state=open]:zoom-in-100 max-md:data-[state=closed]:zoom-out-100",
            ]
          : fullScreenOnMobile
          ? [
              "max-lg:w-[calc(100%-2rem)] max-lg:max-w-[calc(100%-2rem)] max-lg:mx-auto",
              "max-lg:top-[2dvh] max-lg:translate-y-0",
              "max-lg:max-h-[96dvh] max-lg:rounded-xl max-lg:border max-lg:flex max-lg:flex-col",
            ]
          : [
              "max-sm:top-[2dvh] max-sm:translate-y-0",
              "max-sm:max-h-[96dvh] max-sm:w-[calc(100%-2rem)] max-sm:rounded-xl",
            ],
        className,
      )}
      {...props}
    >
      {bottomSheetOnMobile && (
        <div className="md:hidden mx-auto mb-2 h-1 w-10 rounded-full bg-[#ccc]" aria-hidden />
      )}
      {children}
      <DialogPrimitive.Close title="Exit" className="absolute right-4 top-4 inline-flex shrink-0 items-center justify-center h-10 w-10 min-h-[40px] min-w-[40px] aspect-square box-border rounded-full border-2 border-primary bg-white p-0 m-0 leading-none opacity-100 ring-offset-background transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
        <X className="h-4 w-4 shrink-0 text-primary stroke-[2.5] block" />
        <span className="sr-only">Exit</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:space-x-2",
      // Mobile: fixed bottom action bar style
      "max-sm:mt-auto max-sm:pt-4 max-sm:border-t max-sm:border-border",
      className,
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
