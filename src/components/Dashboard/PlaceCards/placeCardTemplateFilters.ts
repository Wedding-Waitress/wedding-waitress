import type { GalleryImage } from '@/hooks/usePlaceCardGallery';

const COLOUR_TERMS = [
  ['Black', /\bblack\b/i], ['Blue', /\b(?:blue|navy|teal|aqua|turquoise)\b/i],
  ['Brown', /\b(?:brown|chocolate|mocha|tan|rust|timber|wood(?:en)?)\b/i], ['Cream', /\b(?:cream|ivory|beige)\b/i],
  ['Gold', /\b(?:gold|golden)\b/i], ['Green', /\b(?:green|sage|olive|eucalyptus)\b/i],
  ['Orange', /\b(?:orange|peach|coral|terracotta)\b/i], ['Pink', /\b(?:pink|blush|rose|mauve)\b/i],
  ['Purple', /\b(?:purple|lavender|lilac|violet)\b/i], ['Red', /\b(?:red|burgundy|maroon|crimson)\b/i],
  ['White', /\bwhite\b/i], ['Yellow', /\b(?:yellow|lemon|sunshine)\b/i],
] as const;
export const getPlaceCardDesignColour = (image: Pick<GalleryImage, 'name'>) => {
  const matches = COLOUR_TERMS.filter(([, pattern]) => pattern.test(image.name));
  if (matches.length > 1) return 'Multicolour';
  return matches[0]?.[0] ?? 'Neutral';
};
