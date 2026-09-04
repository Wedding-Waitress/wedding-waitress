export type PublicEventTypeId =
  | 'weddings'
  | 'engagements'
  | 'birthdays-parties'
  | 'corporate-events'
  | 'christmas-seasonal-events'
  | 'memorials-celebrations-of-life';

export interface PublicEventType {
  id: PublicEventTypeId;
  name: string;
  shortName: string;
  path: string;
  eyebrow: string;
  seoTitle: string;
  metaDescription: string;
  h1: string;
  lead: string;
  icon: 'rings' | 'sparkles' | 'cake' | 'building' | 'tree' | 'heart';
  challenges: Array<{ title: string; text: string }>;
  productIds: string[];
  howItWorks: Array<{ title: string; text: string }>;
  benefits: Array<{ title: string; text: string }>;
  example: { title: string; text: string };
  faqs: Array<{ question: string; answer: string }>;
  relatedEventIds: PublicEventTypeId[];
}

export const publicEventTypes: PublicEventType[] = [
  {
    id: 'weddings', name: 'Weddings', shortName: 'Weddings', path: '/events/weddings', eyebrow: 'Weddings', icon: 'rings',
    seoTitle: 'All-in-One Wedding Planning Software | Wedding Waitress',
    metaDescription: 'Plan wedding guests, RSVPs, tables, stationery, venue documents, schedules and shared memories in one connected Australian platform.',
    h1: 'Plan the whole wedding from one connected place',
    lead: 'Bring the guest list, seating, stationery, venue references, run sheet and guest experiences together around one reliable event record.',
    challenges: [
      { title: 'Details change together', text: 'A guest update can affect tables, dietary lists, place cards and venue references. Keep those details connected instead of correcting separate files.' },
      { title: 'Suppliers need clear information', text: 'Prepare focused references for the venue, kitchen, DJ and MC without losing sight of the couple’s complete plan.' },
      { title: 'Guests need a simple experience', text: 'Make invitations, seating lookup and memory sharing straightforward from arrival through the final song.' },
    ],
    productIds: ['my-events', 'guest-list', 'tables', 'invitations-cards', 'running-sheet', 'photo-video-sharing'],
    howItWorks: [
      { title: 'Set the wedding foundation', text: 'Add the ceremony, reception, venues, timings and guest capacity once.' },
      { title: 'Organise people and places', text: 'Collect RSVPs, record dietary needs and relationships, then assign tables and seats.' },
      { title: 'Prepare every useful output', text: 'Create invitations, signage, charts, place cards, supplier briefs and the day’s run sheet.' },
      { title: 'Welcome and involve guests', text: 'Support seating lookup, Live Slideshow access and shared photos, videos and messages.' },
    ],
    benefits: [
      { title: 'One source of truth', text: 'Use consistent event and guest information throughout the planning workflow.' },
      { title: 'Useful venue handover', text: 'Give each supplier a practical view of the details relevant to their role.' },
      { title: 'A more considered guest journey', text: 'Connect communication, arrival, seating and memory sharing without an app for guests to install.' },
    ],
    example: { title: 'From RSVP to reception', text: 'When a guest confirms a dietary requirement, the same record can support the seating plan, kitchen reference, place card and venue check-off list.' },
    faqs: [
      { question: 'Can we plan both the ceremony and reception?', answer: 'Yes. Wedding Waitress stores the core wedding details and provides dedicated ceremony and reception floor-plan workflows alongside guest, seating and event-day tools.' },
      { question: 'Do guests need to download an app?', answer: 'No. Supported guest-facing experiences, including QR seating lookup and photo sharing, open in the browser.' },
      { question: 'Can we share information with suppliers?', answer: 'Yes. Supported products include sharing and PDF controls for venue, kitchen, DJ, MC and other supplier references.' },
      { question: 'Can the plan change after we start?', answer: 'Yes. You can continue updating event, guest and seating details as the wedding plan develops.' },
    ], relatedEventIds: ['engagements', 'christmas-seasonal-events'],
  },
  {
    id: 'engagements', name: 'Engagements', shortName: 'Engagements', path: '/events/engagements', eyebrow: 'Engagement parties', icon: 'sparkles',
    seoTitle: 'Engagement Party Planning Tools | Wedding Waitress',
    metaDescription: 'Organise engagement party guests, invitations, tables, dietary details, venue setup and shared photos in one connected plan.',
    h1: 'Bring the engagement celebration together beautifully',
    lead: 'Organise invitations, guests, seating, dietary details and shared memories for an engagement party that feels welcoming without becoming complicated.',
    challenges: [
      { title: 'The list grows quickly', text: 'Keep couples, families and friends organised as invitations and responses arrive.' },
      { title: 'A party still needs structure', text: 'Capture venue timing, tables, food requirements and important moments without over-planning the celebration.' },
      { title: 'Everyone wants the photos', text: 'Give guests one simple place to contribute moments from the night.' },
    ],
    productIds: ['my-events', 'guest-list', 'invitations-cards', 'tables', 'dietary-requirements', 'photo-video-sharing'],
    howItWorks: [
      { title: 'Create the engagement event', text: 'Record the date, venue, timing and expected guest capacity.' },
      { title: 'Invite and organise', text: 'Build the guest list, track responses and collect details needed by the venue.' },
      { title: 'Shape the room', text: 'Create tables or a floor plan when the party format calls for assigned places.' },
      { title: 'Share the celebration', text: 'Use QR access so guests can contribute photos, videos and well wishes.' },
    ],
    benefits: [
      { title: 'Right-sized planning', text: 'Use the tools that suit a relaxed cocktail party, formal dinner or family celebration.' },
      { title: 'Clear guest information', text: 'Keep contact, RSVP, relationship and dietary details in one working list.' },
      { title: 'Memories gathered together', text: 'Collect contributions without relying on scattered group chats.' },
    ],
    example: { title: 'A relaxed venue celebration', text: 'Send a personalised invitation, monitor responses, give the caterer a dietary list and place a photo-sharing QR where guests can easily scan it.' },
    faqs: [
      { question: 'Can we use Wedding Waitress for an engagement party before the wedding?', answer: 'Yes. Create the engagement as its own event and use the tools that match the way you are celebrating.' },
      { question: 'Do we have to assign seats?', answer: 'No. Tables and seating are optional. You can still use guest, invitation, dietary and photo-sharing tools for an unseated event.' },
      { question: 'Can guests upload short videos as well as photos?', answer: 'Yes. The supported sharing experience accepts guest photos and short videos through a browser-based event link or QR code.' },
    ], relatedEventIds: ['weddings', 'birthdays-parties'],
  },
  {
    id: 'birthdays-parties', name: 'Birthdays & Parties', shortName: 'Birthdays & Parties', path: '/events/birthdays-parties', eyebrow: 'Birthdays and parties', icon: 'cake',
    seoTitle: 'Birthday & Party Planning Tools | Wedding Waitress',
    metaDescription: 'Plan milestone birthdays and private parties with guest lists, invitations, tables, dietary information, schedules and shared photos.',
    h1: 'Make the party easy to organise and easy to enjoy',
    lead: 'From milestone dinners to lively birthday celebrations, keep guest details, venue planning and shared moments in one practical workspace.',
    challenges: [
      { title: 'Different circles come together', text: 'Organise family, friends and other groups while keeping contact details and responses clear.' },
      { title: 'Hosts juggle many small details', text: 'Coordinate food needs, table arrangements, suppliers and the order of important moments.' },
      { title: 'Memories can become scattered', text: 'Give everyone a shared contribution point rather than chasing photos afterwards.' },
    ],
    productIds: ['guest-list', 'invitations-cards', 'tables', 'dietary-requirements', 'running-sheet', 'photo-video-sharing'],
    howItWorks: [
      { title: 'Choose the party shape', text: 'Add the date, venue, timing and guest capacity for a dinner, cocktail event or larger celebration.' },
      { title: 'Gather the guest details', text: 'Track responses and record dietary needs, relationships and contact information.' },
      { title: 'Plan the experience', text: 'Arrange tables, prepare place cards and build a run sheet for speeches, cake and entertainment.' },
      { title: 'Collect the moments', text: 'Invite guests to share photos, short videos and messages from their phones.' },
    ],
    benefits: [
      { title: 'Flexible for the occasion', text: 'Use a light guest-list workflow or a more detailed seated-event plan.' },
      { title: 'Better host visibility', text: 'See who is attending and what the venue needs to know.' },
      { title: 'Participation beyond the dance floor', text: 'Give guests simple ways to contribute messages and memories.' },
    ],
    example: { title: 'A milestone birthday dinner', text: 'Track family and friend RSVPs, assign dinner seats, brief the venue on dietary needs, schedule speeches and collect the evening’s photos.' },
    faqs: [
      { question: 'Is this only for milestone birthdays?', answer: 'No. The same planning tools can support birthday dinners, anniversary parties, reunions and other private celebrations.' },
      { question: 'Can we create place cards for a seated dinner?', answer: 'Yes. Name Place Cards can use guest, table and seat information from the connected plan.' },
      { question: 'Can we include speeches and cake cutting in a timeline?', answer: 'Yes. The Run Sheet lets you record the time, activity and person responsible for each planned moment.' },
    ], relatedEventIds: ['engagements', 'christmas-seasonal-events'],
  },
  {
    id: 'corporate-events', name: 'Corporate Events', shortName: 'Corporate Events', path: '/events/corporate-events', eyebrow: 'Corporate events', icon: 'building',
    seoTitle: 'Corporate Event Guest & Venue Planning | Wedding Waitress',
    metaDescription: 'Coordinate corporate event attendees, tables, dietary requirements, venue references, schedules, signage and Live Slideshow lookup.',
    h1: 'Keep attendees, suppliers and the venue working from one plan',
    lead: 'Coordinate registrations, seating, service details and event-day responsibilities for dinners, awards, launches, conferences and team events.',
    challenges: [
      { title: 'Attendee data serves many teams', text: 'Keep names, organisations, dietary needs and seating details organised for hosts and venue staff.' },
      { title: 'Timing has operational consequences', text: 'Give speakers, production, catering and MCs a clear sequence of responsibilities.' },
      { title: 'Arrival must feel efficient', text: 'Help attendees find their assigned place through QR or Live Slideshow lookup where seating is used.' },
    ],
    productIds: ['guest-list', 'tables', 'dietary-requirements', 'full-seating-chart', 'live-slideshow', 'running-sheet'],
    howItWorks: [
      { title: 'Define the event', text: 'Record the venue, schedule boundaries and attendee capacity.' },
      { title: 'Prepare the attendee list', text: 'Maintain responses, contact details, dietary needs and relevant relationships or groups.' },
      { title: 'Coordinate the room and team', text: 'Assign tables and seats, prepare staff references and build the operational run sheet.' },
      { title: 'Support arrival', text: 'Offer QR or Live Slideshow lookup for events using assigned seating.' },
    ],
    benefits: [
      { title: 'Useful operational clarity', text: 'Give hosts and suppliers current information without maintaining parallel spreadsheets.' },
      { title: 'Flexible attendee lookup', text: 'Use personal phones or a venue screen depending on the arrival experience.' },
      { title: 'Clear service references', text: 'Prepare focused seating and dietary documents for front-of-house and catering teams.' },
    ],
    example: { title: 'An awards dinner', text: 'Maintain the attendee list, assign sponsored tables, prepare dietary and check-in references, then coordinate arrivals, presentations and service in the run sheet.' },
    faqs: [
      { question: 'Can this support conferences as well as dinners?', answer: 'Yes. Guest-list, schedule and lookup tools can support different corporate formats; seating products are available when the event uses assigned places.' },
      { question: 'Can attendees find their table in the Live Slideshow?', answer: 'Yes. Live Slideshow can run on a supported touchscreen, tablet, laptop or desktop so attendees can search for their assignment.' },
      { question: 'Can we prepare dietary information for caterers?', answer: 'Yes. The Dietary Requirements product creates a practical reference using recorded attendee, table and seat details.' },
      { question: 'Is there a plan for venues and event professionals?', answer: 'Wedding Waitress lists a Vendor Pro option for venues and event professionals on the Pricing page.' },
    ], relatedEventIds: ['christmas-seasonal-events', 'birthdays-parties'],
  },
  {
    id: 'christmas-seasonal-events', name: 'Christmas & Seasonal Events', shortName: 'Christmas & Seasonal', path: '/events/christmas-seasonal-events', eyebrow: 'Seasonal events', icon: 'tree',
    seoTitle: 'Christmas & Seasonal Event Planning Tools | Wedding Waitress',
    metaDescription: 'Plan Christmas parties and seasonal celebrations with guests, seating, dietary information, venue schedules and shared photos.',
    h1: 'Organise the season without losing the celebration',
    lead: 'Bring invitations, attendance, food requirements, seating, entertainment and shared memories together for festive gatherings of every shape.',
    challenges: [
      { title: 'Availability changes quickly', text: 'Keep responses current when end-of-year calendars and family commitments are busy.' },
      { title: 'Food needs careful coordination', text: 'Give caterers a clear view of recorded dietary requirements and assigned places.' },
      { title: 'The program often has many moments', text: 'Coordinate arrivals, meals, presentations, gifts, entertainment and transport in a readable order.' },
    ],
    productIds: ['invitations-cards', 'guest-list', 'dietary-requirements', 'tables', 'running-sheet', 'photo-video-sharing'],
    howItWorks: [
      { title: 'Create the seasonal event', text: 'Set the date, venue, timing and capacity for a family, community or workplace celebration.' },
      { title: 'Confirm attendance', text: 'Build the list, follow responses and record the information needed for service.' },
      { title: 'Prepare the gathering', text: 'Arrange tables, place cards, signage and a run sheet where the format requires them.' },
      { title: 'Share the highlights', text: 'Collect guest photos and messages through simple browser-based access.' },
    ],
    benefits: [
      { title: 'Less end-of-year admin', text: 'Keep the latest guest and venue information together in one event.' },
      { title: 'Suitable for formal or casual formats', text: 'Use only the products needed for a lunch, dinner, party or community gathering.' },
      { title: 'A shared record of the occasion', text: 'Bring guest contributions together while everyone is still celebrating.' },
    ],
    example: { title: 'A workplace Christmas dinner', text: 'Track colleagues and partners, organise tables and dietary needs, schedule presentations and entertainment, and share a QR for the evening’s photos.' },
    faqs: [
      { question: 'Can we use this for events other than Christmas?', answer: 'Yes. These workflows can suit end-of-year dinners, seasonal celebrations, community gatherings and other recurring occasions.' },
      { question: 'Can we invite partners or household groups?', answer: 'Guest List & RSVP supports guest details and relationship information that can help you organise connected invitees.' },
      { question: 'Can the run sheet include transport or gift activities?', answer: 'Yes. Run Sheet entries are flexible, so you can record the time, activity and responsible person for the moments relevant to your event.' },
    ], relatedEventIds: ['corporate-events', 'birthdays-parties'],
  },
  {
    id: 'memorials-celebrations-of-life', name: 'Memorials & Celebrations of Life', shortName: 'Memorials & Celebrations', path: '/events/memorials-celebrations-of-life', eyebrow: 'Memorials and celebrations of life', icon: 'heart',
    seoTitle: 'Memorial & Celebration of Life Planning | Wedding Waitress',
    metaDescription: 'Gently organise attendance, venue details, service seating, dietary information, schedules and shared memories for a memorial or celebration of life.',
    h1: 'A calm place for the practical details of remembering someone',
    lead: 'Coordinate attendance, service information, venue needs and shared memories with a respectful workflow that helps family and supporters stay informed.',
    challenges: [
      { title: 'Time and attention are limited', text: 'Keep the essential details in one place when family members may be sharing responsibilities at short notice.' },
      { title: 'Venues need accurate information', text: 'Prepare clear attendance, seating and dietary references without repeatedly asking family members for updates.' },
      { title: 'Memories arrive in many forms', text: 'Offer a considered way for invited guests to contribute photos, short videos or messages when appropriate.' },
    ],
    productIds: ['my-events', 'guest-list', 'invitations-cards', 'full-seating-chart', 'running-sheet', 'photo-video-sharing'],
    howItWorks: [
      { title: 'Record the essential arrangements', text: 'Add the service or gathering date, venue, timing and expected capacity.' },
      { title: 'Coordinate attendance gently', text: 'Maintain the guest list and any information needed for seating, accessibility or catering.' },
      { title: 'Prepare clear references', text: 'Create a simple run sheet and the appropriate venue or seating documents.' },
      { title: 'Invite memories when it feels right', text: 'Enable browser-based contributions for guests if the family wishes to gather them.' },
    ],
    benefits: [
      { title: 'Shared practical clarity', text: 'Help family, celebrants and venues work from the same current details.' },
      { title: 'Only the tools you need', text: 'Use a simple attendance list or add seating, service timing and memory sharing as appropriate.' },
      { title: 'A respectful guest experience', text: 'Provide clear information without making participation feel demanding.' },
    ],
    example: { title: 'A service followed by a gathering', text: 'Keep the attendee list and venue notes together, prepare a simple order-of-service run sheet, and optionally invite guests to share meaningful photos or messages.' },
    faqs: [
      { question: 'Do we have to use every planning feature?', answer: 'No. You can use only the tools that are appropriate for the service or gathering and leave the rest untouched.' },
      { question: 'Can several family members refer to the same plan?', answer: 'Wedding Waitress keeps the event details together so the organiser can prepare and share the supported references needed by family and suppliers.' },
      { question: 'Is photo and message sharing optional?', answer: 'Yes. Guest-facing sharing features can be enabled only when they suit the family’s wishes and the nature of the gathering.' },
      { question: 'Can we prepare a simple service schedule?', answer: 'Yes. The Run Sheet can record the sequence, timing and responsible person for readings, music, tributes and venue transitions.' },
    ], relatedEventIds: ['weddings', 'birthdays-parties'],
  },
];

export const eventTypeById = (id: PublicEventTypeId | string) => publicEventTypes.find((eventType) => eventType.id === id);

export const relevantEventIdsByProduct: Record<string, PublicEventTypeId[]> = {
  'my-events': ['weddings', 'engagements', 'memorials-celebrations-of-life'],
  'event-budget-planner': ['weddings', 'corporate-events', 'birthdays-parties'],
  'guest-list': ['weddings', 'corporate-events', 'birthdays-parties'],
  tables: ['weddings', 'corporate-events', 'birthdays-parties'],
  'qr-code-seating-chart': ['weddings', 'corporate-events'],
  'seating-chart-signs': ['weddings', 'corporate-events'],
  'invitations-cards': ['weddings', 'engagements', 'christmas-seasonal-events'],
  'name-place-cards': ['weddings', 'birthdays-parties', 'corporate-events'],
  'individual-table-charts': ['weddings', 'corporate-events'],
  'floor-plan': ['weddings', 'corporate-events'],
  'dietary-requirements': ['weddings', 'christmas-seasonal-events', 'corporate-events'],
  'full-seating-chart': ['weddings', 'corporate-events', 'memorials-celebrations-of-life'],
  'live-slideshow': ['weddings', 'corporate-events'],
  'dj-mc-questionnaire': ['weddings', 'birthdays-parties'],
  'running-sheet': ['weddings', 'corporate-events', 'memorials-celebrations-of-life'],
  'photo-video-sharing': ['weddings', 'engagements', 'birthdays-parties'],
};
