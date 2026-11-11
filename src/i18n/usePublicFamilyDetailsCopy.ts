import { publicGuestUpdateHeadingRows } from './publicGuestUpdateHeadingCopy';
import { publicRsvpBadgeRows } from './publicRsvpBadgeCopy';
import { useTranslation } from 'react-i18next';
import { publicFamilyDetailsRows } from './publicFamilyDetailsCopy';
export function usePublicFamilyDetailsCopy() {
  const { i18n } = useTranslation();
  const language = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];
  const [update, updating, saveSwitch, discardSwitch, switchWarning] = publicFamilyDetailsRows[language] || publicFamilyDetailsRows.en;
  const [yes, no] = publicRsvpBadgeRows[language] || publicRsvpBadgeRows.en;
  const [updateBelow] = publicGuestUpdateHeadingRows[language] || publicGuestUpdateHeadingRows.en;
  return { update, updating, saveSwitch, discardSwitch, switchWarning, yes, no, updateBelow };
}
