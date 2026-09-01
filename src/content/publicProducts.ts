import type { LucideIcon } from 'lucide-react';
import {
  CalendarHeart, Users, TableProperties, QrCode, SignpostBig, Mail,
  ContactRound, LayoutGrid, PanelsTopLeft, UtensilsCrossed, ClipboardCheck,
  MonitorSmartphone, Mic2, ListChecks, Camera,
} from 'lucide-react';
import { productIconById } from '@/config/productNavigation';
import { PLANNING_WORKFLOW_BY_ID } from '@/config/planningWorkflow';

import myEvents from '@/assets/feature-myevents.jpg';
import guestList from '@/assets/feature-guestlist.jpg';
import tables from '@/assets/feature-tables.jpg';
import qr from '@/assets/feature-qr.jpg';
import signs from '@/assets/blog-wedding-signage.jpg';
import invitations from '@/assets/feature-invitations.jpg';
import placeCards from '@/assets/feature-placecards.jpg';
import tableCharts from '@/assets/feature-tablecharts.jpg';
import floorPlan from '@/assets/feature-floorplan.jpg';
import dietary from '@/assets/feature-dietary.jpg';
import fullSeating from '@/assets/feature-seatingchart.jpg';
import kiosk from '@/assets/feature-kiosk.jpg';
import djMc from '@/assets/feature-djmc.jpg';
import runSheet from '@/assets/feature-timeline.jpg';
import photoSharing from '@/assets/Wedding-Waitress-Upload-Hero-Default.png';
import budgetPlanner from '@/assets/blog-planning-laptop.jpg';

export type ProductGroup = 'Plan & Organise' | 'Guest Experience' | 'Print & Export' | 'Event-Day Planning';

export interface PublicProduct {
  id: string;
  name: string;
  shortName: string;
  path: string;
  group: ProductGroup;
  icon: LucideIcon;
  navigationIcon: LucideIcon;
  image: string;
  imageAlt: string;
  seoTitle: string;
  metaDescription: string;
  h1: string;
  lead: string;
  demonstration: string;
  benefits: { title: string; text: string }[];
  connects: string;
  related: string[];
}

export const productGroups: ProductGroup[] = ['Plan & Organise', 'Guest Experience', 'Print & Export', 'Event-Day Planning'];

export const publicProducts: PublicProduct[] = [
  {
    id: 'my-events', name: 'My Events', shortName: 'My Events', path: '/my-events', group: 'Plan & Organise', icon: CalendarHeart, navigationIcon: productIconById['my-events'],
    image: myEvents, imageAlt: 'Wedding Waitress event overview dashboard', seoTitle: 'Wedding Event Planner & Overview | Wedding Waitress',
    metaDescription: 'Create a wedding, record dates and venues, see your countdown and open every connected Wedding Waitress planning tool from one event overview.',
    h1: 'Your wedding plans, all in one place', lead: 'Create your event once, keep the important details close, and move between every connected planning tool without rebuilding the same information.',
    demonstration: 'The event overview keeps your date, venues, guest capacity and countdown together. It is the starting point for a wedding, engagement, birthday or other organised event.',
    benefits: [
      { title: 'A clear event overview', text: 'Keep dates, venue details and the countdown easy to find.' },
      { title: 'One connected workspace', text: 'Open guest, seating, stationery and event-day tools from the same event.' },
      { title: 'Plan at your pace', text: 'Return throughout your access period and continue from the latest saved details.' },
    ],
    connects: 'My Events supplies core event information to invitations, charts, floor plans, schedules and guest-facing experiences.', related: ['guest-list', 'invitations-cards', 'running-sheet'],
  },
  {
    id: 'event-budget-planner', name: 'Event Budget Planner', shortName: 'Event Budget Planner', path: '/event-budget-planner', group: 'Plan & Organise', icon: PLANNING_WORKFLOW_BY_ID.dashboard.icon, navigationIcon: PLANNING_WORKFLOW_BY_ID.dashboard.icon,
    image: budgetPlanner, imageAlt: 'A couple planning their wedding costs together', seoTitle: 'Event Budget Planner | Wedding Waitress',
    metaDescription: 'Set an anticipated event budget, record vendor expenses, track estimated and actual costs, payments and due dates, and print or download your budget.',
    h1: 'Event Budget Planner', lead: 'Set your anticipated budget, organise costs and payments, and keep a clear view of what has been paid, what is outstanding and what remains.',
    demonstration: 'Choose the event budget currency, add expenses by category, record vendor and contact details, compare budgeted and actual costs, track deposits and due dates, then search, filter, sort, print or download the budget as a PDF.',
    benefits: [
      { title: 'See the complete budget', text: 'Review total budget, budgeted and actual costs, amounts paid and outstanding, and the remaining or over-budget amount.' },
      { title: 'Keep expense details together', text: 'Record categories, businesses, contacts, costs, payments, balance due dates and notes for each expense.' },
      { title: 'Prepare a practical reference', text: 'Search, filter and sort expenses, then use the supported print view or download the budget as a PDF.' },
    ],
    connects: 'Event Budget Planner is saved to the event selected in My Events, keeping that event\'s spending plan alongside the rest of its Wedding Waitress planning tools.', related: ['my-events', 'running-sheet', 'tables'],
  },
  {
    id: 'tables', name: 'Tables', shortName: 'Tables', path: '/tables', group: 'Plan & Organise', icon: TableProperties, navigationIcon: productIconById.tables,
    image: tables, imageAlt: 'Wedding table and seat assignment planner', seoTitle: 'Wedding Table & Seat Planner | Wedding Waitress',
    metaDescription: 'Create and name wedding tables, set capacities, and assign guests and seats with live connections to your guest list and seating outputs.',
    h1: 'Build tables with every guest in the right place', lead: 'Create, name and size your tables, then assign guests and seat numbers for a seating plan that stays connected to every output.',
    demonstration: 'Table tools bring capacity and seat assignment into one practical workspace, including supported family and head-table arrangements.',
    benefits: [
      { title: 'Capacity at a glance', text: 'See how many places are available as you arrange each table.' },
      { title: 'Guest and seat assignment', text: 'Place people at a table and record their seat number from the same planning flow.' },
      { title: 'Outputs update from one source', text: 'Use the assignments in QR lookup, charts, place cards and venue references.' },
    ],
    connects: 'Tables uses the Guest List and supplies QR Seating, Full Seating Chart, Individual Table Charts, Name Place Cards and floor-plan outputs.', related: ['guest-list', 'individual-table-charts', 'full-seating-chart', 'name-place-cards'],
  },
  {
    id: 'guest-list', name: 'Guest List & RSVP', shortName: 'Guest List & RSVP', path: '/guest-list', group: 'Plan & Organise', icon: Users, navigationIcon: productIconById['guest-list'],
    image: guestList, imageAlt: 'Wedding guest list and RSVP management screen', seoTitle: 'Wedding Guest List & RSVP Manager | Wedding Waitress',
    metaDescription: 'Manage individuals, couples and families, RSVP details, plus-ones, addresses, dietary needs, relationships and seating in one guest list.',
    h1: 'A guest list that powers the whole wedding', lead: 'Organise individuals, couples and families, then carry accurate guest information into invitations, tables, catering references and seating outputs.',
    demonstration: 'Track responses, contact and mailing details, relationships, plus-ones, dietary requirements, table assignments and seat numbers in one working list.',
    benefits: [
      { title: 'Households handled properly', text: 'Manage individuals, couples and family groups without losing the details that belong to each guest.' },
      { title: 'RSVP information together', text: 'Keep responses and supported invitation delivery information beside each guest record.' },
      { title: 'Ready for seating and service', text: 'Use the same guest data for tables, dietary lists, place cards and check-off charts.' },
    ],
    connects: 'Guest List & RSVP feeds Invitations & Cards, Tables, Dietary Requirements, QR Seating and printable seating documents.', related: ['invitations-cards', 'tables', 'dietary-requirements', 'qr-code-seating-chart'],
  },
  {
    id: 'floor-plan', name: 'Ceremony & Reception Floor Plans', shortName: 'Floor Plans', path: '/floor-plan', group: 'Plan & Organise', icon: PanelsTopLeft, navigationIcon: productIconById['floor-plan'],
    image: floorPlan, imageAlt: 'Wedding ceremony floor plan designer', seoTitle: 'Wedding Ceremony & Reception Floor Plans | Wedding Waitress',
    metaDescription: 'Design ceremony and reception floor plans with seating arrangements, bridal party, family sections, rows, chairs, tables and venue-ready PDF output.',
    h1: 'Plan the room before the day begins', lead: 'Create dedicated ceremony and reception layouts so the couple, wedding party, families, rows, chairs and tables make sense before guests arrive.',
    demonstration: 'Ceremony plans support couple positioning, bridal party and family sections, rows, capacity and aisle arrangement. Reception plans use your event’s real tables and seating information.',
    benefits: [
      { title: 'Two purpose-built layouts', text: 'Switch between ceremony and reception planning instead of forcing both into one generic diagram.' },
      { title: 'Practical ceremony detail', text: 'Arrange sides, wedding party, family sections, rows, chairs and the central aisle.' },
      { title: 'A venue-ready reference', text: 'Preview the complete layout and export the supported document for setup.' },
    ],
    connects: 'Reception floor plans draw on Tables and Guest List information; event details carry through from My Events.', related: ['tables', 'individual-table-charts', 'full-seating-chart'],
  },
  {
    id: 'qr-code-seating-chart', name: 'QR Code Seating Chart', shortName: 'QR Seating Chart', path: '/qr-code-seating-chart', group: 'Guest Experience', icon: QrCode, navigationIcon: productIconById['qr-code-seating-chart'],
    image: qr, imageAlt: 'Custom wedding QR code seating chart', seoTitle: 'QR Code Wedding Seating Chart | Wedding Waitress',
    metaDescription: 'Create a custom event QR code so guests can search their name and find their assigned wedding table or seat without downloading an app.',
    h1: 'Help every guest find their seat in seconds', lead: 'Create a unique event QR code that guests can scan from a sign, screen or stationery, then search their name and view their assigned table or seat.',
    demonstration: 'Customise the supported QR appearance, preview the guest lookup, and download the QR for digital display or print. Guests use a browser—there is no app to install.',
    benefits: [
      { title: 'Fast self-service lookup', text: 'Guests search for their name and see the seating information you choose to show.' },
      { title: 'Flexible display', text: 'Place the QR on signage or stationery, or present it on a digital screen.' },
      { title: 'Changes stay connected', text: 'Supported updates to guest and table assignments flow through to the lookup experience.' },
    ],
    connects: 'QR Seating reads from Guest List and Tables, and pairs naturally with Seating Chart Signs and Kiosk Live View.', related: ['seating-chart-signs', 'tables', 'kiosk-live-view'],
  },
  {
    id: 'kiosk-live-view', name: 'Kiosk Live View', shortName: 'Kiosk Live View', path: '/kiosk-live-view', group: 'Guest Experience', icon: MonitorSmartphone, navigationIcon: productIconById['kiosk-live-view'],
    image: kiosk, imageAlt: 'Wedding venue kiosk guest lookup screen', seoTitle: 'Wedding Kiosk Guest & Seating Lookup | Wedding Waitress',
    metaDescription: 'Let wedding guests search for their table or seat on a venue touchscreen, tablet, laptop, desktop kiosk or entrance display.',
    h1: 'A welcoming guest lookup for the venue entrance', lead: 'Open Wedding Waitress on a large touchscreen, tablet, laptop or desktop kiosk so arriving guests can search their name and find their table or seat.',
    demonstration: 'Use the kiosk URL and QR setup, copy or open the link, enter fullscreen mode and configure the guest information and supported Live View modules shown at the venue.',
    benefits: [
      { title: 'Designed for arrivals', text: 'Give guests a clear self-service lookup at the entrance or another convenient venue location.' },
      { title: 'Use the screen you have', text: 'Run the view on a touchscreen, tablet, laptop or desktop kiosk.' },
      { title: 'Useful beyond weddings', text: 'The same organised lookup can support engagements, corporate events, workshops and seminars.' },
    ],
    connects: 'Kiosk Live View uses the event’s Guest List and Tables, and complements QR Seating for guests using their own phones.', related: ['qr-code-seating-chart', 'guest-list', 'tables'],
  },
  {
    id: 'invitations-cards', name: 'Invitations, Save the Dates & Thank You Cards', shortName: 'Invitations & Cards', path: '/invitations-cards', group: 'Guest Experience', icon: Mail, navigationIcon: productIconById['invitations-cards'],
    image: invitations, imageAlt: 'Wedding invitation and card designer', seoTitle: 'Wedding Invitations, Save the Dates & Thank You Cards',
    metaDescription: 'Design wedding invitations, save the dates and thank you cards with custom text, backgrounds, QR codes, messages and print-ready exports.',
    h1: 'Create every card around the same wedding details', lead: 'Design invitations, save the dates and thank you cards with flexible text zones, backgrounds, QR placement and personal messages.',
    demonstration: 'Choose the card type, build with preset or custom text zones, personalise typography and background design, and prepare the result for digital use or supported print-ready export.',
    benefits: [
      { title: 'Three card types, one designer', text: 'Create invitations, save the dates and thank you cards in the same workspace.' },
      { title: 'Flexible personalisation', text: 'Control text zones, backgrounds, QR placement and personal messages.' },
      { title: 'Event details ready to use', text: 'Bring relevant event and guest information into the design without retyping everything.' },
    ],
    connects: 'Invitations & Cards connects with My Events, Guest List & RSVP and QR Seating information.', related: ['guest-list', 'qr-code-seating-chart', 'name-place-cards'],
  },
  {
    id: 'photo-video-sharing', name: 'Photo & Video Sharing', shortName: 'Photo & Video Sharing', path: '/photo-video-sharing', group: 'Guest Experience', icon: Camera, navigationIcon: productIconById['photo-video-sharing'],
    image: photoSharing, imageAlt: 'Wedding photo and video upload experience', seoTitle: 'Wedding Photo & Video Sharing, Guestbook & Booth',
    metaDescription: 'Collect guest photos and videos with QR upload, then bring them together with a gallery, digital guestbook, photo booth and live slideshow.',
    h1: 'Turn guest moments into one shared wedding experience', lead: 'Invite guests to upload photos and short videos by QR code, browse the gallery, leave guestbook messages, use the photo booth and enjoy a live slideshow.',
    demonstration: 'The five connected experiences can be enabled for your event and shared with guests through simple browser-based links and QR access.',
    benefits: [
      { title: 'Simple guest uploads', text: 'Let guests contribute photos and short videos from their phones through a QR code.' },
      { title: 'Memories in one gallery', text: 'Bring shared media into an event gallery for guests and the couple to enjoy.' },
      { title: 'More ways to participate', text: 'Add a digital guestbook, on-screen photo booth and live slideshow to the celebration.' },
    ],
    connects: 'Photo & Video Sharing brings upload, gallery, guestbook, photo booth and slideshow experiences together under one event.', related: ['invitations-cards', 'qr-code-seating-chart', 'running-sheet'],
  },
  {
    id: 'seating-chart-signs', name: 'Seating Chart Signs', shortName: 'Seating Chart Signs', path: '/seating-chart-signs', group: 'Print & Export', icon: SignpostBig, navigationIcon: productIconById['seating-chart-signs'],
    image: signs, imageAlt: 'Professional wedding seating chart signage', seoTitle: 'Wedding Seating Chart Signs & QR Signage',
    metaDescription: 'Design professional wedding seating charts, QR seating signs and supported event signage with print-ready PDFs and Australian print sizes.',
    h1: 'Professional wedding signage, ready for display', lead: 'Design seating and QR signage using your real event information, then prepare it for venue display with the product’s supported print formats.',
    demonstration: 'Create QR seating chart signage, seating charts and supported welcome, upload-station, guestbook or QR cards. Export print-ready PDFs with supported 300-DPI output and Australian standard sizes.',
    benefits: [
      { title: 'Built from live event details', text: 'Use your event and seating information as the foundation for accurate signage.' },
      { title: 'Designed for professional print', text: 'Work with the available print formats, Australian standard sizes and supported high-resolution output.' },
      { title: 'Digital and physical journeys meet', text: 'Place a QR lookup directly into signage guests can see at the venue.' },
    ],
    connects: 'Seating Chart Signs combines event information with QR Seating and the seating assignments created in Guest List and Tables.', related: ['qr-code-seating-chart', 'full-seating-chart', 'tables'],
  },
  {
    id: 'name-place-cards', name: 'Name Place Cards', shortName: 'Name Place Cards', path: '/name-place-cards', group: 'Print & Export', icon: ContactRound, navigationIcon: productIconById['name-place-cards'],
    image: placeCards, imageAlt: 'Foldable wedding name place card designer', seoTitle: 'Wedding Name Place Card Designer | Wedding Waitress',
    metaDescription: 'Design foldable wedding place cards with guest names, table and seat details, fonts, colours, backgrounds, QR codes and print-ready export.',
    h1: 'Place cards personalised from your seating plan', lead: 'Turn guest, table and seat information into foldable place cards with flexible typography, backgrounds, QR codes and personal messages.',
    demonstration: 'Style guest names and table details independently, choose fonts, sizes, colours and backgrounds, then preview the cards before supported print-ready export.',
    benefits: [
      { title: 'Accurate guest details', text: 'Use assigned names, tables and seat numbers from your connected planning data.' },
      { title: 'A design that feels yours', text: 'Control fonts, sizes, colours, styles, backgrounds, QR codes and messages.' },
      { title: 'Ready to fold and place', text: 'Prepare the supported print layout for professional printing or careful at-home production.' },
    ],
    connects: 'Name Place Cards uses Guest List and Tables assignments and can include your event’s QR experience.', related: ['tables', 'guest-list', 'invitations-cards'],
  },
  {
    id: 'individual-table-charts', name: 'Individual Table Charts', shortName: 'Individual Table Charts', path: '/individual-table-charts', group: 'Print & Export', icon: LayoutGrid, navigationIcon: productIconById['individual-table-charts'],
    image: tableCharts, imageAlt: 'Individual round table wedding seating chart', seoTitle: 'Individual Wedding Table Charts | Wedding Waitress',
    metaDescription: 'Generate separate round, square or long-table charts with guest names, seats, dietary details, relationships and print-ready PDF export.',
    h1: 'A clear seating chart for every table', lead: 'Generate a separate chart for each table, with the seating shape and guest details your venue team needs.',
    demonstration: 'Preview supported round, square and long-table formats with guest names, seat numbers, dietary requirements, relationships, typography and display options.',
    benefits: [
      { title: 'One chart per table', text: 'Give venue staff a focused reference instead of asking them to scan one crowded master plan.' },
      { title: 'Layouts that match the setup', text: 'Use supported round, square and long-table arrangements.' },
      { title: 'Useful guest context', text: 'Choose whether to show names, seats, dietary details and relationships.' },
    ],
    connects: 'Individual Table Charts are generated from the Guest List and Tables you already maintain.', related: ['tables', 'full-seating-chart', 'dietary-requirements'],
  },
  {
    id: 'full-seating-chart', name: 'Full Seating Chart', shortName: 'Full Seating Chart', path: '/full-seating-chart', group: 'Print & Export', icon: ClipboardCheck, navigationIcon: productIconById['full-seating-chart'],
    image: fullSeating, imageAlt: 'Complete printable wedding guest seating chart', seoTitle: 'Full Wedding Seating Chart & Check-Off List',
    metaDescription: 'Create a complete guest seating chart with table and seat details, check-off boxes, sorting, display options and multi-page PDF export.',
    h1: 'The complete guest seating reference', lead: 'Create a full, sortable guest chart with check-off boxes and the seating information your venue team needs from arrival through service.',
    demonstration: 'Choose sorting and display options for names, tables, seats, dietary requirements and relationships, then preview single- or multi-page supported output.',
    benefits: [
      { title: 'Every guest in one reference', text: 'See the complete seating list with practical check-off boxes.' },
      { title: 'Show the details that matter', text: 'Configure names, seats, dietary information and relationships where supported.' },
      { title: 'Built for longer lists', text: 'Use multi-page preview and PDF export when the guest count requires it.' },
    ],
    connects: 'Full Seating Chart combines Guest List records with Tables and seat assignments.', related: ['guest-list', 'tables', 'individual-table-charts'],
  },
  {
    id: 'dietary-requirements', name: 'Dietary Requirements', shortName: 'Dietary Requirements', path: '/dietary-requirements', group: 'Print & Export', icon: UtensilsCrossed, navigationIcon: productIconById['dietary-requirements'],
    image: dietary, imageAlt: 'Kitchen dietary requirements guest chart', seoTitle: 'Wedding Dietary Requirements List | Wedding Waitress',
    metaDescription: 'Prepare a clear dietary requirements reference with guest, table and seat details for venues, caterers and kitchen teams.',
    h1: 'A practical dietary reference for the team serving your guests', lead: 'Organise dietary needs alongside guest, table and seat details, then prepare a clear reference for the venue, caterer or kitchen team.',
    demonstration: 'Sort the list, choose supported display options and preview print-ready output that helps event staff identify each guest’s recorded requirements.',
    benefits: [
      { title: 'Guest context included', text: 'Keep names, contact details where configured, tables and seats beside the recorded dietary requirement.' },
      { title: 'Adapt the reference', text: 'Choose sorting and display options that suit the venue or kitchen workflow.' },
      { title: 'Easy to share with suppliers', text: 'Prepare the supported print-ready output for caterers, venues and kitchen staff.' },
    ],
    connects: 'Dietary Requirements uses Guest List details and Table assignments to create a useful service reference.', related: ['guest-list', 'tables', 'individual-table-charts'],
  },
  {
    id: 'dj-mc-questionnaire', name: 'DJ & MC Questionnaire', shortName: 'DJ & MC Questionnaire', path: '/dj-mc-questionnaire', group: 'Event-Day Planning', icon: Mic2, navigationIcon: productIconById['dj-mc-questionnaire'],
    image: djMc, imageAlt: 'Wedding DJ and MC questionnaire with music sections', seoTitle: 'Wedding DJ & MC Questionnaire | Wedding Waitress',
    metaDescription: 'Organise ceremony music, introductions, speeches, event songs, dinner music, dance music and do-not-play choices for your DJ and MC.',
    h1: 'Give your DJ and MC one organised brief', lead: 'Build a structured, central questionnaire covering the music, introductions, speeches and key moments that shape your wedding day.',
    demonstration: 'Work through ceremony and cocktail-hour music, bridal-party introductions, speeches, main-event songs, background dinner music, dance music, multicultural choices and the do-not-play list.',
    benefits: [
      { title: 'Nothing important buried in messages', text: 'Keep songs, names, links, notes and timing prompts in defined sections.' },
      { title: 'Built for collaboration', text: 'Use the supported share and questionnaire PDF controls to brief your DJ or MC.' },
      { title: 'Connect music to the schedule', text: 'Coordinate performance details with the Run Sheet for a more complete event-day plan.' },
    ],
    connects: 'The DJ & MC Questionnaire works closely with the Run Sheet and uses core event details from My Events.', related: ['running-sheet', 'my-events', 'invitations-cards'],
  },
  {
    id: 'running-sheet', name: 'Run Sheet', shortName: 'Run Sheet', path: '/running-sheet', group: 'Event-Day Planning', icon: ListChecks, navigationIcon: productIconById['running-sheet'],
    image: runSheet, imageAlt: 'Wedding run sheet schedule with time event and who columns', seoTitle: 'Wedding Run Sheet Planner | Wedding Waitress',
    metaDescription: 'Build a clear wedding run sheet with times, event descriptions and responsible people, then share or export it for vendors and your venue.',
    h1: 'Keep the wedding day moving to one shared timeline', lead: 'Arrange the schedule by time, describe each moment and record who is responsible so the couple, venue and suppliers can work from one plan.',
    demonstration: 'Add and reorder schedule rows across TIME, EVENT and WHO, then use the supported sharing and PDF controls for your venue, DJ, MC and other vendors.',
    benefits: [
      { title: 'A readable sequence', text: 'Keep ceremonies, photos, introductions, meals, speeches and formalities in chronological order.' },
      { title: 'Clear responsibility', text: 'Record who owns each moment so handovers are easier on the day.' },
      { title: 'Made to share', text: 'Use the available share and PDF controls to distribute the current schedule.' },
    ],
    connects: 'Run Sheet uses your event timing and pairs with the DJ & MC Questionnaire to keep music and formalities aligned.', related: ['dj-mc-questionnaire', 'my-events', 'floor-plan'],
  },
];

export const productById = (id: string) => publicProducts.find((product) => product.id === id);

export const productsByGroup = productGroups.map((name) => ({
  name,
  products: publicProducts.filter((product) => product.group === name),
}));

export const photoVideoSectionIds = ['sharing', 'gallery', 'guestbook', 'photo-booth', 'live-slideshow'] as const;
