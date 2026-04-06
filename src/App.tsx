import { useEffect } from "react";
import "./App.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AppErrorBoundary } from "@/components/core/AppErrorBoundary";
import { useToast } from "@/hooks/use-toast";
import { Landing } from "./pages/Landing";
import { Dashboard } from "./pages/Dashboard";
import { Admin } from "./pages/Admin";
import NotFound from "./pages/NotFound";
import { GuestLookup } from "./pages/GuestLookup";
import { KioskView } from "./pages/KioskView";
import { ResetPassword } from "./pages/ResetPassword";
import { PrivacyPolicy } from "./pages/PrivacyPolicy";
import { TermsOfService } from "./pages/TermsOfService";
import { Contact } from "./pages/Contact";
import { DJMCPublicView } from "./pages/DJMCPublicView";
import { RunningSheetPublicView } from "./pages/RunningSheetPublicView";
import { SeatingChartPublicView } from "./pages/SeatingChartPublicView";
import { PaymentSuccess } from "./pages/PaymentSuccess";
import { QRRedirect } from "./pages/QRRedirect";
const queryClient = new QueryClient();

// Track page views on route changes for GA4
const RouteTracker = () => {
  const location = useLocation();
  useEffect(() => {
    const w = window as any;
    if (typeof w.gtag === 'function') {
      w.gtag('event', 'page_view', {
        page_path: location.pathname + location.search,
        page_title: document.title,
      });
    }
  }, [location]);
  return null;
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
          <RouteTracker />
          <Toaster />
          <Sonner />
          <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          {/* Running Sheet is now a dashboard tab, no standalone route */}
          <Route path="/admin" element={<Admin />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/contact" element={<Contact />} />
          {/* Guest seating lookup */}
          <Route path="/s/:eventSlug" element={<GuestLookup />} />
          {/* Kiosk mode */}
          <Route path="/kiosk/:eventSlug" element={<KioskView />} />
          {/* DJ-MC Questionnaire public view */}
          <Route path="/dj-mc/:eventSlug/:token" element={<DJMCPublicView />} />
          <Route path="/dj-mc/:token" element={<DJMCPublicView />} />
          <Route path="/djmc/:eventSlug/:token" element={<DJMCPublicView />} />
          <Route path="/djmc/:token" element={<DJMCPublicView />} />
          {/* Running Sheet public view */}
          <Route path="/running-sheet/:eventSlug/:token" element={<RunningSheetPublicView />} />
          <Route path="/running-sheet/:token" element={<RunningSheetPublicView />} />
          {/* Seating chart public view */}
          <Route path="/seating-chart/:token" element={<SeatingChartPublicView />} />
          {/* Dynamic QR code redirect */}
          <Route path="/qr/:code" element={<QRRedirect />} />
           {/* Payment success */}
          <Route path="/payment-success" element={<PaymentSuccess />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AppErrorBoundary>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
