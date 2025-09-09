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

// Format date to DD/MM/YYYY format
export function formatDisplayDate(date: string): string {
  if (!date) return 'Not set';
  
  const dateObj = new Date(date);
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  return `${day}/${month}/${year}`;
}
