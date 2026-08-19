import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/enhanced-button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  MailCheck,
  Video,
  MapPinned,
  UtensilsCrossed,
  ImagePlus,
  Upload,
  Settings2,
  SlidersHorizontal,
  ShieldCheck,
  Clock3,
  ClipboardCheck,
  UserPlus,
  UserRoundCog,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLiveViewVisibility } from '@/hooks/useLiveViewVisibility';
import { useLiveViewModuleSettings } from '@/hooks/useLiveViewModuleSettings';
import styles from './KioskSetup.module.css';

interface KioskLiveViewConfigProps {
  eventId: string;
}

type StorageBucket = 'invitations' | 'live-view-uploads';

const acceptByBucket: Record<string, string> = {
  rsvp_invite_config: '.pdf,.jpg,.jpeg,.png',
  welcome_video_config: 'video/mp4,video/quicktime,video/webm',
  reception_floor_plan_config: '.jpg,.jpeg,.png',
  menu_config: '.pdf,.jpg,.jpeg,.png',
  hero_image_config: '.jpg,.jpeg,.png',
};

const folderByConfig: Record<string, string> = {
  rsvp_invite_config: 'rsvp_invite',
  welcome_video_config: 'welcome_video',
  reception_floor_plan_config: 'reception_floor_plan',
  menu_config: 'menu',
  hero_image_config: 'hero_image',
};

export const KioskLiveViewConfig: React.FC<KioskLiveViewConfigProps> = ({ eventId }) => {
  const { toast } = useToast();
  const { settings: visibility, updateVisibility } = useLiveViewVisibility(eventId);
  const { settings: modules, updateModuleConfig } = useLiveViewModuleSettings(eventId);

  const handleUpload = async (
    configKey: string,
    bucket: StorageBucket,
    file: File
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${eventId}/${folderByConfig[configKey]}/${fileName}`;
      const { error: upErr } = await supabase.storage.from(bucket).upload(filePath, file);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath);
      await updateModuleConfig(configKey as any, {
        ...(configKey === 'reception_floor_plan_config' ? { source: 'upload' } : {}),
        file_url: publicUrl,
        file_name: file.name,
        file_type: file.type,
        uploaded_at: new Date().toISOString(),
      });
      toast({ title: 'Uploaded successfully' });
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e.message, variant: 'destructive' });
    }
  };

  const handleRemove = async (configKey: string, bucket: StorageBucket) => {
    try {
      const url = (modules as any)?.[configKey]?.file_url;
      if (url) {
        const path = url.split(`/${bucket}/`)[1];
        if (path) await supabase.storage.from(bucket).remove([path]);
      }
      await updateModuleConfig(configKey as any, {});
      toast({ title: 'Removed' });
    } catch (e: any) {
      toast({ title: 'Remove failed', description: e.message, variant: 'destructive' });
    }
  };

  const triggerFile = (configKey: string, bucket: StorageBucket) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = acceptByBucket[configKey];
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleUpload(configKey, bucket, file);
    };
    input.click();
  };

  type ModuleTile = {
    icon: React.ReactNode;
    title: string;
    description: string;
    visKey: keyof NonNullable<typeof visibility>;
    configKey: string;
    bucket: StorageBucket;
    uploadLabel: string;
    accept: string;
  };

  const tiles: ModuleTile[] = [
    {
      icon: <MailCheck className="h-5 w-5 text-[#856A4C]" strokeWidth={1.8} aria-hidden="true" />,
      title: 'RSVP Invite',
      description: 'Let guests view your digital invitations & RSVP',
      visKey: 'show_rsvp_invite',
      configKey: 'rsvp_invite_config',
      bucket: 'invitations',
      uploadLabel: 'Upload Digital Invitation',
      accept: 'PDF, JPG, or PNG',
    },
    {
      icon: <Video className="h-5 w-5 text-[#856A4C]" strokeWidth={1.8} aria-hidden="true" />,
      title: 'Welcome Video',
      description: 'Add a personal video message for your guests',
      visKey: 'show_welcome_video',
      configKey: 'welcome_video_config',
      bucket: 'live-view-uploads',
      uploadLabel: 'Upload Welcome Video',
      accept: 'MP4, MOV, or WebM',
    },
    {
      icon: <MapPinned className="h-5 w-5 text-[#856A4C]" strokeWidth={1.8} aria-hidden="true" />,
      title: 'Reception Floor Plan',
      description: 'Show your reception floor plan to guests',
      visKey: 'show_reception_floor_plan',
      configKey: 'reception_floor_plan_config',
      bucket: 'live-view-uploads',
      uploadLabel: 'Upload Reception Floor Plan',
      accept: 'JPG or PNG',
    },
    {
      icon: <UtensilsCrossed className="h-5 w-5 text-[#856A4C]" strokeWidth={1.8} aria-hidden="true" />,
      title: 'Menu',
      description: 'Upload your wedding menu for guests to view',
      visKey: 'show_menu',
      configKey: 'menu_config',
      bucket: 'live-view-uploads',
      uploadLabel: 'Upload Wedding Menu',
      accept: 'PDF, JPG, or PNG',
    },
  ];

  return (
    <Card id="guest-live-view-configuration" className={`${styles.primaryPanel} border border-primary shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] w-full scroll-mt-24`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <Settings2 className="w-[22px] h-[22px] text-foreground shrink-0" strokeWidth={1.8} aria-hidden="true" />
          Guest Live View Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Configure which modules your guests can access on the kiosk live view.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 items-stretch auto-rows-fr">
          {(() => {
            const renderTile = (tile: ModuleTile) => {
              const enabled = !!(visibility as any)?.[tile.visKey];
              const conf = (modules as any)?.[tile.configKey];
              return (
                <div
                  key={tile.visKey as string}
                  className={`${styles.tile} h-full flex flex-col space-y-3 p-4 rounded-lg border-2 border-primary bg-muted/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)]`}
                >
                  <div className="flex items-center justify-between max-lg:flex-col max-lg:items-stretch max-lg:gap-3">
                    <div className="flex items-center gap-3 max-lg:items-start">
                      <div className="max-lg:mt-0.5 max-lg:shrink-0">{tile.icon}</div>
                      <div>
                        <h4 className="text-sm font-semibold">{tile.title}</h4>
                        <p className="text-xs text-muted-foreground max-lg:mt-1.5">
                          {tile.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 max-lg:justify-between max-lg:w-full">
                      <span
                        className={`text-xs whitespace-nowrap ${
                          enabled ? 'text-green-600' : 'text-red-500'
                        }`}
                      >
                        {enabled ? 'Displayed on app' : 'Not displayed on app'}
                      </span>
                      <Switch
                        checked={enabled}
                        onCheckedChange={(c) => updateVisibility(tile.visKey as any, c)}
                        className="data-[state=checked]:bg-success data-[state=unchecked]:border data-[state=unchecked]:border-[#967A59]/70"
                      />
                    </div>
                  </div>

                  {enabled && (
                    <Accordion type="single" collapsible className="w-full mt-auto">
                      <AccordionItem value={`${tile.visKey}-cfg`} className="border-0">
                        <AccordionTrigger className={`${styles.control} text-sm py-2 px-4 rounded-full border border-[#472c1d] hover:no-underline`}>
                          <span className="text-[#856A4C] inline-flex items-center gap-[7px]">
                            <Settings2 className="w-[15px] h-[15px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
                            Configure {tile.title} Settings
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3 pt-2">
                            {conf?.file_url ? (
                              <div className={`${styles.innerSurface} flex items-center gap-2 p-3 bg-background rounded-md border border-[#856A4C]/45 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] max-lg:flex-wrap`}>
                                <div className="flex-1 min-w-0 max-lg:basis-full">
                                  <p className="text-xs font-medium truncate">{conf.file_name}</p>
                                  {conf.uploaded_at && (
                                    <p className="text-xs text-muted-foreground">
                                      Uploaded {new Date(conf.uploaded_at).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  variant="default"
                                  className={`${styles.replaceButton} lv-premium-shade text-white`}
                                  onClick={() => triggerFile(tile.configKey, tile.bucket)}
                                >
                                  <RotateCcw className="h-4 w-4 mr-1.5" strokeWidth={1.8} aria-hidden="true" />
                                  Replace
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className={`${styles.removeButton} lv-premium-shade text-white`}
                                  onClick={() => handleRemove(tile.configKey, tile.bucket)}
                                >
                                  <Trash2 className="h-4 w-4 mr-1.5" strokeWidth={1.8} aria-hidden="true" />
                                  Remove
                                </Button>
                              </div>
                            ) : (
                              <div
                                className={`${styles.uploadArea} border-2 border-dashed rounded-md p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors`}
                                onClick={() => triggerFile(tile.configKey, tile.bucket)}
                              >
                                <Upload className="h-[18px] w-[18px] mx-auto mb-2 text-muted-foreground" strokeWidth={1.8} aria-hidden="true" />
                                <p className="text-xs font-medium">{tile.uploadLabel}</p>
                                <p className="text-xs text-muted-foreground">{tile.accept}</p>
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                </div>
              );
            };

            const heroTile = (
              <div key="hero" className={`${styles.tile} h-full flex flex-col space-y-3 p-4 rounded-lg border-2 border-primary bg-muted/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)]`}>
                <div className="flex items-center gap-3">
                  <ImagePlus className="h-5 w-5 text-[#856A4C]" strokeWidth={1.8} aria-hidden="true" />
                  <div>
                    <h4 className="text-sm font-semibold">Add Your Photo or Logo</h4>
                    <p className="text-xs text-muted-foreground">
                      Upload an image to replace the background behind your event header
                    </p>
                    <p className="text-sm font-semibold text-[#856A4C] mt-1">
                      📸 For best results, use a horizontal landscape (6×4) photo.
                    </p>
                  </div>
                </div>
                <Accordion type="single" collapsible className="w-full mt-auto">
                  <AccordionItem value="hero-cfg" className="border-0">
                    <AccordionTrigger className={`${styles.control} text-sm py-2 px-4 rounded-full border border-[#472c1d] hover:no-underline`}>
                      <span className="text-[#856A4C] inline-flex items-center gap-[7px]">
                        <Settings2 className="w-[15px] h-[15px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
                        Configure Hero Background
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-2">
                        {(modules as any)?.hero_image_config?.file_url ? (
                          <div className="space-y-3">
                            <div className={`${styles.mediaFrame} relative rounded-md overflow-hidden border`}>
                              <img
                                src={(modules as any).hero_image_config.file_url}
                                alt="Hero preview"
                                className="w-full h-32 object-cover"
                              />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <span className="text-white font-bold text-sm">Preview with overlay</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                className={`${styles.replaceButton} lv-premium-shade text-white`}
                                onClick={() => triggerFile('hero_image_config', 'live-view-uploads')}
                              >
                                <RotateCcw className="h-4 w-4 mr-1.5" strokeWidth={1.8} aria-hidden="true" />
                                Replace
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className={`${styles.removeButton} lv-premium-shade text-white`}
                                onClick={() => handleRemove('hero_image_config', 'live-view-uploads')}
                              >
                                <Trash2 className="h-4 w-4 mr-1.5" strokeWidth={1.8} aria-hidden="true" />
                                Remove
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`${styles.uploadArea} border-2 border-dashed rounded-md p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors`}
                            onClick={() => triggerFile('hero_image_config', 'live-view-uploads')}
                          >
                            <Upload className="h-[18px] w-[18px] mx-auto mb-2 text-muted-foreground" strokeWidth={1.8} aria-hidden="true" />
                            <p className="text-xs font-medium">Upload Photo or Logo</p>
                            <p className="text-xs text-muted-foreground">JPG or PNG</p>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            );

            const togglesTile = (
              <div key="toggles" className={`${styles.tile} h-full flex flex-col space-y-3 p-4 rounded-lg border-2 border-primary bg-muted/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)]`}>
                <h4 className="text-sm font-semibold flex items-center gap-[7px]">
                  <SlidersHorizontal className="h-5 w-5 text-[#856A4C] shrink-0" strokeWidth={1.8} aria-hidden="true" />
                  Kiosk Display Toggles
                </h4>
                <p className="text-xs text-muted-foreground">
                  Control which guest details appear on the kiosk result card.
                </p>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm inline-flex items-center gap-[7px]">
                    <ClipboardCheck className="h-4 w-4 shrink-0 text-[#856A4C]" strokeWidth={1.8} aria-hidden="true" />
                    Show RSVP Status
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs whitespace-nowrap ${
                        visibility?.kiosk_show_rsvp_status ? 'text-green-600' : 'text-red-500'
                      }`}
                    >
                      {visibility?.kiosk_show_rsvp_status ? 'On' : 'Off'}
                    </span>
                    <Switch
                      checked={!!visibility?.kiosk_show_rsvp_status}
                      onCheckedChange={(c) => updateVisibility('kiosk_show_rsvp_status', c)}
                      className="data-[state=checked]:bg-success data-[state=unchecked]:border data-[state=unchecked]:border-[#967A59]/70"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm inline-flex items-center gap-[7px]">
                    <UtensilsCrossed className="h-4 w-4 shrink-0 text-[#856A4C]" strokeWidth={1.8} aria-hidden="true" />
                    Show Dietary Requirements
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs whitespace-nowrap ${
                        visibility?.kiosk_show_dietary ? 'text-green-600' : 'text-red-500'
                      }`}
                    >
                      {visibility?.kiosk_show_dietary ? 'On' : 'Off'}
                    </span>
                    <Switch
                      checked={!!visibility?.kiosk_show_dietary}
                      onCheckedChange={(c) => updateVisibility('kiosk_show_dietary', c)}
                      className="data-[state=checked]:bg-success data-[state=unchecked]:border data-[state=unchecked]:border-[#967A59]/70"
                    />
                  </div>
                </div>
              </div>
            );

            // Desktop: 3 columns
            // Row 1: Add Your Photo or Logo | RSVP Invite | Welcome Video
            // Row 2: Menu | Reception Floor Plan | Kiosk Display Toggles
            const rsvp = tiles[0];
            const welcome = tiles[1];
            const floorPlan = tiles[2];
            const menu = tiles[3];

            return (
              <>
                {heroTile}
                {renderTile(rsvp)}
                {renderTile(welcome)}
                {renderTile(menu)}
                {renderTile(floorPlan)}
                {togglesTile}
              </>
            );
          })()}
        </div>
      </CardContent>
    </Card>
  );
};
