import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AccountRole = "master" | "standard" | null;

/**
 * Foundation hook for the Master / Standard account role architecture.
 * Invitation UI is not built yet — this hook is here so future flows
 * (and downstream `requireMaster` guards) can read role consistently.
 */
export const useAccountRole = () => {
  const [role, setRole] = useState<AccountRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (!cancelled) { setRole(null); setLoading(false); } return; }

      const { data } = await supabase
        .from("account_members" as any)
        .select("role")
        .eq("member_user_id", user.id)
        .order("invited_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      const r = (data as any)?.role;
      // Default any signed-in user to master of their own account.
      setRole(r === "standard" ? "standard" : "master");
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const isMaster = role === "master";
  return {
    role,
    loading,
    isMaster,
    isStandard: role === "standard",
    permissions: {
      manageBilling: isMaster,
      changePlan: isMaster,
      purchaseEvents: isMaster,
      deleteEvent: isMaster,
      manageUsers: isMaster,
      manageVendorPro: isMaster,
      deleteAccount: isMaster,
    },
  };
};

export const requireMaster = (role: AccountRole): boolean => role === "master";
