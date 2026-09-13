import React from 'react';
import {GuestSongRequestsView} from '@/components/Dashboard/DJMCQuestionnaire/GuestSongRequestsSection';
import type {GuestSongRequestRow} from '@/hooks/useGuestSongRequests';
import type {GuestSongRequestSettings} from '@/hooks/useGuestSongRequestSettings';
const noWrite=async()=>undefined;
export function AdminReadOnlyGuestSongRequests({rows,settings,eventName,eventDate}:{rows:GuestSongRequestRow[];settings:GuestSongRequestSettings|null;eventName:string;eventDate:string|null}) {
 return <GuestSongRequestsView rows={rows} settings={settings} eventName={eventName} eventDate={eventDate}
  disabled loading={false} updateStatus={noWrite} deleteRequest={noWrite} onRunUndoable={noWrite}/>;
}
