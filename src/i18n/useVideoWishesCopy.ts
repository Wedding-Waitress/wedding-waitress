import {useTranslation} from 'react-i18next';
import {videoWishesKeys,publicVideoWishesRows} from './publicVideoWishesCopy';
export function useVideoWishesCopy(){const {i18n}=useTranslation();const language=(i18n.resolvedLanguage||i18n.language||'en').split('-')[0];return {copy:Object.fromEntries(videoWishesKeys.map((key,index)=>[key,(publicVideoWishesRows[language]||publicVideoWishesRows.en)[index]])) as Record<typeof videoWishesKeys[number],string>,language};}
