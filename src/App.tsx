import { useEffect, lazy, Suspense } from "react";
import "./App.css";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AppErrorBoundary } from "@/components/core/AppErrorBoundary";
// Eager: highest-priority entry points
import { Landing } from "./pages/Landing";
import { Dashboard } from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
// Lazy: split everything else into separate chunks for instant initial load
const Admin = lazy(() => import("./pages/Admin").then(m => ({ default: m.Admin })));
const GuestLookup = lazy(() => import("./pages/GuestLookup").then(m => ({ default: m.GuestLookup })));
const KioskView = lazy(() => import("./pages/KioskView").then(m => ({ default: m.KioskView })));
const ResetPassword = lazy(() => import("./pages/ResetPassword").then(m => ({ default: m.ResetPassword })));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy").then(m => ({ default: m.PrivacyPolicy })));
const TermsOfService = lazy(() => import("./pages/TermsOfService").then(m => ({ default: m.TermsOfService })));
const Contact = lazy(() => import("./pages/Contact").then(m => ({ default: m.Contact })));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy").then(m => ({ default: m.CookiePolicy })));
const DJMCPublicView = lazy(() => import("./pages/DJMCPublicView").then(m => ({ default: m.DJMCPublicView })));
const RunningSheetPublicView = lazy(() => import("./pages/RunningSheetPublicView").then(m => ({ default: m.RunningSheetPublicView })));
const SeatingChartPublicView = lazy(() => import("./pages/SeatingChartPublicView").then(m => ({ default: m.SeatingChartPublicView })));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess").then(m => ({ default: m.PaymentSuccess })));
const UpgradePricing = lazy(() => import("./pages/UpgradePricing").then(m => ({ default: m.UpgradePricing })));
const UpgradeCheckout = lazy(() => import("./pages/UpgradeCheckout").then(m => ({ default: m.UpgradeCheckout })));
const QRRedirect = lazy(() => import("./pages/QRRedirect").then(m => ({ default: m.QRRedirect })));
const ProductMyEvents = lazy(() => import("./pages/products/ProductMyEvents").then(m => ({ default: m.ProductMyEvents })));
const ProductTables = lazy(() => import("./pages/products/ProductTables").then(m => ({ default: m.ProductTables })));
const ProductGuestList = lazy(() => import("./pages/products/ProductGuestList").then(m => ({ default: m.ProductGuestList })));
const ProductQrCodeSeatingChart = lazy(() => import("./pages/products/ProductQrCodeSeatingChart").then(m => ({ default: m.ProductQrCodeSeatingChart })));
const ProductInvitationsCards = lazy(() => import("./pages/products/ProductInvitationsCards").then(m => ({ default: m.ProductInvitationsCards })));
const ProductNamePlaceCards = lazy(() => import("./pages/products/ProductNamePlaceCards").then(m => ({ default: m.ProductNamePlaceCards })));
const ProductFullSeatingChart = lazy(() => import("./pages/products/ProductFullSeatingChart").then(m => ({ default: m.ProductFullSeatingChart })));
const ProductFloorPlan = lazy(() => import("./pages/products/ProductFloorPlan").then(m => ({ default: m.ProductFloorPlan })));
const ProductIndividualTableCharts = lazy(() => import("./pages/products/ProductIndividualTableCharts").then(m => ({ default: m.ProductIndividualTableCharts })));
const ProductDietaryRequirements = lazy(() => import("./pages/products/ProductDietaryRequirements").then(m => ({ default: m.ProductDietaryRequirements })));
const ProductRunningSheet = lazy(() => import("./pages/products/ProductRunningSheet").then(m => ({ default: m.ProductRunningSheet })));
const ProductKioskLiveView = lazy(() => import("./pages/products/ProductKioskLiveView").then(m => ({ default: m.ProductKioskLiveView })));
const ProductDjMcQuestionnaire = lazy(() => import("./pages/products/ProductDjMcQuestionnaire").then(m => ({ default: m.ProductDjMcQuestionnaire })));
const Blog = lazy(() => import("./pages/Blog").then(m => ({ default: m.Blog })));
const BlogPost = lazy(() => import("./pages/BlogPost").then(m => ({ default: m.BlogPost })));
const HowItWorks = lazy(() => import("./pages/HowItWorks").then(m => ({ default: m.HowItWorks })));
const Features = lazy(() => import("./pages/Features").then(m => ({ default: m.Features })));
const Pricing = lazy(() => import("./pages/Pricing").then(m => ({ default: m.Pricing })));
const Faq = lazy(() => import("./pages/Faq").then(m => ({ default: m.Faq })));
const Products = lazy(() => import("./pages/Products").then(m => ({ default: m.Products })));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
import { PaymentProcessingProvider, usePaymentProcessing } from "@/contexts/PaymentProcessingContext";
import { PaymentProcessingOverlay } from "@/components/Checkout/PaymentProcessingOverlay";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Lightweight skeleton fallback for lazy routes — never a blank screen.
const RouteFallback = () => (
  <div className="min-h-screen w-full bg-background animate-pulse" aria-hidden="true">
    <div className="h-14 w-full bg-muted/40" />
    <div className="mx-auto mt-8 max-w-5xl space-y-4 px-4">
      <div className="h-8 w-2/3 rounded bg-muted/50" />
      <div className="h-4 w-1/2 rounded bg-muted/40" />
      <div className="h-64 w-full rounded-xl bg-muted/30" />
    </div>
  </div>
);

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
          <Suspense fallback={<RouteFallback />}>
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
          <Route path="/running-sheet" element={<ProductRunningSheet />} />
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
          <Route path="/products/running-sheet" element={<Navigate to="/running-sheet" replace />} />
          <Route path="/running-sheet-product" element={<Navigate to="/running-sheet" replace />} />
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
          <Route path="/features/planning" element={<Navigate to="/running-sheet" replace />} />
          <Route path="/features/running-sheet" element={<Navigate to="/running-sheet" replace />} />
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
          {/* Running Sheet public view (vendor share links) — moved off /running-sheet so SEO page is canonical */}
          <Route path="/shared-running-sheet/:eventSlug/:token" element={<RunningSheetPublicView />} />
          <Route path="/shared-running-sheet/:token" element={<RunningSheetPublicView />} />
          {/* Backward-compat for previously issued share links */}
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
          </Suspense>
        </BrowserRouter>
        </PaymentProcessingProvider>
        </CurrencyProvider>
      </AppErrorBoundary>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
