export const SITE_URL = "https://weddingwaitress.com.au";

const page = (path, title, description, h1, options = {}) => ({
  path,
  title,
  description,
  h1,
  lastmod: options.lastmod ?? "2026-08-24",
  type: options.type ?? "website",
  schema: options.schema ?? "WebPage",
  published: options.published,
  modified: options.modified ?? options.lastmod ?? "2026-08-24",
  breadcrumbs: options.breadcrumbs ?? [],
});

export const seoRoutes = [
  page("/", "All-in-One Wedding Planning Platform | Wedding Waitress", "Manage guests, RSVPs, seating, invitations, signage, event-day plans and shared wedding memories in one connected platform.", "Your all-in-one wedding planning and guest-experience platform", { schema: "Home" }),
  page("/how-it-works", "How Wedding Waitress Works | One Connected Wedding Plan", "See how Wedding Waitress connects event setup, guests, seating, stationery, venue references, schedules and shared memories in one plan.", "Four stages from first plan to wedding day"),
  page("/products", "All Wedding Planning Products | Wedding Waitress", "Explore sixteen connected Wedding Waitress tools for budgets, guests, seating, stationery, venue references, event-day planning and shared memories.", "Sixteen tools. One connected wedding plan."),
  page("/events", "Event Planning Tools for Every Celebration | Wedding Waitress", "Explore connected planning tools for weddings, engagements, birthdays, corporate events, seasonal gatherings and celebrations of life.", "Thoughtful tools for every kind of gathering"),
  page("/pricing", "Wedding Planning Software Pricing | Wedding Waitress", "Compare Wedding Waitress plans by guest capacity. Every couple plan includes the complete platform for one event and 12 months of access.", "Choose by guest capacity, not by features"),
  page("/faq", "Wedding Waitress FAQ | Plans, Guests, QR & Products", "Answers about Wedding Waitress plans, guest limits, QR seating charts, invitations, exports, photo sharing and account access.", "Answers before you start planning", { schema: "FAQPage" }),
  page("/blog", "Wedding Planning Tips & Ideas | Wedding Waitress Blog", "Practical Australian wedding planning guides covering seating charts, QR codes, signage, run sheets and guest experience.", "Wedding planning tips and practical guides", { schema: "Blog" }),
  page("/contact", "Contact Wedding Waitress | Product & Plan Help", "Contact Wedding Waitress for help choosing a plan, understanding a product or using the wedding planning platform.", "How can we help?", { schema: "ContactPage" }),
  page("/privacy", "Privacy Policy | Wedding Waitress", "Read the Wedding Waitress privacy policy and learn how personal information is collected, used and protected.", "Privacy Policy"),
  page("/terms", "Terms of Service | Wedding Waitress", "Read the terms that apply when using the Wedding Waitress website and wedding planning platform.", "Terms of Service"),
  page("/cookies", "Cookie Policy | Wedding Waitress", "Learn how Wedding Waitress uses cookies and similar technologies on its public website and application.", "Cookie Policy"),
  page("/venues", "Wedding Venue Floor Plans Directory | Wedding Waitress", "Browse wedding and event venue floor plans and practical planning references in the Wedding Waitress venue directory.", "Wedding & Event Venue Floor Plans"),

  page("/my-events", "Wedding Event Planner & Overview | Wedding Waitress", "Create a wedding, record dates and venues, see your countdown and open every connected Wedding Waitress planning tool from one event overview.", "My Events", { schema: "Product" }),
  page("/event-budget-planner", "Event Budget Planner | Wedding Waitress", "Set an anticipated event budget, record vendor expenses, track estimated and actual costs, payments and due dates, and print or download your budget.", "Event Budget Planner", { schema: "Product" }),
  page("/guest-list", "Wedding Guest List & RSVP Manager | Wedding Waitress", "Manage individuals, couples and families, RSVP details, plus-ones, addresses, dietary needs, relationships and seating in one guest list.", "Guest List & RSVP", { schema: "Product" }),
  page("/tables", "Wedding Table & Seat Planner | Wedding Waitress", "Create and name wedding tables, set capacities, and assign guests and seats with live connections to your guest list and seating outputs.", "Tables", { schema: "Product" }),
  page("/floor-plan", "Wedding Ceremony & Reception Floor Plans | Wedding Waitress", "Design ceremony and reception floor plans with seating arrangements, bridal party, family sections, rows, chairs, tables and venue-ready PDF output.", "Ceremony & Reception Floor Plans", { schema: "Product" }),
  page("/qr-code-seating-chart", "QR Code Wedding Seating Chart | Wedding Waitress", "Create a custom event QR code so guests can search their name and find their assigned wedding table or seat without downloading an app.", "QR Code Seating Chart", { schema: "Product" }),
  page("/live-slideshow", "Wedding Live Slideshow Guest & Seating Lookup | Wedding Waitress", "Let wedding guests search for their table or seat through a Live Slideshow on a venue touchscreen, tablet, laptop, desktop computer or entrance display.", "Live Slideshow", { schema: "Product" }),
  page("/invitations-cards", "Wedding Invitations, Save the Dates & Thank You Cards", "Design wedding invitations, save the dates and thank you cards with custom text, backgrounds, QR codes, messages and print-ready exports.", "Invitations, Save the Dates & Thank You Cards", { schema: "Product" }),
  page("/photo-video-sharing", "Wedding Photo & Video Sharing, Guestbook & Booth", "Collect guest photos and videos with QR upload, then bring them together with a gallery, digital guestbook, photo booth and live slideshow.", "Photo & Video Sharing", { schema: "Product" }),
  page("/seating-chart-signs", "Wedding Seating Chart Signs & QR Signage", "Design professional wedding seating charts, QR seating signs and supported event signage with print-ready PDFs and Australian print sizes.", "Seating Chart Signs", { schema: "Product" }),
  page("/name-place-cards", "Wedding Name Place Card Designer | Wedding Waitress", "Design foldable wedding place cards with guest names, table and seat details, fonts, colours, backgrounds, QR codes and print-ready export.", "Name Place Cards", { schema: "Product" }),
  page("/individual-table-charts", "Individual Wedding Table Charts | Wedding Waitress", "Generate separate round, square or long-table charts with guest names, seats, dietary details, relationships and print-ready PDF export.", "Individual Table Charts", { schema: "Product" }),
  page("/full-seating-chart", "Full Wedding Seating Chart & Check-Off List", "Create a complete guest seating chart with table and seat details, check-off boxes, sorting, display options and multi-page PDF export.", "Full Seating Chart", { schema: "Product" }),
  page("/dietary-requirements", "Wedding Dietary Requirements List | Wedding Waitress", "Prepare a clear dietary requirements reference with guest, table and seat details for venues, caterers and kitchen teams.", "Dietary Requirements", { schema: "Product" }),
  page("/dj-mc-questionnaire", "Wedding DJ & MC Questionnaire | Wedding Waitress", "Organise ceremony music, introductions, speeches, event songs, dinner music, dance music and do-not-play choices for your DJ and MC.", "DJ & MC Questionnaire", { schema: "Product" }),
  page("/running-sheet", "Wedding Run Sheet Planner | Wedding Waitress", "Build a clear wedding run sheet with times, event descriptions and responsible people, then share or export it for vendors and your venue.", "Run Sheet", { schema: "Product" }),

  page("/events/weddings", "All-in-One Wedding Planning Software | Wedding Waitress", "Plan wedding guests, seating, stationery, venue references, schedules and shared memories in one connected place.", "Plan the whole wedding from one connected place", { breadcrumbs: ["Events", "Weddings"] }),
  page("/events/engagements", "Engagement Party Planning Tools | Wedding Waitress", "Organise engagement invitations, guests, seating, dietary details and shared memories in one connected plan.", "Bring the engagement celebration together beautifully", { breadcrumbs: ["Events", "Engagements"] }),
  page("/events/birthdays-parties", "Birthday & Party Planning Tools | Wedding Waitress", "Plan birthday and party guests, venue details, seating, dietary needs, schedules and shared moments in one workspace.", "Make the party easy to organise and easy to enjoy", { breadcrumbs: ["Events", "Birthdays & Parties"] }),
  page("/events/corporate-events", "Corporate Event Guest & Venue Planning | Wedding Waitress", "Coordinate corporate event attendees, seating, service details, dietary needs, suppliers and event-day responsibilities.", "Keep attendees, suppliers and the venue working from one plan", { breadcrumbs: ["Events", "Corporate Events"] }),
  page("/events/christmas-seasonal-events", "Christmas & Seasonal Event Planning Tools | Wedding Waitress", "Organise invitations, attendance, food requirements, seating, entertainment and memories for seasonal events.", "Organise the season without losing the celebration", { breadcrumbs: ["Events", "Christmas & Seasonal Events"] }),
  page("/events/memorials-celebrations-of-life", "Memorial & Celebration of Life Planning | Wedding Waitress", "Coordinate attendance, service information, venue needs and shared memories with a respectful connected workflow.", "A calm place for the practical details of remembering someone", { breadcrumbs: ["Events", "Memorials & Celebrations of Life"] }),

  page("/blog/qr-code-wedding-seating-chart-australia", "QR Code Wedding Seating Charts Australia | 2026 Trend", "Discover why Australian couples are switching to QR code wedding seating charts. Save money, reduce stress, and manage guests easily.", "Why Australian Couples Are Switching to QR Code Wedding Seating Charts in 2026 (and Beyond)", { schema: "BlogPosting", type: "article", published: "2026-04-17", lastmod: "2026-04-17", breadcrumbs: ["Blog", "QR Code Wedding Seating Charts"] }),
  page("/blog/wedding-signage-cost-australia", "Wedding Signage Cost Australia | Printed vs Digital", "Compare printed vs digital wedding seating charts in Australia. See how much you can save by going digital.", "The Real Cost of Wedding Signage in Australia: Printed vs Digital Seating Charts", { schema: "BlogPosting", type: "article", published: "2026-04-15", lastmod: "2026-04-15", breadcrumbs: ["Blog", "Wedding Signage Cost"] }),
  page("/blog/how-to-create-qr-code-seating-chart", "How to Create QR Code Seating Chart | Easy Guide", "Step-by-step guide to creating a QR code wedding seating chart in minutes. Simple, fast, and stress-free.", "How to Create a QR Code Wedding Seating Chart in 5 Minutes", { schema: "BlogPosting", type: "article", published: "2026-04-16", lastmod: "2026-04-16", breadcrumbs: ["Blog", "Create a QR Seating Chart"] }),
  page("/blog/digital-wedding-seating-chart-accessibility", "Digital Seating Charts for Seniors | Wedding Guide", "Worried about older guests? Learn why digital seating charts are easier to use and more accessible for everyone.", "Are Digital Seating Charts Easy for Older Guests? (Wedding Guide)", { schema: "BlogPosting", type: "article", published: "2026-04-06", lastmod: "2026-04-06", breadcrumbs: ["Blog", "Digital Seating Chart Accessibility"] }),
  page("/blog/last-minute-wedding-seating-changes", "Last Minute Wedding Seating Changes | Easy Fix", "Guest cancelled last minute? Learn how to update your seating chart instantly without stress.", "How to Handle Last-Minute Wedding Seating Changes Without Stress", { schema: "BlogPosting", type: "article", published: "2026-04-04", lastmod: "2026-04-04", breadcrumbs: ["Blog", "Last-Minute Seating Changes"] }),
  page("/blog/why-every-wedding-needs-a-running-sheet", "Why Every Wedding Needs a Running Sheet | Wedding Waitress", "A well-planned wedding running sheet keeps your day on track. Learn how to build a timeline that avoids delays and keeps every vendor aligned.", "Why Every Wedding Needs a Running Sheet", { schema: "BlogPosting", type: "article", published: "2026-04-17", lastmod: "2026-04-17", breadcrumbs: ["Blog", "Wedding Running Sheets"] }),
  page("/blog/how-to-create-a-wedding-seating-chart-step-by-step", "How to Create a Wedding Seating Chart (Step-by-Step Guide Australia)", "Learn how to create a wedding seating chart step-by-step. Easy guide for Australian couples using digital and QR code seating charts.", "How to Create a Wedding Seating Chart (Step-by-Step Guide)", { schema: "BlogPosting", type: "article", published: "2026-04-20", lastmod: "2026-04-20", breadcrumbs: ["Blog", "Create a Wedding Seating Chart"] }),
  page("/blog/wedding-seating-chart-etiquette-who-sits-where", "Wedding Seating Chart Etiquette: Who Sits Where? (Australia Guide)", "Confused about wedding seating etiquette? Learn who sits where, table arrangements, and how to organise guests stress-free.", "Wedding Seating Chart Etiquette: Who Sits Where?", { schema: "BlogPosting", type: "article", published: "2026-04-20", lastmod: "2026-04-20", breadcrumbs: ["Blog", "Seating Chart Etiquette"] }),
  page("/blog/best-wedding-seating-chart-templates-australia", "Best Wedding Seating Chart Templates (Australia Guide 2026)", "Looking for wedding seating chart templates? Discover the best options, ideas, and digital solutions for Australian weddings.", "Best Wedding Seating Chart Templates (Australia Guide)", { schema: "BlogPosting", type: "article", published: "2026-04-20", lastmod: "2026-04-20", breadcrumbs: ["Blog", "Seating Chart Templates"] }),
  page("/blog/common-wedding-seating-chart-mistakes", "Common Wedding Seating Chart Mistakes", "Avoid the most common wedding seating chart mistakes. Learn how to plan your seating the right way and keep guests happy.", "Common Wedding Seating Chart Mistakes", { schema: "BlogPosting", type: "article", published: "2026-04-20", lastmod: "2026-04-20", breadcrumbs: ["Blog", "Seating Chart Mistakes"] }),
];

export const routeByPath = new Map(seoRoutes.map((route) => [route.path, route]));

export const canonicalUrl = (path) => `${SITE_URL}${path === "/" ? "/" : path}`;

export function schemaForRoute(route) {
  const url = canonicalUrl(route.path);
  const organisation = {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: "Wedding Waitress",
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/branding/wedding-waitress-logo-dark-brown.png`,
  };
  const webPage = {
    "@type": route.schema === "ContactPage" ? "ContactPage" : "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: route.title,
    description: route.description,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": `${SITE_URL}/#software` },
  };
  const graph = [organisation, webPage];

  if (route.path === "/") {
    graph.push(
      { "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: `${SITE_URL}/`, name: "Wedding Waitress", publisher: { "@id": `${SITE_URL}/#organization` }, inLanguage: "en-AU" },
      { "@type": "SoftwareApplication", "@id": `${SITE_URL}/#software`, name: "Wedding Waitress", applicationCategory: "LifestyleApplication", operatingSystem: "Web", url: `${SITE_URL}/`, description: route.description, publisher: { "@id": `${SITE_URL}/#organization` } },
    );
  } else if (route.schema === "Product") {
    graph.push({ "@type": "SoftwareApplication", "@id": `${url}#software", name: route.h1, applicationCategory: "LifestyleApplication", operatingSystem: "Web", url, description: route.description, publisher: { "@id": `${SITE_URL}/#organization` } });
  } else if (route.schema === "BlogPosting") {
    graph.push({ "@type": "BlogPosting", "@id": `${url}#article`, headline: route.h1, description: route.description, datePublished: route.published, dateModified: route.modified, mainEntityOfPage: { "@id": `${url}#webpage` }, author: organisation, publisher: organisation, inLanguage: "en-AU" });
  } else if (route.schema === "Blog") {
    graph.push({ "@type": "Blog", "@id": `${url}#blog`, url, name: route.title, publisher: { "@id": `${SITE_URL}/#organization` }, inLanguage: "en-AU" });
  }

  if (route.breadcrumbs.length) {
    const items = [{ name: "Home", path: "/" }, ...route.breadcrumbs.map((name, index) => ({ name, path: index === route.breadcrumbs.length - 1 ? route.path : name === "Blog" ? "/blog" : "/events" }))];
    graph.push({ "@type": "BreadcrumbList", "@id": `${url}#breadcrumb`, itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: canonicalUrl(item.path) })) });
  }

  return { "@context": "https://schema.org", "@graph": graph };
}
