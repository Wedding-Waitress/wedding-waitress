

## Add Google Analytics 4 to Wedding Waitress

**Your Measurement ID**: `G-2EG6ZWCT0T`

### What will be done

Two small changes to wire up GA4 tracking across the entire app:

**1. Add the GA4 script tag to `index.html`**
- Insert the standard Google gtag.js snippet in the `<head>` section (after the existing preconnect links, before the `<title>` tag)
- This loads the GA4 library and initializes it with your Measurement ID

**2. Add page-view tracking on route changes in `src/App.tsx`**
- Since this is a single-page app (SPA), Google Analytics only fires on the initial page load by default
- Add a small `useEffect` that listens for route changes and sends a `page_view` event to GA4 each time the user navigates
- This ensures every page/tab visit is tracked accurately

### What you will see in Google Analytics
- Real-time visitors on the "Realtime" report
- Page views for every route (`/dashboard`, `/s/:slug`, `/kiosk/:slug`, landing page, etc.)
- User demographics, device info, and session data -- all automatic with GA4
- Data should start appearing within 24-48 hours after deployment

### Files touched
- `index.html` -- add gtag.js script (4 lines)
- `src/App.tsx` -- add route-change tracking hook (~10 lines)

