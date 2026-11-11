export const cleanBlogProse = (text: string): string => {
  const clean = (value: string) => value
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/\s+-\s+/g, ', ')
    .replace(/(?<=[\p{L}\p{N}])[-‐‑](?=\p{L})/gu, ' ')
    .replace(/,\s*([,.;:!?])/g, '$1');
  let output = '', position = 0;
  const tokens = /\[([^\]]+)\]\(([^)]+)\)|https?:\/\/[^\s)]+/g;
  for (const match of text.matchAll(tokens)) {
    output += clean(text.slice(position, match.index));
    output += match[1] !== undefined ? `[${clean(match[1])}](${match[2]})` : match[0];
    position = match.index! + match[0].length;
  }
  return output + clean(text.slice(position));
};
export const cleanBlogPost = <T extends {title:string;metaTitle:string;metaDescription:string;excerpt:string;intro:string;sections:{heading:string;paragraphs:string[]}[];internalLinks:{label:string;href:string}[]}>(post:T):T => ({
  ...post, title:cleanBlogProse(post.title), metaTitle:cleanBlogProse(post.metaTitle), metaDescription:cleanBlogProse(post.metaDescription), excerpt:cleanBlogProse(post.excerpt), intro:cleanBlogProse(post.intro),
  sections:post.sections.map(section=>({...section,heading:cleanBlogProse(section.heading),paragraphs:section.paragraphs.map(cleanBlogProse).filter((paragraph,index,all)=>all.indexOf(paragraph)===index)})),
  internalLinks:post.internalLinks.map(link=>({...link,label:cleanBlogProse(link.label)})),
});
