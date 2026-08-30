export type ComparisonCost = {
  display: string;
  estimatedAud?: number;
  countsTowardTotal?: boolean;
};

export type PricingComparisonRow = {
  category: string;
  product: string;
  replaces: string;
  cost: ComparisonCost;
  indent?: boolean;
};

const standaloneEstimate = (): ComparisonCost => ({
  display: 'Estimated from A$147',
  estimatedAud: 147,
  countsTowardTotal: true,
});

export const pricingComparisonRows: PricingComparisonRow[] = [
  { category: 'Planning and organisation', product: 'Create and manage your event', replaces: 'Event planning workspace', cost: standaloneEstimate() },
  { category: 'Planning and organisation', product: 'Build your guest list and track RSVPs', replaces: 'Guest-list and RSVP software', cost: standaloneEstimate() },
  { category: 'Planning and organisation', product: 'Create tables and assign seats', replaces: 'Seating-chart software', cost: standaloneEstimate() },
  { category: 'Planning and organisation', product: 'Plan your ceremony floor layout', replaces: 'Floor-plan design software', cost: standaloneEstimate() },
  { category: 'Planning and organisation', product: 'Plan your reception floor layout', replaces: 'Floor-plan design software', cost: { display: 'Included in A$147 Floor Plan estimate' } },
  { category: 'Guest experience', product: 'Generate a QR code seating chart', replaces: 'QR guest lookup tool', cost: standaloneEstimate() },
  { category: 'Guest experience', product: 'Run a guest lookup kiosk at the venue', replaces: 'Self-service check-in or lookup kiosk', cost: standaloneEstimate() },
  { category: 'Guest experience', product: 'Create invitations, Save the Dates and Thank You cards', replaces: 'Digital stationery design tool', cost: standaloneEstimate() },
  { category: 'Guest experience', product: 'Send and manage digital invitations', replaces: 'Invitation delivery and RSVP tool', cost: { display: 'Included in A$147 Invitations & Cards estimate' } },
  { category: 'Print and export', product: 'Design print-ready seating chart signs', replaces: 'Signage design software', cost: standaloneEstimate() },
  { category: 'Print and export', product: 'Design guest name place cards', replaces: 'Place-card design software', cost: standaloneEstimate() },
  { category: 'Print and export', product: 'Generate individual table charts', replaces: 'Table-chart export tool', cost: standaloneEstimate() },
  { category: 'Print and export', product: 'Export a complete seating chart', replaces: 'Seating-plan export tool', cost: standaloneEstimate() },
  { category: 'Print and export', product: 'Prepare kitchen dietary-requirement reports', replaces: 'Catering dietary report', cost: standaloneEstimate() },
  { category: 'Event-day planning', product: 'Complete your DJ & MC questionnaire', replaces: 'Entertainment briefing workflow', cost: standaloneEstimate() },
  { category: 'Event-day planning', product: 'Create and share your event run sheet and timeline', replaces: 'Specialist wedding timeline software', cost: standaloneEstimate() },
  { category: 'Photo & Video Sharing Suite', product: 'Photo & Video Sharing Suite', replaces: 'Wedding photo-sharing package', cost: standaloneEstimate() },
  { category: 'Photo & Video Sharing Suite', product: 'Customisable photo and video sharing app', replaces: 'Gallery branding and guest uploads', cost: { display: 'Included in A$147 Photo & Video Sharing estimate' }, indent: true },
  { category: 'Photo & Video Sharing Suite', product: 'Guest photo and video gallery', replaces: 'Hosted event gallery', cost: { display: 'Included in A$147 Photo & Video Sharing estimate' }, indent: true },
  { category: 'Photo & Video Sharing Suite', product: 'Digital guestbook', replaces: 'Written and video guestbook', cost: { display: 'Included in A$147 Photo & Video Sharing estimate' }, indent: true },
  { category: 'Photo & Video Sharing Suite', product: 'Digital photo booth', replaces: 'Browser-based photo booth', cost: { display: 'Included in A$147 Photo & Video Sharing estimate' }, indent: true },
  { category: 'Photo & Video Sharing Suite', product: 'Live guest-upload slideshow', replaces: 'Live photo and video slideshow', cost: { display: 'Included in A$147 Photo & Video Sharing estimate' }, indent: true },
];

export const estimatedSeparateToolValueAud = pricingComparisonRows.reduce(
  (total, row) => total + (row.cost.countsTowardTotal ? row.cost.estimatedAud ?? 0 : 0),
  0,
);

export const valuedMainProductCount = pricingComparisonRows.filter(
  (row) => row.cost.countsTowardTotal,
).length;
