export interface BlogPostSection {
  heading: string;
  paragraphs: string[];
}

export interface BlogPostLink {
  label: string;
  href: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  date: string;
  readingTime: string;
  coverEmoji: string;
  intro: string;
  sections: BlogPostSection[];
  internalLinks: BlogPostLink[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'qr-code-wedding-seating-chart-australia',
    title: 'QR Code Wedding Seating Chart in Australia: The Modern Way to Seat Guests',
    metaTitle: 'QR Code Wedding Seating Chart Australia | Modern Guest Seating',
    metaDescription:
      'Discover how a QR code wedding seating chart helps Australian couples seat guests faster, save money, and create a modern, paperless wedding experience.',
    excerpt:
      'Skip the giant printed board. Learn how a QR code wedding seating chart works in Australia, what it costs, and why couples are switching.',
    date: '2026-04-10',
    readingTime: '6 min read',
    coverEmoji: '📱',
    intro:
      'Printed seating boards are beautiful — but they are also expensive, easy to misread, and a nightmare to update at the last minute. A QR code wedding seating chart solves all three problems and gives your guests a smoother arrival experience.',
    sections: [
      {
        heading: 'What is a QR code wedding seating chart?',
        paragraphs: [
          'A QR code wedding seating chart is a single QR code (usually displayed on a sign at the venue entrance) that guests scan with their phone. Within seconds, they see their name, table number, and seat — no scanning a giant board for their initial.',
          'Behind the scenes, your guest list is connected to your tables in a wedding guest list manager, so any changes you make on the day are reflected instantly when guests scan the code.',
        ],
      },
      {
        heading: 'Why Australian couples are switching',
        paragraphs: [
          'Most printed seating signs in Australia cost between $150 and $400, and they cannot be edited once printed. With a QR code seating chart, you only need a small printed sign — the rest lives online.',
          'It is also far more accessible: guests with poor eyesight can pinch to zoom, and guests in wheelchairs do not need to push through a crowd at the entrance.',
        ],
      },
      {
        heading: 'How to set one up in under 30 minutes',
        paragraphs: [
          'Import your guest list, create your tables, drag guests onto each table, then generate your QR code. Print it onto a small sign at the entrance. Done.',
          'If a guest cancels at the last minute, just reassign their seat from your phone — the QR code never changes, but the result does.',
        ],
      },
    ],
    internalLinks: [
      { label: 'QR Code Seating Chart', href: '/products/qr-code-seating-chart' },
      { label: 'Guest List Manager', href: '/products/guest-list' },
      { label: 'Tables & Seating', href: '/products/tables' },
    ],
  },
  {
    slug: 'wedding-signage-cost-australia',
    title: 'Wedding Signage Cost in Australia: What to Expect (and How to Save)',
    metaTitle: 'Wedding Signage Cost Australia | Save on Welcome & Seating Signs',
    metaDescription:
      'A complete breakdown of wedding signage costs in Australia — welcome signs, seating boards, table numbers — plus practical ways to save without losing style.',
    excerpt:
      'A clear breakdown of what wedding signage actually costs in Australia, and the smart swaps couples are using to save hundreds.',
    date: '2026-04-08',
    readingTime: '5 min read',
    coverEmoji: '💰',
    intro:
      'Wedding signage is one of those line items that quietly grows. Welcome sign, seating board, table numbers, menu cards, bar sign — it adds up. Here is what to expect in Australia in 2026, and where you can cut costs without losing the look.',
    sections: [
      {
        heading: 'Average wedding signage costs in Australia',
        paragraphs: [
          'Welcome signs typically run $120–$300, seating charts $180–$450, table numbers $5–$15 each, and menu cards $3–$8 per guest. For a 100-guest wedding, expect to spend $700–$1,500 on signage alone.',
          'Acrylic and mirror signs sit at the higher end. Foam-board and printed paper sit at the lower end but still look beautiful with the right typography.',
        ],
      },
      {
        heading: 'Where to save without compromising',
        paragraphs: [
          'Replace the printed seating board with a QR code wedding seating chart. You keep one small sign at the entrance, and guests find their table in seconds.',
          'Use a digital running sheet for your bridal party and vendors instead of printing copies. Updates are instant and nothing gets lost in a suit pocket.',
        ],
      },
      {
        heading: 'What is worth spending on',
        paragraphs: [
          'A beautiful welcome sign sets the tone of the day and shows up in nearly every photo guests take on arrival. This is one piece worth investing in.',
          'Custom name place cards also pay off — they help guests feel personally welcomed and double as a small keepsake.',
        ],
      },
    ],
    internalLinks: [
      { label: 'QR Code Seating Chart', href: '/products/qr-code-seating-chart' },
      { label: 'Name Place Cards', href: '/products/name-place-cards' },
      { label: 'Running Sheet', href: '/products/running-sheet' },
    ],
  },
  {
    slug: 'how-to-create-qr-code-seating-chart',
    title: 'How to Create a QR Code Seating Chart for Your Wedding (Step-by-Step)',
    metaTitle: 'How to Create a QR Code Seating Chart | Wedding Step-by-Step Guide',
    metaDescription:
      'Step-by-step guide to creating a QR code seating chart for your wedding. Import guests, build tables, generate the code, and print your sign.',
    excerpt:
      'A simple step-by-step guide to building your own QR code seating chart — from guest list to printed sign — in under an hour.',
    date: '2026-04-05',
    readingTime: '7 min read',
    coverEmoji: '✨',
    intro:
      'You do not need to be tech-savvy to set up a QR code seating chart. The whole process takes under an hour, and once it is live, all updates happen automatically. Here is exactly how to do it.',
    sections: [
      {
        heading: 'Step 1 — Import your guest list',
        paragraphs: [
          'Start with a clean guest list. You can paste names from a spreadsheet or add them one by one in a wedding guest list manager. Track RSVPs as you go so you only seat guests who have confirmed.',
          'Group guests by family or by side of the wedding so that drag-and-drop seating is easier later.',
        ],
      },
      {
        heading: 'Step 2 — Create your tables',
        paragraphs: [
          'Add each table with a name, number, and capacity. Round tables typically seat 8–10, long banquet tables seat 12–24.',
          'You can mix and match table shapes — most planning tools let you label your bridal table separately so it stands out.',
        ],
      },
      {
        heading: 'Step 3 — Drag guests to tables',
        paragraphs: [
          'Drag each guest onto a table. The system will warn you if you exceed capacity, so you avoid awkward last-minute squeezing.',
          'Save dietary requirements at the same time — it makes catering coordination far simpler.',
        ],
      },
      {
        heading: 'Step 4 — Generate your QR code and print',
        paragraphs: [
          'Customise the colours and shape of your QR code to match your wedding palette, then download a high-resolution PNG. Print it on a small acrylic, foam-board, or paper sign for the venue entrance.',
          'On the day, guests scan, search their name, and instantly see their table and seat. If anything changes, just reassign the guest from your phone.',
        ],
      },
    ],
    internalLinks: [
      { label: 'QR Code Seating Chart', href: '/products/qr-code-seating-chart' },
      { label: 'Guest List Manager', href: '/products/guest-list' },
      { label: 'Tables & Seating', href: '/products/tables' },
      { label: 'Full Seating Chart', href: '/products/full-seating-chart' },
    ],
  },
];

export const getBlogPostBySlug = (slug: string): BlogPost | undefined =>
  BLOG_POSTS.find((p) => p.slug === slug);
