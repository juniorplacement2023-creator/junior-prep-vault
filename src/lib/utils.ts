import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get the application URL for redirects
 * Uses VITE_APP_URL environment variable if set, otherwise falls back to current origin
 */
export function getAppUrl(): string {
  if (typeof window === 'undefined') {
    return import.meta.env.VITE_APP_URL || '';
  }
  return import.meta.env.VITE_APP_URL || window.location.origin;
}