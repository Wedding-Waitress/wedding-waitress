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
import { QRRedirect } from "./pages/QRRedirect";
import { FeatureGuestList } from "./pages/features/FeatureGuestList";
import { FeatureSeating } from "./pages/features/FeatureSeating";
import { FeatureQrSeating } from "./pages/features/FeatureQrSeating";
import { FeaturePlanning } from "./pages/features/FeaturePlanning";
import { FeatureInvitations } from "./pages/features/FeatureInvitations";
import { FeatureEvents } from "./pages/features/FeatureEvents";
import { FeaturePlaceCards } from "./pages/features/FeaturePlaceCards";
import { FeatureTableCharts } from "./pages/features/FeatureTableCharts";
import { FeatureDietary } from "./pages/features/FeatureDietary";
import { FeatureFullSeating } from "./pages/features/FeatureFullSeating";
import { FeatureKiosk } from "./pages/features/FeatureKiosk";
import { FeatureDjMc } from "./pages/features/FeatureDjMc";
import { FeatureFloorPlan } from "./pages/features/FeatureFloorPlan";
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
import Unsubscribe from "./pages/Unsubscribe";
const queryClient = new QueryClient();

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
        <BrowserRouter>
          <ScrollToTop />
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
          <Route path="/cookies" element={<CookiePolicy />} />
          {/* Guest seating lookup */}
          {/* Feature pages */}
          <Route path="/features/guest-list" element={<FeatureGuestList />} />
          <Route path="/features/seating" element={<FeatureSeating />} />
          <Route path="/features/qr-seating" element={<FeatureQrSeating />} />
          <Route path="/features/planning" element={<FeaturePlanning />} />
          <Route path="/features/invitations" element={<FeatureInvitations />} />
          <Route path="/features/events" element={<FeatureEvents />} />
          <Route path="/features/place-cards" element={<FeaturePlaceCards />} />
          <Route path="/features/table-charts" element={<FeatureTableCharts />} />
          <Route path="/features/dietary" element={<FeatureDietary />} />
          <Route path="/features/full-seating" element={<FeatureFullSeating />} />
          <Route path="/features/kiosk" element={<FeatureKiosk />} />
          <Route path="/features/dj-mc" element={<FeatureDjMc />} />
          <Route path="/features/floor-plan" element={<FeatureFloorPlan />} />
          {/* Public /products/* SEO landing pages (indexable) */}
          <Route path="/products/my-events" element={<ProductMyEvents />} />
          <Route path="/products/tables" element={<ProductTables />} />
          <Route path="/products/guest-list" element={<ProductGuestList />} />
          <Route path="/products/qr-code-seating-chart" element={<ProductQrCodeSeatingChart />} />
          <Route path="/products/invitations-cards" element={<ProductInvitationsCards />} />
          <Route path="/products/name-place-cards" element={<ProductNamePlaceCards />} />
          <Route path="/products/full-seating-chart" element={<ProductFullSeatingChart />} />
          <Route path="/products/floor-plan" element={<ProductFloorPlan />} />
          <Route path="/products/individual-table-charts" element={<ProductIndividualTableCharts />} />
          <Route path="/products/dietary-requirements" element={<ProductDietaryRequirements />} />
          <Route path="/products/running-sheet" element={<ProductRunningSheet />} />
          <Route path="/products/kiosk-live-view" element={<ProductKioskLiveView />} />
          <Route path="/products/dj-mc-questionnaire" element={<ProductDjMcQuestionnaire />} />
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
        </CurrencyProvider>
      </AppErrorBoundary>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
