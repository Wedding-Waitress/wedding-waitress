import { useEffect, useRef, useState } from 'react';
import type { PlaceCardSettings } from '@/hooks/usePlaceCardSettings';
import { useSignageImageFit } from '../Signage/useSignageImageFit';

export function placeCardImagePaper(type?: string) {
  if (type === 'full') return { label: 'Full place card', widthMm: 105, heightMm: 99 };
  if (type === 'full_front' || type === 'full_back') return { label: type === 'full_front' ? 'Place card front' : 'Place card back', widthMm: 105, heightMm: 49.5 };
  return null; // Decorative images remain uncropped within their own area.
}
const keyFor = (s: Partial<PlaceCardSettings> | null) => `${s?.event_id}|${s?.background_image_url}|${s?.background_image_type}|${s?.background_image_x_position ?? 50}|${s?.background_image_y_position ?? 50}`;
const decisionKey = (key: string) => `ww:place-card-image-fit:${key}`;
function readDecision(key: string): boolean | undefined {
  let value: string | null = null;
  try { value = localStorage.getItem(decisionKey(key)); } catch { /* Try tab storage. */ }
  if (value !== 'cover' && value !== 'contain') {
    try { value = sessionStorage.getItem(decisionKey(key)); } catch { /* Memory fallback. */ }
    if (value === 'cover' || value === 'contain') {
      try { localStorage.setItem(decisionKey(key), value); } catch { /* Keep tab-only choice. */ }
    }
  }
  return value === 'cover' ? true : value === 'contain' ? false : undefined;
}
export function usePlaceCardImageFit(settings: PlaceCardSettings | null, save: (updates: Partial<PlaceCardSettings>) => Promise<boolean>) {
  const { confirmFit, rememberFit, dialog } = useSignageImageFit();
  const [approvedKey, setApprovedKey] = useState<string | null>(null);
  const pendingUpload = useRef<ReturnType<typeof placeCardImagePaper>>(null);
  const decisions = useRef(new Map<string, boolean>());
  const rememberDecision = (key: string, approved: boolean) => {
    decisions.current.set(key, approved);
    try { localStorage.setItem(decisionKey(key), approved ? 'cover' : 'contain'); } catch {
      try { sessionStorage.setItem(decisionKey(key), approved ? 'cover' : 'contain'); } catch { /* Memory fallback. */ }
    }
  };
  const currentKey = keyFor(settings);
  const ensureFit = async (next = settings) => {
    const paper = placeCardImagePaper(next?.background_image_type);
    if (!paper || !next?.background_image_url) return true;
    const key = keyFor(next);
    const known = decisions.current.get(key) ?? readDecision(key);
    if (known !== undefined) {
      setApprovedKey(known ? key : null);
      return true; // Export the accepted crop or the unchanged, uncropped image.
    }
    const approved = await confirmFit(next.background_image_url, paper, next.background_image_x_position ?? 50, next.background_image_y_position ?? 50);
    if (approved) { rememberDecision(key, true); setApprovedKey(key); }
    return approved;
  };
  // Remember both choices across page visits, tabs and browser restarts. Changing
  // artwork, panel size or crop position has its own approval decision.
  useEffect(() => {
    let active = true;
    const paper = placeCardImagePaper(settings?.background_image_type);
    if (paper && settings?.background_image_url) {
      const known = decisions.current.get(currentKey) ?? readDecision(currentKey);
      if (known !== undefined) {
        setApprovedKey(known ? currentKey : null);
        return;
      }
      void confirmFit(settings.background_image_url, paper, settings.background_image_x_position ?? 50, settings.background_image_y_position ?? 50)
        .then(approved => {
          if (active) { rememberDecision(currentKey, approved); setApprovedKey(approved ? currentKey : null); }
        });
    }
    return () => { active = false; };
  }, [currentKey, confirmFit]);

  const beforeBackgroundUpload = async (file: File) => {
    const paper = placeCardImagePaper(settings?.background_image_type);
    pendingUpload.current = null;
    if (!paper) return true;
    const url = URL.createObjectURL(file);
    try {
      const approved = await confirmFit(url, paper);
      if (approved) pendingUpload.current = paper;
      return approved;
    } finally { URL.revokeObjectURL(url); }
  };
  const updateSettings = async (updates: Partial<PlaceCardSettings>) => {
    if (updates.background_image_url && updates.background_image_url !== settings?.background_image_url) {
      updates = { ...updates, background_image_x_position: 50, background_image_y_position: 50 };
      if (pendingUpload.current) rememberFit(updates.background_image_url, pendingUpload.current);
      pendingUpload.current = null;
    }
    const next = { ...settings, ...updates } as PlaceCardSettings;
    if (keyFor(next) !== currentKey && !await ensureFit(next)) return false;
    const saved = await save(updates);
    if (saved === false) setApprovedKey(approvedKey);
    return saved;
  };
  return { dialog, beforeBackgroundUpload, updateSettings, ensureFit, backgroundFit: approvedKey === currentKey ? 'cover' as const : 'contain' as const };
}
