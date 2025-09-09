import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format time from HH:mm:ss to 12-hour AM/PM format without seconds
export function formatDisplayTime(time: string): string {
  if (!time) return 'Not set';
  
  const [hour, minute] = time.split(':');
  const hourNum = parseInt(hour);
  const ampm = hourNum >= 12 ? 'PM' : 'AM';
  const displayHour = hourNum % 12 || 12;
  return `${displayHour}:${minute} ${ampm}`;
}
