import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Landing } from "./pages/Landing";
import { Dashboard } from "./pages/Dashboard";
import { AdminLogin } from "./pages/AdminLogin";
import NotFound from "./pages/NotFound";
import { GuestLookup } from "./pages/GuestLookup";
import { KioskView } from "./pages/KioskView";
import { GuestAlbumPublic } from "./pages/GuestAlbumPublic";
import { AdminGalleryInsights } from "./pages/AdminGalleryInsights";
import { LegacyGalleryRedirect } from "./components/Redirect";
import { ResetPassword } from "./pages/ResetPassword";
import { PrivacyPolicy } from "./pages/PrivacyPolicy";
import { TermsOfService } from "./pages/TermsOfService";
import { Contact } from "./pages/Contact";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <BrowserRouter>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/gallery-insights" element={<AdminGalleryInsights />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/contact" element={<Contact />} />
          {/* Guest seating lookup */}
          <Route path="/s/:eventSlug" element={<GuestLookup />} />
          {/* New album route - canonical */}
          <Route path="/a/:gallerySlug" element={<GuestAlbumPublic />} />
          {/* Legacy gallery routes - redirect to /a/ */}
          <Route path="/g/:gallerySlug" element={<Navigate to={`/a/${window.location.pathname.split('/g/')[1]}`} replace />} />
          <Route path="/upload/:gallerySlug" element={<Navigate to={`/a/${window.location.pathname.split('/upload/')[1]}`} replace />} />
          <Route path="/gallery/:gallerySlug" element={<Navigate to={`/a/${window.location.pathname.split('/gallery/')[1]}`} replace />} />
          {/* Kiosk mode */}
          <Route path="/kiosk/:eventSlug" element={<KioskView />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
