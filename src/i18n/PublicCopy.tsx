import { usePublicCopy } from './usePublicCopy';
/** App-authored public text only; never use this for user-entered content. */
export function PublicCopy({ text }: { text: string }) {
  const translate = usePublicCopy();
  return <>{translate(text)}</>;
}
