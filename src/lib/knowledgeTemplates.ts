export const FAQ_TEMPLATES = {
  parking: {
    question: "Where can I park?",
    answer: "Free parking is available in the venue's main lot. Valet service is also available for $15."
  },
  dressCode: {
    question: "What's the dress code?",
    answer: "The dress code is semi-formal. We recommend cocktail attire."
  },
  gifts: {
    question: "Do you have a gift registry?",
    answer: "Your presence is the best gift! If you wish to give, we're registered at [Store Names]."
  },
  plusOnes: {
    question: "Can I bring a plus one?",
    answer: "Due to venue capacity, we can only accommodate guests formally invited. If your invitation says 'and guest', you're welcome to bring someone."
  },
  children: {
    question: "Can I bring my kids?",
    answer: "We love your little ones, but this is an adults-only celebration. We hope you'll enjoy a night off!"
  },
  rsvpDeadline: {
    question: "When is the RSVP deadline?",
    answer: "Please RSVP by [date]. You can respond via the QR code on your invitation."
  }
};

export const TIMELINE_TEMPLATES = {
  traditionalWedding: [
    { startTime: '17:30', endTime: '18:00', type: 'ceremony', details: 'Ceremony begins promptly. Please arrive 15 minutes early.' },
    { startTime: '18:00', endTime: '19:00', type: 'cocktails', details: 'Cocktails and appetizers on the terrace' },
    { startTime: '19:00', endTime: '20:30', type: 'dinner', details: 'Three-course dinner service' },
    { startTime: '20:30', endTime: '21:00', type: 'speeches', details: 'Toasts and speeches' },
    { startTime: '21:00', endTime: '23:00', type: 'dancing', details: 'Dancing and celebration' },
  ],
  cocktailReception: [
    { startTime: '18:00', endTime: '18:30', type: 'ceremony', details: 'Brief ceremony' },
    { startTime: '18:30', endTime: '21:00', type: 'cocktails', details: 'Cocktail reception with passed appetizers' },
    { startTime: '21:00', endTime: '22:00', type: 'dancing', details: 'Dancing and mingling' },
  ],
  gardenParty: [
    { startTime: '15:00', endTime: '15:30', type: 'ceremony', details: 'Outdoor garden ceremony' },
    { startTime: '15:30', endTime: '17:00', type: 'cocktails', details: 'Garden cocktails and lawn games' },
    { startTime: '17:00', endTime: '19:00', type: 'dinner', details: 'Outdoor dinner service' },
    { startTime: '19:00', endTime: '21:00', type: 'dancing', details: 'Dancing under the stars' },
  ]
};

export const VENDOR_ICONS: Record<string, string> = {
  photographer: '📸',
  videographer: '🎥',
  dj: '🎵',
  caterer: '🍽️',
  florist: '💐',
  planner: '📋',
  makeup: '💄',
  other: '🔧'
};
