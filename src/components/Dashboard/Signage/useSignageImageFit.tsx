import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/enhanced-button';
import { signageImageCrop, type SignPaper } from '@/lib/signageImageFit';
import { toast } from '@/hooks/use-toast';

interface FitRequest { url: string; paper: SignPaper; imageWidth: number; imageHeight: number; x: number; y: number; key: string; }
const fitKey = (url: string, paper: SignPaper, x: number, y: number) => `${url}|${paper.widthMm}|${paper.heightMm}|${x}|${y}`;

export function useSignageImageFit() {
  const [request, setRequest] = useState<FitRequest | null>(null);
  const pending = useRef<((approved: boolean) => void) | null>(null);
  const approvals = useRef(new Set<string>());
  const version = useRef(0);
  const settle = useCallback((approved: boolean) => {
    if (approved && request) approvals.current.add(request.key);
    pending.current?.(approved);
    pending.current = null;
    setRequest(null);
  }, [request]);
  useEffect(() => () => { version.current++; pending.current?.(false); }, []);
  const rememberFit = useCallback((url: string, paper: SignPaper, x = 50, y = 50) => {
    approvals.current.add(fitKey(url, paper, x, y));
  }, []);
  const confirmFit = useCallback(async (url: string, paper: SignPaper, x = 50, y = 50): Promise<boolean> => {
    const key = fitKey(url, paper, x, y);
    if (approvals.current.has(key)) return true;
    const currentVersion = ++version.current;
    pending.current?.(false);
    pending.current = null;
    setRequest(null);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      if (version.current !== currentVersion) return false;
      const crop = signageImageCrop(image.naturalWidth, image.naturalHeight, paper, x, y);
      if (!crop.needsApproval) return true;
      return new Promise<boolean>(resolve => {
        pending.current = resolve;
        setRequest({ url, paper, imageWidth: image.naturalWidth, imageHeight: image.naturalHeight, x, y, key });
      });
    } catch {
      toast({ title: 'Image could not be checked', description: 'Please choose a valid image and try again.', variant: 'destructive' });
      return false;
    }
  }, []);
  const crop = request && signageImageCrop(request.imageWidth, request.imageHeight, request.paper, request.x, request.y);
  const dialog = request && crop ? (
    <Dialog open onOpenChange={open => { if (!open) settle(false); }}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto text-foreground" style={{ zIndex: 130 }} overlayClassName="z-[125]">
        <DialogHeader>
          <DialogTitle className="pr-10">Fit your image to {request.paper.label}</DialogTitle>
          <DialogDescription>
            This image has different proportions from {request.paper.label} ({request.paper.widthMm} × {request.paper.heightMm} mm).
            Wedding Waitress can fill the sheet without white edges by cropping the shaded areas below. Your original image will stay unchanged.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
          <figure className="space-y-2">
            <figcaption className="text-sm font-medium">Original image — shaded areas will be cropped</figcaption>
            <div className="relative overflow-hidden mx-auto" style={{ width: `min(100%, ${280 * request.imageWidth / request.imageHeight}px)` }}>
              <img src={request.url} alt="Original image with proposed crop" className="block w-full h-auto" />
              <div data-signage-crop-window className="absolute border-2 border-white" style={{ left: `${crop.left}%`, top: `${crop.top}%`, width: `${crop.width}%`, height: `${crop.height}%`, boxShadow: '0 0 0 999px rgba(0,0,0,0.55)' }} />
            </div>
          </figure>
          <figure className="space-y-2">
            <figcaption className="text-sm font-medium">Background after fitting</figcaption>
            <div data-signage-fit-preview role="img" aria-label={`Fitted ${request.paper.label} background`} className="mx-auto max-w-full" style={{ width: 280 * request.paper.widthMm / request.paper.heightMm, aspectRatio: `${request.paper.widthMm} / ${request.paper.heightMm}`, backgroundImage: `url(${request.url})`, backgroundSize: 'cover', backgroundPosition: `${request.x}% ${request.y}%` }} />
          </figure>
        </div>
        <p className="text-sm text-muted-foreground">Approve this crop, or cancel and upload an image prepared in the same proportions as your chosen paper.</p>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => settle(false)}>Cancel and upload another image</Button>
          <Button variant="success" onClick={() => settle(true)}>Adjust to fit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ) : null;
  return { confirmFit, rememberFit, dialog };
}
