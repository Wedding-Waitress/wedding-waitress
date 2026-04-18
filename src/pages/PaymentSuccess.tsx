import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Check, Loader2, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("session_id");

  const [status, setStatus] = useState<"loading" | "success" | "approval" | "error">("loading");
  const [details, setDetails] = useState<{
    type?: string;
    plan_name?: string;
    amount_paid?: number;
    expires_at?: string;
    requires_approval?: boolean;
  }>({});
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      setError("No session ID found");
      return;
    }

    const verify = async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke("verify-payment", {
          body: { session_id: sessionId },
        });

        if (fnError) throw new Error(fnError.message);
        if (data?.error) throw new Error(data.error);

        setDetails(data);
        setStatus(data.requires_approval ? "approval" : "success");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Verification failed");
        setStatus("error");
      }
    };

    verify();
  }, [sessionId]);

  // Auto-redirect after 8 seconds for success
  useEffect(() => {
    if (status === "success" || status === "approval") {
      const dest = '/dashboard?tab=account&success=true';
      const timer = setTimeout(() => navigate(dest, { replace: true }), 8000);
      return () => clearTimeout(timer);
    }
  }, [status, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-2xl shadow-lg border border-border p-8 text-center space-y-6">
        {status === "loading" && (
          <>
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
            <h1 className="text-xl font-semibold">Verifying your payment…</h1>
            <p className="text-sm text-muted-foreground">Please wait while we confirm your purchase.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold">Payment Successful! 🎉</h1>
            <p className="text-muted-foreground">
              {details.type === "rsvp"
                ? `Your RSVP Invite Bundle (${details.plan_name}) has been activated.`
                : `Your ${details.plan_name} plan is now active.`}
            </p>
            {details.expires_at && (
              <p className="text-sm text-muted-foreground">
                Valid until {new Date(details.expires_at).toLocaleDateString("en-AU", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            )}
            <Button onClick={() => navigate("/dashboard", { replace: true })} className="rounded-full">
              Go to Dashboard
            </Button>
            <p className="text-xs text-muted-foreground">Redirecting automatically…</p>
          </>
        )}

        {status === "approval" && (
          <>
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
              <Clock className="w-8 h-8 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold">Payment Received!</h1>
            <p className="text-muted-foreground">
              Your <strong>Vendor Pro</strong> subscription request has been submitted.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
              An admin will review and approve your account within <strong>24 hours</strong>.
              You'll receive full access once approved.
            </div>
            <Button onClick={() => navigate("/dashboard", { replace: true })} className="rounded-full">
              Go to Dashboard
            </Button>
            <p className="text-xs text-muted-foreground">Redirecting automatically…</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-xl font-semibold">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => navigate("/dashboard", { replace: true })} variant="outline" className="rounded-full">
              Return to Dashboard
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
