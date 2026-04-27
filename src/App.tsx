import { useEffect } from "react";
import "./App.css";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
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
import { CookiePolicy } from "./pages/CookiePolicy";
import { DJMCPublicView } from "./pages/DJMCPublicView";
import { RunningSheetPublicView } from "./pages/RunningSheetPublicView";
import { SeatingChartPublicView } from "./pages/SeatingChartPublicView";
import { PaymentSuccess } from "./pages/PaymentSuccess";
import { UpgradePricing } from "./pages/UpgradePricing";
import { UpgradeCheckout } from "./pages/UpgradeCheckout";
import { QRRedirect } from "./pages/QRRedirect";
// Legacy Feature* pages removed — /features/* now redirects to clean root URLs
import { ProductMyEvents } from "./pages/products/ProductMyEvents";
import { ProductTables } from "./pages/products/ProductTables";
import { ProductGuestList } from "./pages/products/ProductGuestList";
import { ProductQrCodeSeatingChart } from "./pages/products/ProductQrCodeSeatingChart";
import { ProductInvitationsCards } from "./pages/products/ProductInvitationsCards";
import { ProductNamePlaceCards } from "./pages/products/ProductNamePlaceCards";
import { ProductFullSeatingChart } from "./pages/products/ProductFullSeatingChart";
import { ProductFloorPlan } from "./pages/products/ProductFloorPlan";
import { ProductIndividualTableCharts } from "./pages/products/ProductIndividualTableCharts";
import { ProductDietaryRequirements } from "./pages/products/ProductDietaryRequirements";
import { ProductRunningSheet } from "./pages/products/ProductRunningSheet";
import { ProductKioskLiveView } from "./pages/products/ProductKioskLiveView";
import { ProductDjMcQuestionnaire } from "./pages/products/ProductDjMcQuestionnaire";
import { Blog } from "./pages/Blog";
import { BlogPost } from "./pages/BlogPost";
import { HowItWorks } from "./pages/HowItWorks";
import { Features } from "./pages/Features";
import { Pricing } from "./pages/Pricing";
import { Faq } from "./pages/Faq";
import { Products } from "./pages/Products";
import Unsubscribe from "./pages/Unsubscribe";
import { PaymentProcessingProvider, usePaymentProcessing } from "@/contexts/PaymentProcessingContext";
import { PaymentProcessingOverlay } from "@/components/Checkout/PaymentProcessingOverlay";
const queryClient = new QueryClient();

// Single global overlay mount — never unmounts/remounts, animation never resets.
const GlobalPaymentOverlay = () => {
  const { processing } = usePaymentProcessing();
  if (!processing) return null;
  return <PaymentProcessingOverlay />;
};

// Scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

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
        <CurrencyProvider>
        <PaymentProcessingProvider>
        <BrowserRouter>
          <ScrollToTop />
          <RouteTracker />
          <Toaster />
          <Sonner />
          <GlobalPaymentOverlay />
          <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/upgrade" element={<UpgradePricing />} />
          <Route path="/dashboard/upgrade/checkout" element={<UpgradeCheckout />} />
          {/* Running Sheet is now a dashboard tab, no standalone route */}
          <Route path="/admin" element={<Admin />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/cookies" element={<CookiePolicy />} />
          {/* Guest seating lookup */}
          {/* SEO landing pages */}
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/features" element={<Features />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/faq" element={<Faq />} />
          {/* Feature pages — replaced by clean root URLs (redirects below) */}
          {/* Products index page */}
          <Route path="/products" element={<Products />} />
          {/* Clean root-level product pages (canonical, indexable) */}
          <Route path="/my-events" element={<ProductMyEvents />} />
          <Route path="/tables" element={<ProductTables />} />
          <Route path="/guest-list" element={<ProductGuestList />} />
          <Route path="/qr-code-seating-chart" element={<ProductQrCodeSeatingChart />} />
          <Route path="/invitations-cards" element={<ProductInvitationsCards />} />
          <Route path="/name-place-cards" element={<ProductNamePlaceCards />} />
          <Route path="/full-seating-chart" element={<ProductFullSeatingChart />} />
          <Route path="/floor-plan" element={<ProductFloorPlan />} />
          <Route path="/individual-table-charts" element={<ProductIndividualTableCharts />} />
          <Route path="/dietary-requirements" element={<ProductDietaryRequirements />} />
          <Route path="/running-sheet-product" element={<ProductRunningSheet />} />
          <Route path="/kiosk-live-view" element={<ProductKioskLiveView />} />
          <Route path="/dj-mc-questionnaire" element={<ProductDjMcQuestionnaire />} />
          {/* Legacy /products/* — permanent client redirects to clean URLs */}
          <Route path="/products/my-events" element={<Navigate to="/my-events" replace />} />
          <Route path="/products/tables" element={<Navigate to="/tables" replace />} />
          <Route path="/products/guest-list" element={<Navigate to="/guest-list" replace />} />
          <Route path="/products/qr-code-seating-chart" element={<Navigate to="/qr-code-seating-chart" replace />} />
          <Route path="/products/invitations-cards" element={<Navigate to="/invitations-cards" replace />} />
          <Route path="/products/name-place-cards" element={<Navigate to="/name-place-cards" replace />} />
          <Route path="/products/full-seating-chart" element={<Navigate to="/full-seating-chart" replace />} />
          <Route path="/products/floor-plan" element={<Navigate to="/floor-plan" replace />} />
          <Route path="/products/individual-table-charts" element={<Navigate to="/individual-table-charts" replace />} />
          <Route path="/products/dietary-requirements" element={<Navigate to="/dietary-requirements" replace />} />
          <Route path="/products/running-sheet" element={<Navigate to="/running-sheet-product" replace />} />
          <Route path="/products/kiosk-live-view" element={<Navigate to="/kiosk-live-view" replace />} />
          <Route path="/products/dj-mc-questionnaire" element={<Navigate to="/dj-mc-questionnaire" replace />} />
          {/* Legacy /features/* — permanent client redirects to clean URLs */}
          <Route path="/features/events" element={<Navigate to="/my-events" replace />} />
          <Route path="/features/guest-list" element={<Navigate to="/guest-list" replace />} />
          <Route path="/features/seating" element={<Navigate to="/tables" replace />} />
          <Route path="/features/qr-seating" element={<Navigate to="/qr-code-seating-chart" replace />} />
          <Route path="/features/invitations" element={<Navigate to="/invitations-cards" replace />} />
          <Route path="/features/place-cards" element={<Navigate to="/name-place-cards" replace />} />
          <Route path="/features/table-charts" element={<Navigate to="/individual-table-charts" replace />} />
          <Route path="/features/floor-plan" element={<Navigate to="/floor-plan" replace />} />
          <Route path="/features/dietary" element={<Navigate to="/dietary-requirements" replace />} />
          <Route path="/features/full-seating" element={<Navigate to="/full-seating-chart" replace />} />
          <Route path="/features/kiosk" element={<Navigate to="/kiosk-live-view" replace />} />
          <Route path="/features/dj-mc" element={<Navigate to="/dj-mc-questionnaire" replace />} />
          <Route path="/features/planning" element={<Navigate to="/running-sheet-product" replace />} />
          {/* Blog */}
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
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
          {/* Email unsubscribe */}
          <Route path="/unsubscribe" element={<Unsubscribe />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </PaymentProcessingProvider>
        </CurrencyProvider>
      </AppErrorBoundary>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
