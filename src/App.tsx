import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AppErrorBoundary } from "@/components/core/AppErrorBoundary";
import { useToast } from "@/hooks/use-toast";
import { flags } from "@/lib/featureFlags";
import { Landing } from "./pages/Landing";
import { Dashboard } from "./pages/Dashboard";
import { Admin } from "./pages/Admin";
import { AdminLogin } from "./pages/AdminLogin";
import NotFound from "./pages/NotFound";
import { GuestLookup } from "./pages/GuestLookup";
import { KioskView } from "./pages/KioskView";
import { ResetPassword } from "./pages/ResetPassword";
import { PrivacyPolicy } from "./pages/PrivacyPolicy";
import { TermsOfService } from "./pages/TermsOfService";
import { Contact } from "./pages/Contact";
import { DJQuestionnairePublicView } from "./pages/DJQuestionnairePublicView";
import RunningSheet from "./pages/RunningSheet";

const queryClient = new QueryClient();

// Feature Guard Component
const FeatureGuard = ({ 
  featureEnabled, 
  featureName, 
  children 
}: { 
  featureEnabled: boolean; 
  featureName: string; 
  children: React.ReactNode;
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!featureEnabled) {
      toast({
        title: "Coming Soon",
        description: `${featureName} is temporarily unavailable. Check back soon!`,
        variant: "default",
      });
      navigate('/dashboard', { replace: true });
    }
  }, [featureEnabled, featureName, navigate, toast]);

  return featureEnabled ? <>{children}</> : null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AppErrorBoundary>
        <BrowserRouter>
          <Toaster />
          <Sonner />
          <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route 
            path="/running-sheet" 
            element={
              <FeatureGuard featureEnabled={flags.runningSheet} featureName="Running Sheet">
                <RunningSheet />
              </FeatureGuard>
            } 
          />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/old-login" element={<AdminLogin />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/contact" element={<Contact />} />
          {/* Guest seating lookup */}
          <Route path="/s/:eventSlug" element={<GuestLookup />} />
          {/* Kiosk mode */}
          <Route path="/kiosk/:eventSlug" element={<KioskView />} />
          {/* DJ Questionnaire public view */}
          <Route 
            path="/dj-questionnaire/:token" 
            element={
          <FeatureGuard featureEnabled={flags.djQuestionnaire} featureName="DJ & MC Questionnaire">
            <DJQuestionnairePublicView />
          </FeatureGuard>
        } 
      />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
        </Routes>
        </BrowserRouter>
      </AppErrorBoundary>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
