import React, { useState, useEffect, useMemo, useRef } from 'react';
import { StatsBar } from "@/components/Dashboard/StatsBar";
import { DashboardSidebar } from "@/components/Dashboard/DashboardSidebar";
import { MyEventsPage } from "@/components/Dashboard/MyEventsPage";
import { GuestListTable } from "@/components/Dashboard/GuestListTable";
import { CreateTableModal } from "@/components/Dashboard/CreateTableModal";
import { TableCard } from "@/components/Dashboard/TableCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/enhanced-button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Calendar, 
  Users, 
  MapPin, 
  QrCode, 
  Mail,
  Heart,
  Settings,
  TrendingUp,
  Plus,
  Copy,
  Download,
  Printer,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap
} from "lucide-react";
import QRCodeLib from 'qrcode';
import QrScanner from 'qr-scanner';
import { useEvents } from '@/hooks/useEvents';
import { useTables, TableWithGuestCount } from '@/hooks/useTables';
import { useRealtimeGuests } from '@/hooks/useRealtimeGuests';
import { useRealtimeTables } from '@/hooks/useRealtimeTables';
import { useProfile } from '@/hooks/useProfile';

export const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showCreateTableModal, setShowCreateTableModal] = useState(false);
  const [editingTable, setEditingTable] = useState<TableWithGuestCount | null>(null);
  const [qrSelectedEventId, setQrSelectedEventId] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  
  // QR Code design state
  const [qrModuleShape, setQrModuleShape] = useState<'square' | 'round'>('square');
  const [qrForegroundColor, setQrForegroundColor] = useState('#000000');
  const [qrBackgroundColor, setQrBackgroundColor] = useState('#ffffff');
  const [qrFinderStyle, setQrFinderStyle] = useState<'standard' | 'rounded'>('standard');
  const [qrContrastWarning, setQrContrastWarning] = useState<string>('');
  const [qrFrameEnabled, setQrFrameEnabled] = useState<boolean>(false);
  const [qrFrameStyle, setQrFrameStyle] = useState<'rounded' | 'square'>('rounded');
  const [qrFrameColor, setQrFrameColor] = useState('#e5e7eb');
  const [qrLabelText, setQrLabelText] = useState('Scan to find your seat');
  const [qrLogo, setQrLogo] = useState<File | null>(null);
  const [qrLogoDataUrl, setQrLogoDataUrl] = useState<string>('');
  const [qrLogoMask, setQrLogoMask] = useState<'square' | 'round'>('round');
  const [qrLogoSize, setQrLogoSize] = useState<number>(15); // Percentage of QR area
  const [qrBgImage, setQrBgImage] = useState<File | null>(null);
  const [qrBgImageDataUrl, setQrBgImageDataUrl] = useState<string>('');
  const [qrBgPreset, setQrBgPreset] = useState<string>('');
  const [qrBgFitMode, setQrBgFitMode] = useState<'cover' | 'contain' | 'tile'>('cover');
  const [qrBgScrim, setQrBgScrim] = useState<number>(40); // Percentage overlay
  const [qrBgAutoContrast, setQrBgAutoContrast] = useState<boolean>(true);
  const [qrBgApplyToLiveView, setQrBgApplyToLiveView] = useState<boolean>(false);
  const [scannabilityResults, setScannabilityResults] = useState<{
    small: 'pass' | 'warn' | 'fail' | 'testing',
    medium: 'pass' | 'warn' | 'fail' | 'testing',
    large: 'pass' | 'warn' | 'fail' | 'testing'
  }>({ small: 'testing', medium: 'testing', large: 'testing' });
  const [isTestingScannability, setIsTestingScannability] = useState<boolean>(false);
  const [showLivePreview, setShowLivePreview] = useState<boolean>(false);
  const [previewDevice, setPreviewDevice] = useState<'phone' | 'tablet' | 'desktop'>('phone');
  const [previewOrientation, setPreviewOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [previewLanguage, setPreviewLanguage] = useState<'en' | 'es' | 'fr'>('en');
  const [previewFontSize, setPreviewFontSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('md');
  const [previewHighContrast, setPreviewHighContrast] = useState<boolean>(false);
  const [previewSearch, setPreviewSearch] = useState<string>('');
  const [previewResults, setPreviewResults] = useState<any[]>([]);
  const { 
    events, 
    loading: eventsLoading, 
    activeEventId: eventsActiveEventId, 
    setActiveEventId: setEventsActiveEventId,
    refetch: refetchEvents 
  } = useEvents();
  const { profile } = useProfile();
  const { 
    tables: rawTables, 
    loading: tablesLoading, 
    createTable, 
    updateTable, 
    deleteTable,
    fetchTables
  } = useTables(selectedEventId);
  
  // Real-time guest management
  const { 
    guests, 
    loading: guestsLoading, 
    moveGuest 
  } = useRealtimeGuests(selectedEventId);
  
  // Real-time tables with live guest counts
  const { 
    tables, 
    getGuestsForTable: getRealtimeGuestsForTable 
  } = useRealtimeTables({
    tables: rawTables,
    guests,
    onRefreshTables: fetchTables
  });

  // QR Code cards data hooks
  const { 
    tables: qrTables, 
    loading: qrTablesLoading, 
    fetchTables: fetchQrTables
  } = useTables(qrSelectedEventId);
  
  const { 
    guests: qrGuests, 
    loading: qrGuestsLoading 
  } = useRealtimeGuests(qrSelectedEventId);

  // Get selected event for tables
  const selectedEvent = selectedEventId ? events.find(e => e.id === selectedEventId) : null;
  
  // Get selected event for My Events countdown (use events active event)
  const selectedCountdownEvent = eventsActiveEventId ? events.find(e => e.id === eventsActiveEventId) : null;

  // Load selected event from localStorage on mount
  useEffect(() => {
    const savedEventId = localStorage.getItem('active_event_id');
    if (savedEventId && events.find(e => e.id === savedEventId)) {
      setSelectedEventId(savedEventId);
    }
  }, [events]);

  // Maintain a stable ref to fetchTables to avoid effect re-installs
  const fetchTablesRef = useRef(fetchTables);
  useEffect(() => {
    fetchTablesRef.current = fetchTables;
  }, [fetchTables]);

  // Listen for custom events from AddGuestModal with debounced refresh
  useEffect(() => {
    let timer: number | null = null;

    const trigger = () => {
      if (!selectedEventId) return;
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        fetchTablesRef.current?.();
        timer = null;
      }, 250);
    };

    const handleGuestAdded = () => trigger();
    const handleGuestUpdated = () => trigger();

    window.addEventListener('guest-added', handleGuestAdded);
    window.addEventListener('guest-updated', handleGuestUpdated);

    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener('guest-added', handleGuestAdded);
      window.removeEventListener('guest-updated', handleGuestUpdated);
    };
  }, [selectedEventId]);

  // Handle event selection for tables
  const handleEventSelect = (eventId: string) => {
    setSelectedEventId(eventId);
    localStorage.setItem('active_event_id', eventId);
  };

  // Handle event selection for QR cards
  const handleQrEventSelect = (eventId: string) => {
    setQrSelectedEventId(eventId);
    setLastSyncTime(new Date());
  };

  // Get selected QR event
  const selectedQrEvent = qrSelectedEventId ? events.find(e => e.id === qrSelectedEventId) : null;

  // Handle logo upload
  const handleLogoUpload = (file: File) => {
    if (file && (file.type === 'image/png' || file.type === 'image/jpeg' || file.type === 'image/webp')) {
      setQrLogo(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setQrLogoDataUrl(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setQrLogo(null);
    setQrLogoDataUrl('');
  };

  // Background presets
  const bgPresets = [
    { id: 'gradient1', name: 'Ocean Blue', url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiM0RjQ2RTUiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiMyRUQ1Nzki Lz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2cpIi8+PC9zdmc+' },
    { id: 'gradient2', name: 'Sunset', url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNGRjU5MzMiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNGRkJENjMiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2cpIi8+PC9zdmc+' },
    { id: 'gradient3', name: 'Forest', url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiMxNkE0MkUiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiM2NkJCNkEiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2cpIi8+PC9zdmc+' },
    { id: 'gradient4', name: 'Rose Gold', url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNGRjc5N0MiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNGRkRERDAiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2cpIi8+PC9zdmc+' },
    { id: 'pattern1', name: 'Dots', url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZG90cyIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIj48Y2lyY2xlIGN4PSIxMCIgY3k9IjEwIiByPSIyIiBmaWxsPSIjRTJFOEYwIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2RvdHMpIi8+PC9zdmc+' },
    { id: 'pattern2', name: 'Lines', url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0ibGluZXMiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGxpbmUgeDE9IjAiIHkxPSIxMCIgeDI9IjIwIiB5Mj0iMTAiIHN0cm9rZT0iI0UyRThGMCIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2xpbmVzKSIvPjwvc3ZnPg==' },
    { id: 'solid1', name: 'Light Gray', url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjRjNGNEY2Ii8+PC9zdmc+' },
    { id: 'solid2', name: 'Cream', url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjRkZGN0VEIi8+PC9zdmc+' },
    { id: 'marble', name: 'Marble', url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0ibWFyYmxlIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiPjxyZWN0IHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgZmlsbD0iI0Y5RkFGQiIvPjxwYXRoIGQ9Ik0wIDEwYzEwIDAgMjAtMTAgNDAgMTBzMzAtMTAgNDAtMTAiIHN0cm9rZT0iI0VERUZGNSIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI21hcmJsZSkiLz48L3N2Zz4=' },
    { id: 'geometric', name: 'Geometric', url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ2VvbWV0cmljIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiPjxyZWN0IHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgZmlsbD0iI0Y5RkFGQiIvPjxwb2x5Z29uIHBvaW50cz0iMjAsMTAgMzAsMzAgMTAsMzAiIGZpbGw9IiNFMkU4RjAiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ2VvbWV0cmljKSIvPjwvc3ZnPg==' }
  ];

  // Handle background image upload
  const handleBgImageUpload = (file: File) => {
    if (file && (file.type === 'image/png' || file.type === 'image/jpeg' || file.type === 'image/webp')) {
      setQrBgImage(file);
      setQrBgPreset(''); // Clear preset when uploading custom
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setQrBgImageDataUrl(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBgPresetSelect = (presetId: string) => {
    setQrBgPreset(presetId);
    setQrBgImage(null); // Clear custom upload
    const preset = bgPresets.find(p => p.id === presetId);
    if (preset) {
      setQrBgImageDataUrl(preset.url);
    }
  };

  const handleRemoveBgImage = () => {
    setQrBgImage(null);
    setQrBgImageDataUrl('');
    setQrBgPreset('');
  };

  // Generate QR code data
  const generateSeatFinderUrl = (event: any) => {
    if (!event) return '';
    const eventSlug = event.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return `${window.location.origin}/s/${eventSlug}`;
  };

  const seatFinderUrl = selectedQrEvent ? generateSeatFinderUrl(selectedQrEvent) : '';

  const [qrCodeSvg, setQrCodeSvg] = useState<string>('');

  // Test QR scannability at different sizes
  const testScannability = async () => {
    if (!qrCodeSvg || !seatFinderUrl) return;
    
    setIsTestingScannability(true);
    setScannabilityResults({ small: 'testing', medium: 'testing', large: 'testing' });
    
    const testSizes = [
      { name: 'small', size: 100 },
      { name: 'medium', size: 200 },
      { name: 'large', size: 400 }
    ];
    
    const results: any = {};
    
    for (const testSize of testSizes) {
      try {
        // Generate QR code as data URL for testing
        const testDataUrl = await QRCodeLib.toDataURL(seatFinderUrl, {
          errorCorrectionLevel: 'H',
          margin: 4,
          color: { dark: qrForegroundColor, light: qrBackgroundColor },
          width: testSize.size
        });
        
        // Create image element for scanning
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = testDataUrl;
        });
        
        // Try to decode the QR code
        try {
          const result = await QrScanner.scanImage(img);
          if (result === seatFinderUrl) {
            results[testSize.name] = 'pass';
          } else {
            results[testSize.name] = 'warn';
          }
        } catch (scanError) {
          results[testSize.name] = 'fail';
        }
      } catch (error) {
        results[testSize.name] = 'fail';
      }
    }
    
    setScannabilityResults(results);
    setIsTestingScannability(false);
  };

  // Auto-fix scannability issues
  const handleFixScannability = () => {
    // Increase contrast
    const contrastRatio = getContrastRatio(qrForegroundColor, qrBackgroundColor);
    if (contrastRatio < 7) {
      setQrForegroundColor('#000000');
      setQrBackgroundColor('#ffffff');
    }
    
    // Enable frame for better quiet zone
    if (!qrFrameEnabled) {
      setQrFrameEnabled(true);
      setQrFrameColor('#ffffff');
    }
    
    // Remove background image if it affects scannability
    if (qrBgImageDataUrl) {
      setQrBgScrim(Math.max(qrBgScrim, 60));
      setQrBgAutoContrast(true);
    }
    
    // Reset logo size if too large
    if (qrLogoSize > 15) {
      setQrLogoSize(15);
    }
    
    setTimeout(() => {
      testScannability();
    }, 500);
  };

  // Test scannability when QR changes
  useEffect(() => {
    if (qrCodeSvg && seatFinderUrl) {
      const timer = setTimeout(() => {
        testScannability();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [qrCodeSvg, seatFinderUrl]);

  // Handle preview search
  useEffect(() => {
    if (previewSearch.length >= 2 && qrGuests.length > 0) {
      const filtered = qrGuests.filter(guest => 
        `${guest.first_name} ${guest.last_name}`.toLowerCase().includes(previewSearch.toLowerCase()) ||
        guest.first_name.toLowerCase().includes(previewSearch.toLowerCase()) ||
        (guest.last_name && guest.last_name.toLowerCase().includes(previewSearch.toLowerCase()))
      );
      setPreviewResults(filtered);
    } else {
      setPreviewResults([]);
    }
  }, [previewSearch, qrGuests]);

  // Get device frame dimensions
  const getDeviceFrame = () => {
    const orientation = previewOrientation;
    switch (previewDevice) {
      case 'phone':
        return orientation === 'portrait' 
          ? { width: '375px', height: '667px' }
          : { width: '667px', height: '375px' };
      case 'tablet':
        return orientation === 'portrait'
          ? { width: '768px', height: '1024px' }
          : { width: '1024px', height: '768px' };
      case 'desktop':
        return { width: '1200px', height: '800px' };
      default:
        return { width: '375px', height: '667px' };
    }
  };

  const handleOpenNewWindow = () => {
    const newWindow = window.open('', '_blank', 'width=800,height=600');
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head>
            <title>Live Preview - ${selectedQrEvent?.name || 'Event'}</title>
            <style>
              body { margin: 0; font-family: system-ui, sans-serif; }
              .container { padding: 20px; max-width: 600px; margin: 0 auto; }
              .search { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 20px; }
              .result { padding: 12px; border: 1px solid #eee; border-radius: 6px; margin-bottom: 8px; }
              .name { font-weight: bold; margin-bottom: 4px; }
              .table { color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2>Find Your Seat</h2>
              <input class="search" placeholder="Enter your name..." readonly />
              <div class="result">
                <div class="name">John Smith</div>
                <div class="table">Table 5, Seat 3</div>
              </div>
            </div>
          </body>
        </html>
      `);
      newWindow.document.close();
    }
  };

  // Check contrast between two colors
  const getContrastRatio = (color1: string, color2: string): number => {
    const getLuminance = (hex: string): number => {
      const rgb = parseInt(hex.slice(1), 16);
      const r = ((rgb >> 16) & 0xff) / 255;
      const g = ((rgb >> 8) & 0xff) / 255;
      const b = (rgb & 0xff) / 255;
      
      const sRGB = [r, g, b].map(c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
      return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
    };

    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    
    return (brightest + 0.05) / (darkest + 0.05);
  };

  // Validate contrast and update warning
  useEffect(() => {
    const contrast = getContrastRatio(qrForegroundColor, qrBackgroundColor);
    if (contrast < 3) {
      setQrContrastWarning('Low contrast detected. QR code may not scan properly. Minimum recommended contrast ratio is 3:1.');
    } else {
      setQrContrastWarning('');
    }
  }, [qrForegroundColor, qrBackgroundColor]);

  // Generate QR code SVG
  useEffect(() => {
    if (seatFinderUrl) {
      const qrOptions = {
        type: 'svg' as const,
        errorCorrectionLevel: 'H' as const,
        margin: 4, // Keep 4-module quiet zone
        color: {
          dark: qrForegroundColor,
          light: qrBackgroundColor
        },
        width: 200
      };

      QRCodeLib.toString(seatFinderUrl, qrOptions)
        .then((svg) => {
          let processedSvg = svg;
          
          // Apply module shape modifications if needed
          if (qrModuleShape === 'round') {
            // Convert squares to circles while preserving timing patterns and finders
            processedSvg = processedSvg.replace(
              /<rect[^>]*class="[^"]*"[^>]*>/g,
              (match) => {
                // Skip finder patterns and timing patterns
                if (match.includes('finder') || match.includes('timing')) {
                  return match;
                }
                // Convert regular modules to circles
                const x = match.match(/x="([^"]*)"/)![1];
                const y = match.match(/y="([^"]*)"/)![1];
                const width = match.match(/width="([^"]*)"/)![1];
                const fill = match.match(/fill="([^"]*)"/)![1];
                return `<circle cx="${parseFloat(x) + parseFloat(width) / 2}" cy="${parseFloat(y) + parseFloat(width) / 2}" r="${parseFloat(width) / 2}" fill="${fill}"/>`;
              }
            );
          }
          
          // Add frame and label if enabled
          if (qrFrameEnabled) {
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(processedSvg, 'image/svg+xml');
            const svgElement = svgDoc.querySelector('svg');
            
            if (svgElement) {
              const originalWidth = parseInt(svgElement.getAttribute('width') || '200');
              const originalHeight = parseInt(svgElement.getAttribute('height') || '200');
              
              // Increase canvas size for frame and label
              const frameSize = 240;
              const labelHeight = 30;
              const totalHeight = frameSize + labelHeight + 20; // padding
              
              svgElement.setAttribute('width', frameSize.toString());
              svgElement.setAttribute('height', totalHeight.toString());
              svgElement.setAttribute('viewBox', `0 0 ${frameSize} ${totalHeight}`);
              
              // Create frame
              const frameRect = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'rect');
              frameRect.setAttribute('x', '10');
              frameRect.setAttribute('y', '10');
              frameRect.setAttribute('width', (frameSize - 20).toString());
              frameRect.setAttribute('height', (frameSize - 20).toString());
              frameRect.setAttribute('fill', 'none');
              frameRect.setAttribute('stroke', qrFrameColor);
              frameRect.setAttribute('stroke-width', '2');
              if (qrFrameStyle === 'rounded') {
                frameRect.setAttribute('rx', '12');
                frameRect.setAttribute('ry', '12');
              }
              
              // Move existing QR content to center within frame
              const existingContent = svgElement.querySelector('g') || svgElement;
              const offsetX = (frameSize - originalWidth) / 2;
              const offsetY = (frameSize - originalHeight) / 2 + 10;
              
              if (existingContent.tagName === 'g') {
                existingContent.setAttribute('transform', `translate(${offsetX}, ${offsetY})`);
              } else {
                // Wrap all direct children in a group and translate
                const group = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'g');
                group.setAttribute('transform', `translate(${offsetX}, ${offsetY})`);
                
                const children = Array.from(svgElement.children);
                children.forEach(child => {
                  if (child !== frameRect) {
                    group.appendChild(child);
                  }
                });
                svgElement.appendChild(group);
              }
              
              // Add frame first (so it appears behind QR)
              svgElement.insertBefore(frameRect, svgElement.firstChild);
              
              // Add label
              const labelText = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'text');
              labelText.setAttribute('x', (frameSize / 2).toString());
              labelText.setAttribute('y', (frameSize + 25).toString());
              labelText.setAttribute('text-anchor', 'middle');
              labelText.setAttribute('font-family', 'system-ui, sans-serif');
              labelText.setAttribute('font-size', '12');
              labelText.setAttribute('fill', qrForegroundColor);
              labelText.textContent = qrLabelText;
              svgElement.appendChild(labelText);
              
              processedSvg = new XMLSerializer().serializeToString(svgDoc);
            }
          }
          
          // Add background image if present
          if (qrBgImageDataUrl) {
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(processedSvg, 'image/svg+xml');
            const svgElement = svgDoc.querySelector('svg');
            
            if (svgElement) {
              const svgWidth = parseInt(svgElement.getAttribute('width') || '200');
              const svgHeight = parseInt(svgElement.getAttribute('height') || '200');
              
              // Create defs if not exists
              let defs = svgDoc.querySelector('defs');
              if (!defs) {
                defs = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'defs');
                svgElement.insertBefore(defs, svgElement.firstChild);
              }
              
              // Create pattern for background
              const pattern = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'pattern');
              pattern.setAttribute('id', 'bgPattern');
              pattern.setAttribute('patternUnits', 'objectBoundingBox');
              pattern.setAttribute('width', '1');
              pattern.setAttribute('height', '1');
              
              // Background image element
              const bgImage = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'image');
              bgImage.setAttribute('href', qrBgImageDataUrl);
              
              // Apply fit mode
              if (qrBgFitMode === 'cover') {
                bgImage.setAttribute('x', '0');
                bgImage.setAttribute('y', '0');
                bgImage.setAttribute('width', '1');
                bgImage.setAttribute('height', '1');
                bgImage.setAttribute('preserveAspectRatio', 'xMidYMid slice');
              } else if (qrBgFitMode === 'contain') {
                bgImage.setAttribute('x', '0');
                bgImage.setAttribute('y', '0');
                bgImage.setAttribute('width', '1');
                bgImage.setAttribute('height', '1');
                bgImage.setAttribute('preserveAspectRatio', 'xMidYMid meet');
              } else { // tile
                pattern.setAttribute('width', '0.2');
                pattern.setAttribute('height', '0.2');
                bgImage.setAttribute('x', '0');
                bgImage.setAttribute('y', '0');
                bgImage.setAttribute('width', '1');
                bgImage.setAttribute('height', '1');
              }
              
              pattern.appendChild(bgImage);
              defs.appendChild(pattern);
              
              // Create background rectangle with pattern and scrim overlay
              const bgRect = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'rect');
              bgRect.setAttribute('x', qrFrameEnabled ? '10' : '0');
              bgRect.setAttribute('y', qrFrameEnabled ? '10' : '0');
              bgRect.setAttribute('width', (qrFrameEnabled ? svgWidth - 20 : svgWidth).toString());
              bgRect.setAttribute('height', (qrFrameEnabled ? 220 : svgHeight).toString());
              bgRect.setAttribute('fill', 'url(#bgPattern)');
              
              // Add scrim overlay if needed
              if (qrBgScrim > 0) {
                const scrimRect = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'rect');
                scrimRect.setAttribute('x', qrFrameEnabled ? '10' : '0');
                scrimRect.setAttribute('y', qrFrameEnabled ? '10' : '0');
                scrimRect.setAttribute('width', (qrFrameEnabled ? svgWidth - 20 : svgWidth).toString());
                scrimRect.setAttribute('height', (qrFrameEnabled ? 220 : svgHeight).toString());
                scrimRect.setAttribute('fill', qrBackgroundColor);
                scrimRect.setAttribute('opacity', (qrBgScrim / 100).toString());
                
                // Insert background and scrim before QR content
                svgElement.insertBefore(scrimRect, svgElement.children[qrFrameEnabled ? 1 : 0]);
              }
              
              // Insert background before scrim or QR content
              svgElement.insertBefore(bgRect, svgElement.children[qrFrameEnabled ? 1 : 0]);
              
              // Auto-contrast adjustment for readability
              if (qrBgAutoContrast) {
                // Create white safety frames around finder patterns
                const finderRects = [
                  { x: qrFrameEnabled ? 30 : 20, y: qrFrameEnabled ? 30 : 20, size: 28 }, // Top-left
                  { x: qrFrameEnabled ? svgWidth - 58 : svgWidth - 48, y: qrFrameEnabled ? 30 : 20, size: 28 }, // Top-right
                  { x: qrFrameEnabled ? 30 : 20, y: qrFrameEnabled ? svgHeight - 48 : svgHeight - 48, size: 28 }, // Bottom-left (adjust if frame)
                ];
                
                finderRects.forEach(finder => {
                  const safetyRect = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'rect');
                  safetyRect.setAttribute('x', finder.x.toString());
                  safetyRect.setAttribute('y', finder.y.toString());
                  safetyRect.setAttribute('width', finder.size.toString());
                  safetyRect.setAttribute('height', finder.size.toString());
                  safetyRect.setAttribute('fill', qrBackgroundColor);
                  safetyRect.setAttribute('opacity', '0.9');
                  svgElement.appendChild(safetyRect);
                });
              }
              
              processedSvg = new XMLSerializer().serializeToString(svgDoc);
            }
          }
          
          // Add center logo if present
          if (qrLogoDataUrl) {
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(processedSvg, 'image/svg+xml');
            const svgElement = svgDoc.querySelector('svg');
            
            if (svgElement) {
              const svgWidth = parseInt(svgElement.getAttribute('width') || '200');
              const svgHeight = parseInt(svgElement.getAttribute('height') || '200');
              
              // Calculate logo size (percentage of QR area, capped at 22%)
              const qrSize = Math.min(svgWidth, svgHeight);
              const logoSize = (qrSize * Math.min(qrLogoSize, 22)) / 100;
              
              // Position logo in center
              const logoX = (svgWidth - logoSize) / 2;
              const logoY = qrFrameEnabled ? 
                (220 - logoSize) / 2 + 10 : // Adjust for frame offset
                (svgHeight - logoSize) / 2;
              
              // Create defs for clipping path
              let defs = svgDoc.querySelector('defs');
              if (!defs) {
                defs = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'defs');
                svgElement.insertBefore(defs, svgElement.firstChild);
              }
              
              // Create clipping path for logo mask
              const clipPath = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
              clipPath.setAttribute('id', 'logoClip');
              
              if (qrLogoMask === 'round') {
                const circle = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('cx', (logoX + logoSize / 2).toString());
                circle.setAttribute('cy', (logoY + logoSize / 2).toString());
                circle.setAttribute('r', (logoSize / 2).toString());
                clipPath.appendChild(circle);
              } else {
                const rect = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'rect');
                rect.setAttribute('x', logoX.toString());
                rect.setAttribute('y', logoY.toString());
                rect.setAttribute('width', logoSize.toString());
                rect.setAttribute('height', logoSize.toString());
                clipPath.appendChild(rect);
              }
              
              defs.appendChild(clipPath);
              
              // Add white background circle/square for logo
              const bgShape = svgDoc.createElementNS('http://www.w3.org/2000/svg', 
                qrLogoMask === 'round' ? 'circle' : 'rect');
              
              if (qrLogoMask === 'round') {
                bgShape.setAttribute('cx', (logoX + logoSize / 2).toString());
                bgShape.setAttribute('cy', (logoY + logoSize / 2).toString());
                bgShape.setAttribute('r', (logoSize / 2).toString());
              } else {
                bgShape.setAttribute('x', logoX.toString());
                bgShape.setAttribute('y', logoY.toString());
                bgShape.setAttribute('width', logoSize.toString());
                bgShape.setAttribute('height', logoSize.toString());
              }
              bgShape.setAttribute('fill', qrBackgroundColor);
              svgElement.appendChild(bgShape);
              
              // Add logo image
              const logoImage = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'image');
              logoImage.setAttribute('x', logoX.toString());
              logoImage.setAttribute('y', logoY.toString());
              logoImage.setAttribute('width', logoSize.toString());
              logoImage.setAttribute('height', logoSize.toString());
              logoImage.setAttribute('href', qrLogoDataUrl);
              logoImage.setAttribute('clip-path', 'url(#logoClip)');
              svgElement.appendChild(logoImage);
              
              processedSvg = new XMLSerializer().serializeToString(svgDoc);
            }
          }
          
          setQrCodeSvg(processedSvg);
        })
        .catch((err) => {
          console.error('QR Code generation error:', err);
        });
    } else {
      setQrCodeSvg('');
    }
  }, [seatFinderUrl, qrForegroundColor, qrBackgroundColor, qrModuleShape, qrFinderStyle, qrFrameEnabled, qrFrameStyle, qrFrameColor, qrLabelText, qrLogoDataUrl, qrLogoMask, qrLogoSize, qrBgImageDataUrl, qrBgFitMode, qrBgScrim, qrBgAutoContrast]);

  // QR Code action handlers
  const handleCopyLink = async () => {
    if (seatFinderUrl) {
      await navigator.clipboard.writeText(seatFinderUrl);
    }
  };

  const handleDownloadPng = () => {
    if (seatFinderUrl) {
      QRCodeLib.toDataURL(seatFinderUrl, {
        errorCorrectionLevel: 'H',
        margin: 4,
        color: { dark: qrForegroundColor, light: qrBackgroundColor },
        width: 400
      }).then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `qr-code-${selectedQrEvent?.name || 'event'}.png`;
        link.href = dataUrl;
        link.click();
      });
    }
  };

  const handleDownloadSvg = () => {
    if (qrCodeSvg && selectedQrEvent) {
      const blob = new Blob([qrCodeSvg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `qr-code-${selectedQrEvent.name}.svg`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleDownloadJpg = () => {
    if (seatFinderUrl) {
      QRCodeLib.toDataURL(seatFinderUrl, {
        errorCorrectionLevel: 'H',
        margin: 4,
        color: { dark: qrForegroundColor, light: qrBackgroundColor },
        width: 400
      }).then((dataUrl) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx!.fillStyle = qrBackgroundColor;
          ctx!.fillRect(0, 0, canvas.width, canvas.height);
          ctx!.drawImage(img, 0, 0);
          const jpgDataUrl = canvas.toDataURL('image/jpeg', 0.9);
          const link = document.createElement('a');
          link.download = `qr-code-${selectedQrEvent?.name || 'event'}.jpg`;
          link.href = jpgDataUrl;
          link.click();
        };
        img.src = dataUrl;
      });
    }
  };

  const handlePrint = () => {
    if (qrCodeSvg) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head><title>QR Code - ${selectedQrEvent?.name || 'Event'}</title></head>
            <body style="display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0;">
              <div style="text-align: center;">
                <h2>${selectedQrEvent?.name || 'Event'} - Seat Finder</h2>
                ${qrCodeSvg}
                <p>${seatFinderUrl}</p>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
        printWindow.close();
      }
    }
  };

  // Handle table operations
  const handleCreateTable = () => {
    setEditingTable(null);
    setShowCreateTableModal(true);
  };

  const handleEditTable = (table: TableWithGuestCount) => {
    setEditingTable(table);
    setShowCreateTableModal(true);
  };

  const handleSaveTable = async (data: { name: string; limit_seats: number; notes?: string; table_no?: number | null }) => {
    try {
      if (editingTable) {
        return await updateTable(editingTable.id, data);
      } else {
        return await createTable(data);
      }
    } catch (error) {
      // Error is handled in the modal and hooks
      return false;
    }
  };

  // Calculate real-time statistics - always use selectedEvent for consistency
  const statsData = useMemo(() => {
    // Always use selectedEvent to ensure both Tables and Guest List pages show the same stats
    const currentEvent = selectedEvent;
    
    const tablesCreated = tables.length;
    const seatsCreated = tables.reduce((sum, table) => sum + table.limit_seats, 0);
    const seatsFilled = guests.length;
    const eventGuestLimit = currentEvent?.guest_limit || 0;
    const seatsRemaining = Math.max(0, eventGuestLimit - seatsFilled);
    const tablesAtCapacity = tables.filter(table => table.guest_count >= table.limit_seats).length;

    return {
      tablesCreated,
      seatsCreated,
      seatsFilled,
      seatsRemaining,
      eventGuestLimit,
      tablesAtCapacity
    };
  }, [tables, guests, selectedEvent]);

  // Handle guest movement between tables
  const handleGuestMove = async (
    guestId: string, 
    sourceTableId: string | null, 
    destTableId: string, 
    guestName: string
  ): Promise<boolean> => {
    const destTable = tables.find(t => t.id === destTableId);
    if (!destTable) return false;

    return await moveGuest({
      guestId,
      sourceTableId,
      destTableId,
      destTableNo: destTable.table_no,
      guestName
    });
  };

  const handleCloseModal = () => {
    setShowCreateTableModal(false);
    setEditingTable(null);
  };

  // Content for different tabs
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Card className="p-8 text-center">
            <TrendingUp className="w-16 h-16 mx-auto text-primary mb-4" />
            <CardTitle className="mb-2">Dashboard Overview</CardTitle>
            <CardDescription className="mb-6">
              Welcome to your wedding planning dashboard. Get an overview of your event progress.
            </CardDescription>
            <Button variant="gradient">
              <Plus className="w-4 h-4 mr-2" />
              View Analytics
            </Button>
          </Card>
        );
      
      case 'my-events':
        return <MyEventsPage />;
      
      case 'guest-list':
        return <GuestListTable selectedEventId={selectedEventId} onEventSelect={handleEventSelect} />;
      
      case 'table-list':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6">
                <div className="space-y-4 flex-1">
                  {/* Event selector */}
                  <div className="flex items-center space-x-4">
                    <label className="text-sm font-medium text-foreground">
                      Choose Event:
                    </label>
                    <Select value={selectedEventId || ""} onValueChange={handleEventSelect}>
                      <SelectTrigger className="w-[300px]">
                        <SelectValue placeholder={eventsLoading ? "Loading events..." : "Select an event..."} />
                      </SelectTrigger>
                      <SelectContent>
                        {events.length > 0 ? (
                          events.map((event) => (
                            <SelectItem key={event.id} value={event.id}>
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4" />
                                <span>{event.name}</span>
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-events" disabled>
                            {eventsLoading ? "Loading events..." : "No events found"}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Contextual title - only show if event is selected */}
                  {selectedEvent && (
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-medium text-foreground">Table Set Up for</span>
                      <span className="text-lg font-bold text-primary">{selectedEvent.name}</span>
                    </div>
                  )}
                </div>
                
                {/* Right side block */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:ml-auto">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-16 h-16 text-primary flex-shrink-0" />
                    <div className="flex flex-col">
                      <CardTitle className="mb-2 text-left">Table Setup</CardTitle>
                      <CardDescription className="text-left">
                        Design your perfect seating arrangement and table layouts
                      </CardDescription>
                    </div>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Button 
                            variant="gradient" 
                            className="sm:ml-3 sm:flex-shrink-0"
                            disabled={!selectedEventId}
                            onClick={handleCreateTable}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Create Tables
                          </Button>
                        </div>
                      </TooltipTrigger>
                      {!selectedEventId && (
                        <TooltipContent>
                          <p>Choose Event first</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardHeader>
            </Card>

            {/* Tables Grid */}
            {selectedEventId && (
              <Card>
                <CardContent className="p-6">
                  {tablesLoading ? (
                    <div className="text-center py-8">
                      <div className="text-muted-foreground">Loading tables...</div>
                    </div>
                   ) : tables.length > 0 ? (
                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                       {tables.map((table) => (
                         <TableCard
                           key={table.id}
                           table={table}
                           onEdit={handleEditTable}
                           onDelete={deleteTable}
                           guests={guests}
                           eventId={selectedEventId}
                           onGuestMove={handleGuestMove}
                         />
                       ))}
                     </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-muted-foreground mb-4">No tables created yet</div>
                      <Button variant="gradient" onClick={handleCreateTable}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Your First Table
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        );
      
      case 'floor-plan':
        return (
          <Card className="p-8 text-center">
            <MapPin className="w-16 h-16 mx-auto text-primary mb-4" />
            <CardTitle className="mb-2">Floor Plan Designer</CardTitle>
            <CardDescription className="mb-6">
              Visualize and design your wedding venue layout
            </CardDescription>
            <Button variant="gradient">
              <Settings className="w-4 h-4 mr-2" />
              Design Floor Plan
            </Button>
          </Card>
        );
      
      case 'rsvp-invite':
        return (
          <Card className="p-8 text-center">
            <Mail className="w-16 h-16 mx-auto text-primary mb-4" />
            <CardTitle className="mb-2">RSVP Invitations</CardTitle>
            <CardDescription className="mb-6">
              Send beautiful digital invitations and track RSVPs
            </CardDescription>
            <Button variant="gradient">
              <Mail className="w-4 h-4 mr-2" />
              Send Invites
            </Button>
          </Card>
        );
      
      case 'wishing-well':
        return (
          <Card className="p-8 text-center">
            <Heart className="w-16 h-16 mx-auto text-primary mb-4" />
            <CardTitle className="mb-2">Online Wishing Well</CardTitle>
            <CardDescription className="mb-6">
              Set up your digital gift registry and money collection
            </CardDescription>
            <Button variant="gradient">
              <Heart className="w-4 h-4 mr-2" />
              Setup Wishing Well
            </Button>
          </Card>
        );
      
      case 'qr-code':
        return (
          <div className="space-y-6">
            <Card className="p-8 text-center">
              <QrCode className="w-16 h-16 mx-auto text-primary mb-4" />
              <CardTitle className="mb-2">QR Code Management</CardTitle>
              <CardDescription className="mb-6">
                Generate QR codes for guest check-ins and table assignments
              </CardDescription>
              <Button variant="gradient">
                <QrCode className="w-4 h-4 mr-2" />
                Generate QR Codes
              </Button>
            </Card>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <CardTitle className="text-lg">QR Code Seating Chart</CardTitle>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Last synced: {lastSyncTime.toLocaleTimeString()}</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-foreground whitespace-nowrap">
                      Choose Event:
                    </label>
                    <Select value={qrSelectedEventId || ""} onValueChange={handleQrEventSelect}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder={eventsLoading ? "Loading events..." : "Select an event..."} />
                      </SelectTrigger>
                      <SelectContent>
                        {events.length > 0 ? (
                          events.map((event) => (
                            <SelectItem key={event.id} value={event.id}>
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4" />
                                <span>{event.name}</span>
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-events" disabled>
                            {eventsLoading ? "Loading events..." : "No events found"}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {selectedQrEvent ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">Seat-Finder Link</h4>
                          <div className="p-3 bg-muted rounded-md">
                            <code className="text-xs break-all">{seatFinderUrl}</code>
                          </div>
                          <CardDescription className="text-xs">
                            Tables: {qrTables.length} | Guests: {qrGuests.length}
                          </CardDescription>
                        </div>
                        
                        <div className="flex justify-center">
                          {qrCodeSvg ? (
                            <div dangerouslySetInnerHTML={{ __html: qrCodeSvg }} />
                          ) : (
                            <div className="w-48 h-48 bg-muted flex items-center justify-center rounded-md">
                              <span className="text-muted-foreground text-sm">Generating QR...</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Scannability Meter */}
                      {selectedQrEvent && (
                        <div className="border rounded-lg p-4 bg-muted/30">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-sm">Scannability Test</h4>
                            {isTestingScannability && (
                              <div className="text-xs text-muted-foreground">Testing...</div>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 mb-3">
                            {['small', 'medium', 'large'].map((size) => {
                              const result = scannabilityResults[size as keyof typeof scannabilityResults];
                              const getIcon = () => {
                                switch (result) {
                                  case 'pass': return <CheckCircle className="w-4 h-4 text-green-500" />;
                                  case 'warn': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
                                  case 'fail': return <XCircle className="w-4 h-4 text-red-500" />;
                                  default: return <div className="w-4 h-4 rounded-full bg-gray-300 animate-pulse" />;
                                }
                              };
                              
                              return (
                                <div key={size} className="flex items-center gap-2 text-xs">
                                  {getIcon()}
                                  <span className="capitalize">{size}</span>
                                </div>
                              );
                            })}
                          </div>
                          
                          {(scannabilityResults.small === 'fail' || 
                            scannabilityResults.medium === 'fail' || 
                            scannabilityResults.large === 'fail' ||
                            scannabilityResults.small === 'warn' || 
                            scannabilityResults.medium === 'warn' || 
                            scannabilityResults.large === 'warn') && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={handleFixScannability}
                              disabled={isTestingScannability}
                              className="w-full"
                            >
                              <Zap className="w-3 h-3 mr-1" />
                              Fix it for me
                            </Button>
                          )}
                        </div>
                      )}
                      
                      {qrContrastWarning && (
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>{qrContrastWarning}</AlertDescription>
                        </Alert>
                      )}
                      
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="design-basics">
                          <AccordionTrigger>Design Basics</AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="module-shape">Module Shape</Label>
                                  <Select 
                                    value={qrModuleShape} 
                                    onValueChange={(value: 'square' | 'round') => setQrModuleShape(value)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="square">Square</SelectItem>
                                      <SelectItem value="round">Round</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="finder-style">Finder/Eye Style</Label>
                                  <Select 
                                    value={qrFinderStyle} 
                                    onValueChange={(value: 'standard' | 'rounded') => setQrFinderStyle(value)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="standard">Standard</SelectItem>
                                      <SelectItem value="rounded">Rounded</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="foreground-color">Foreground Color</Label>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      id="foreground-color"
                                      type="color"
                                      value={qrForegroundColor}
                                      onChange={(e) => setQrForegroundColor(e.target.value)}
                                      className="w-16 h-8 p-1 rounded border"
                                    />
                                    <Input
                                      type="text"
                                      value={qrForegroundColor}
                                      onChange={(e) => setQrForegroundColor(e.target.value)}
                                      placeholder="#000000"
                                      className="flex-1 font-mono text-sm"
                                    />
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="background-color">Background Color</Label>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      id="background-color"
                                      type="color"
                                      value={qrBackgroundColor}
                                      onChange={(e) => setQrBackgroundColor(e.target.value)}
                                      className="w-16 h-8 p-1 rounded border"
                                    />
                                    <Input
                                      type="text"
                                      value={qrBackgroundColor}
                                      onChange={(e) => setQrBackgroundColor(e.target.value)}
                                      placeholder="#ffffff"
                                      className="flex-1 font-mono text-sm"
                                    />
                                  </div>
                                </div>
                              </div>
                              
                              <div className="text-xs text-muted-foreground">
                                <strong>Scannability maintained:</strong> 4-module quiet zone, timing patterns intact, error correction level H
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                        
                        <AccordionItem value="frame-label">
                          <AccordionTrigger>Frame & Label</AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      id="frame-enabled"
                                      checked={qrFrameEnabled}
                                      onChange={(e) => setQrFrameEnabled(e.target.checked)}
                                      className="rounded"
                                    />
                                    <Label htmlFor="frame-enabled">Enable Frame</Label>
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="frame-style">Frame Style</Label>
                                  <Select 
                                    value={qrFrameStyle} 
                                    onValueChange={(value: 'rounded' | 'square') => setQrFrameStyle(value)}
                                    disabled={!qrFrameEnabled}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="rounded">Rounded</SelectItem>
                                      <SelectItem value="square">Square</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="frame-color">Frame Color</Label>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      id="frame-color"
                                      type="color"
                                      value={qrFrameColor}
                                      onChange={(e) => setQrFrameColor(e.target.value)}
                                      disabled={!qrFrameEnabled}
                                      className="w-16 h-8 p-1 rounded border"
                                    />
                                    <Input
                                      type="text"
                                      value={qrFrameColor}
                                      onChange={(e) => setQrFrameColor(e.target.value)}
                                      disabled={!qrFrameEnabled}
                                      placeholder="#e5e7eb"
                                      className="flex-1 font-mono text-sm"
                                    />
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="label-text">Label Text</Label>
                                  <Input
                                    id="label-text"
                                    type="text"
                                    value={qrLabelText}
                                    onChange={(e) => setQrLabelText(e.target.value)}
                                    disabled={!qrFrameEnabled}
                                    placeholder="Scan to find your seat"
                                    className="w-full"
                                  />
                                </div>
                              </div>
                              
                              <div className="text-xs text-muted-foreground">
                                Frame and label will appear around the QR code when enabled
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                        
                        <AccordionItem value="center-logo">
                          <AccordionTrigger>Center Logo</AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="logo-upload">Upload Logo</Label>
                                  <div className="flex flex-col gap-2">
                                    <Input
                                      id="logo-upload"
                                      type="file"
                                      accept=".png,.jpg,.jpeg,.webp"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleLogoUpload(file);
                                      }}
                                      className="file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:bg-muted file:text-foreground hover:file:bg-muted/80"
                                    />
                                    {qrLogo && (
                                      <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={handleRemoveLogo}>
                                          Remove
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => document.getElementById('logo-upload')?.click()}>
                                          Replace
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="logo-mask">Logo Mask</Label>
                                  <Select 
                                    value={qrLogoMask} 
                                    onValueChange={(value: 'square' | 'round') => setQrLogoMask(value)}
                                    disabled={!qrLogo}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="round">Round</SelectItem>
                                      <SelectItem value="square">Square</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor="logo-size">Logo Size: {qrLogoSize}%</Label>
                                <input
                                  id="logo-size"
                                  type="range"
                                  min="5"
                                  max="22"
                                  step="1"
                                  value={qrLogoSize}
                                  onChange={(e) => setQrLogoSize(parseInt(e.target.value))}
                                  disabled={!qrLogo}
                                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                                />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>5%</span>
                                  <span>22% (max)</span>
                                </div>
                              </div>
                              
                              <div className="text-xs text-muted-foreground">
                                <strong>Auto-optimized:</strong> Error correction set to H when logo is present. Logo size capped at 22% for scannability.
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                        
                        <AccordionItem value="background-image">
                          <AccordionTrigger>Background Image / Photo-in-QR</AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="bg-upload">Upload Background</Label>
                                  <div className="flex flex-col gap-2">
                                    <Input
                                      id="bg-upload"
                                      type="file"
                                      accept=".png,.jpg,.jpeg,.webp"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleBgImageUpload(file);
                                      }}
                                      className="file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:bg-muted file:text-foreground hover:file:bg-muted/80"
                                    />
                                    {(qrBgImage || qrBgPreset) && (
                                      <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={handleRemoveBgImage}>
                                          Remove
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => document.getElementById('bg-upload')?.click()}>
                                          Replace
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="bg-preset">Or Choose Preset</Label>
                                  <Select 
                                    value={qrBgPreset} 
                                    onValueChange={handleBgPresetSelect}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select preset..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {bgPresets.map(preset => (
                                        <SelectItem key={preset.id} value={preset.id}>
                                          {preset.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="bg-fit">Fit Mode</Label>
                                  <Select 
                                    value={qrBgFitMode} 
                                    onValueChange={(value: 'cover' | 'contain' | 'tile') => setQrBgFitMode(value)}
                                    disabled={!qrBgImageDataUrl}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="cover">Cover</SelectItem>
                                      <SelectItem value="contain">Contain</SelectItem>
                                      <SelectItem value="tile">Tile</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="bg-scrim">Scrim Overlay: {qrBgScrim}%</Label>
                                  <input
                                    id="bg-scrim"
                                    type="range"
                                    min="0"
                                    max="80"
                                    step="5"
                                    value={qrBgScrim}
                                    onChange={(e) => setQrBgScrim(parseInt(e.target.value))}
                                    disabled={!qrBgImageDataUrl}
                                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                                  />
                                </div>
                                
                                <div className="space-y-2 flex items-end">
                                  <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        id="bg-auto-contrast"
                                        checked={qrBgAutoContrast}
                                        onChange={(e) => setQrBgAutoContrast(e.target.checked)}
                                        disabled={!qrBgImageDataUrl}
                                        className="rounded"
                                      />
                                      <Label htmlFor="bg-auto-contrast" className="text-sm">Auto-contrast</Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        id="bg-apply-live"
                                        checked={qrBgApplyToLiveView}
                                        onChange={(e) => setQrBgApplyToLiveView(e.target.checked)}
                                        disabled={!qrBgImageDataUrl}
                                        className="rounded"
                                      />
                                      <Label htmlFor="bg-apply-live" className="text-sm">Apply to Live View</Label>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="text-xs text-muted-foreground">
                                <strong>Readability preserved:</strong> Finder patterns stay readable with white safety frames. Auto-contrast boosts QR visibility.
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                      
                      <div className="flex flex-wrap gap-2 pt-2 border-t">
                        <Button variant="outline" size="sm" onClick={handleCopyLink}>
                          <Copy className="w-3 h-3 mr-1" />
                          Copy Link
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleDownloadPng}>
                          <Download className="w-3 h-3 mr-1" />
                          PNG
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleDownloadSvg}>
                          <Download className="w-3 h-3 mr-1" />
                          SVG
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleDownloadJpg}>
                          <Download className="w-3 h-3 mr-1" />
                          JPG
                        </Button>
                        <Button variant="outline" size="sm" onClick={handlePrint}>
                          <Printer className="w-3 h-3 mr-1" />
                          Print
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <CardDescription className="text-center py-8">
                      Select an event to generate QR code
                    </CardDescription>
                  )}
                </div>
              </Card>
              
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <CardTitle className="text-lg">Live View (Preview)</CardTitle>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Last synced: {lastSyncTime.toLocaleTimeString()}</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-foreground whitespace-nowrap">
                      Choose Event:
                    </label>
                    <Select value={qrSelectedEventId || ""} onValueChange={handleQrEventSelect}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder={eventsLoading ? "Loading events..." : "Select an event..."} />
                      </SelectTrigger>
                      <SelectContent>
                        {events.length > 0 ? (
                          events.map((event) => (
                            <SelectItem key={event.id} value={event.id}>
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4" />
                                <span>{event.name}</span>
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-events" disabled>
                            {eventsLoading ? "Loading events..." : "No events found"}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {selectedQrEvent ? (
                    <div className="space-y-4">
                      <div className="text-center py-4">
                        <CardDescription className="mb-4">
                          {qrTablesLoading || qrGuestsLoading ? 
                            "Loading preview data..." : 
                            `Live preview for ${selectedQrEvent.name}`
                          }
                        </CardDescription>
                        <Button 
                          variant="gradient" 
                          onClick={() => setShowLivePreview(true)}
                          disabled={qrTablesLoading || qrGuestsLoading}
                        >
                          Open Live Preview
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <CardDescription className="text-center py-4">
                      Select an event to view live preview
                    </CardDescription>
                  )}
                </div>
              </Card>
            </div>
          </div>
        );
      
      case 'planner':
        return (
          <Card className="p-8 text-center">
            <TrendingUp className="w-16 h-16 mx-auto text-primary mb-4" />
            <CardTitle className="mb-2">Wedding Planner</CardTitle>
            <CardDescription className="mb-6">
              Plan and organize every detail of your wedding with our comprehensive planning tools.
            </CardDescription>
            <Button variant="gradient">
              <Plus className="w-4 h-4 mr-2" />
              Start Planning
            </Button>
          </Card>
        );
      
      case 'vendor-team':
        return (
          <Card className="p-8 text-center">
            <Users className="w-16 h-16 mx-auto text-primary mb-4" />
            <CardTitle className="mb-2">Vendor Team</CardTitle>
            <CardDescription className="mb-6">
              Manage your wedding vendor team and coordinate with photographers, caterers, and more.
            </CardDescription>
            <Button variant="gradient">
              <Plus className="w-4 h-4 mr-2" />
              Add Vendors
            </Button>
          </Card>
        );
      
      case 'account':
        return (
          <Card className="p-8 text-center">
            <Settings className="w-16 h-16 mx-auto text-primary mb-4" />
            <CardTitle className="mb-2">Account Settings</CardTitle>
            <CardDescription className="mb-6">
              Manage your account preferences, billing information, and profile settings.
            </CardDescription>
            <Button variant="gradient">
              <Settings className="w-4 h-4 mr-2" />
              Update Settings
            </Button>
          </Card>
        );
      
      default:
        return (
          <Card className="p-8 text-center">
            <TrendingUp className="w-16 h-16 mx-auto text-primary mb-4" />
            <CardTitle className="mb-2">Coming Soon</CardTitle>
            <CardDescription>
              This feature is under development. Stay tuned for updates!
            </CardDescription>
          </Card>
        );
    }
  };

  // Handle tab changes with refetch for tables page
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    
    // Explicitly refetch events when navigating to the Tables page
    if (tabId === 'table-list') {
      refetchEvents();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex">
      {/* Sidebar */}
      <DashboardSidebar activeTab={activeTab} onTabChange={handleTabChange} />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <main className="flex-1 lg:px-6 px-4 py-6">
          <div className="mx-auto max-w-none">
            {/* Stats Bar for all tabs except My Events */}
            {activeTab !== 'my-events' && <StatsBar stats={statsData} />}
            
            {/* Tab Content */}
            <div className="space-y-6 mt-6">
              {renderTabContent()}
            </div>
          </div>
        </main>
      </div>

      {/* Create/Edit Table Modal */}
      <CreateTableModal
        isOpen={showCreateTableModal}
        onClose={handleCloseModal}
        onSave={handleSaveTable}
        editingTable={editingTable}
        existingTables={tables}
      />

      {/* Live Preview Modal */}
      {showLivePreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Live Preview - {selectedQrEvent?.name}</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowLivePreview(false)}>
                ×
              </Button>
            </div>
            
            {/* Admin Controls */}
            <div className="p-4 border-b bg-muted/30">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 text-sm">
                <div className="space-y-1">
                  <Label>Device</Label>
                  <Select value={previewDevice} onValueChange={(value: 'phone' | 'tablet' | 'desktop') => setPreviewDevice(value)}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="tablet">Tablet</SelectItem>
                      <SelectItem value="desktop">Desktop</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1">
                  <Label>Orientation</Label>
                  <Select value={previewOrientation} onValueChange={(value: 'portrait' | 'landscape') => setPreviewOrientation(value)} disabled={previewDevice === 'desktop'}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="portrait">Portrait</SelectItem>
                      <SelectItem value="landscape">Landscape</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1">
                  <Label>Language</Label>
                  <Select value={previewLanguage} onValueChange={(value: 'en' | 'es' | 'fr') => setPreviewLanguage(value)}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1">
                  <Label>Font Size</Label>
                  <Select value={previewFontSize} onValueChange={(value: 'sm' | 'md' | 'lg' | 'xl') => setPreviewFontSize(value)}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sm">Small</SelectItem>
                      <SelectItem value="md">Medium</SelectItem>
                      <SelectItem value="lg">Large</SelectItem>
                      <SelectItem value="xl">X-Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1">
                  <Label>High Contrast</Label>
                  <div className="flex items-center space-x-2 h-8">
                    <input
                      type="checkbox"
                      id="high-contrast"
                      checked={previewHighContrast}
                      onChange={(e) => setPreviewHighContrast(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="high-contrast" className="text-xs">Enable</Label>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <Label>Actions</Label>
                  <Button variant="outline" size="sm" onClick={handleOpenNewWindow} className="h-8 text-xs">
                    New Window
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Preview Content */}
            <div className="flex-1 p-4 flex items-center justify-center bg-gray-100">
              <div 
                className={`bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300 ${
                  previewDevice === 'phone' ? 'border-4 border-gray-800' : 
                  previewDevice === 'tablet' ? 'border-2 border-gray-600' : 
                  'border border-gray-300'
                }`}
                style={getDeviceFrame()}
              >
                {/* Guest View Content */}
                <div 
                  className={`h-full w-full overflow-y-auto ${
                    previewFontSize === 'sm' ? 'text-sm' : 
                    previewFontSize === 'lg' ? 'text-lg' : 
                    previewFontSize === 'xl' ? 'text-xl' : 'text-base'
                  } ${
                    previewHighContrast ? 'bg-black text-white' : 'bg-white text-black'
                  }`}
                  style={{
                    backgroundImage: qrBgApplyToLiveView && qrBgImageDataUrl ? `url(${qrBgImageDataUrl})` : 'none',
                    backgroundSize: qrBgFitMode === 'cover' ? 'cover' : qrBgFitMode === 'contain' ? 'contain' : 'auto',
                    backgroundRepeat: qrBgFitMode === 'tile' ? 'repeat' : 'no-repeat',
                    backgroundPosition: 'center'
                  }}
                >
                  {/* Overlay for better text readability if background image is used */}
                  {qrBgApplyToLiveView && qrBgImageDataUrl && (
                    <div className={`absolute inset-0 ${previewHighContrast ? 'bg-black/80' : 'bg-white/90'}`} />
                  )}
                  
                  <div className="relative z-10 p-6">
                    {/* Title */}
                    <h1 className="text-2xl font-bold text-center mb-6">
                      {previewLanguage === 'es' ? 'Encuentra tu Mesa' : 
                       previewLanguage === 'fr' ? 'Trouvez Votre Table' : 
                       'Find Your Seat'}
                    </h1>
                    
                    {/* Event Name */}
                    <div className="text-center mb-6 text-muted-foreground">
                      {selectedQrEvent?.name}
                    </div>
                    
                    {/* Search Input */}
                    <div className="mb-6">
                      <Input
                        type="text"
                        placeholder={
                          previewLanguage === 'es' ? 'Ingresa tu nombre (mín. 2 caracteres)...' :
                          previewLanguage === 'fr' ? 'Entrez votre nom (min. 2 caractères)...' :
                          'Enter your name (min. 2 characters)...'
                        }
                        value={previewSearch}
                        onChange={(e) => setPreviewSearch(e.target.value)}
                        className={`w-full ${previewHighContrast ? 'bg-gray-800 border-gray-600 text-white' : ''}`}
                      />
                    </div>
                    
                    {/* Search Results */}
                    {previewSearch.length >= 2 && (
                      <div className="space-y-2">
                        {previewResults.length > 0 ? (
                          previewResults.map((guest) => {
                            const table = qrTables.find(t => t.id === guest.table_id);
                            return (
                              <div 
                                key={guest.id} 
                                className={`p-4 rounded-lg border ${
                                  previewHighContrast ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-200'
                                }`}
                              >
                                <div className="font-semibold">
                                  {guest.first_name} {guest.last_name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {table ? (
                                    previewLanguage === 'es' ? `Mesa ${table.table_no || table.name}, Asiento ${guest.seat_no || 'N/A'}` :
                                    previewLanguage === 'fr' ? `Table ${table.table_no || table.name}, Siège ${guest.seat_no || 'N/A'}` :
                                    `Table ${table.table_no || table.name}, Seat ${guest.seat_no || 'N/A'}`
                                  ) : (
                                    previewLanguage === 'es' ? 'Mesa no asignada' :
                                    previewLanguage === 'fr' ? 'Table non assignée' :
                                    'Table not assigned'
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className={`text-center py-8 text-muted-foreground`}>
                            {previewLanguage === 'es' ? 'No se encontraron invitados con ese nombre' :
                             previewLanguage === 'fr' ? 'Aucun invité trouvé avec ce nom' :
                             'No guests found with that name'}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {previewSearch.length > 0 && previewSearch.length < 2 && (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        {previewLanguage === 'es' ? 'Ingresa al menos 2 caracteres para buscar' :
                         previewLanguage === 'fr' ? 'Entrez au moins 2 caractères pour rechercher' :
                         'Enter at least 2 characters to search'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};