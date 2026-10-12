export const MONETIZATION_CHANGED = 'meme-capsule-monetization-changed';
export const MONETIZATION_TOAST = 'meme-capsule-monetization-toast';

export function notifyMonetizationChanged(): void {
  window.dispatchEvent(new Event(MONETIZATION_CHANGED));
}

export function monetizationToast(message: string): void {
  window.dispatchEvent(new CustomEvent(MONETIZATION_TOAST, { detail: message }));
}
