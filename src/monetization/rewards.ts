import { notifyMonetizationChanged } from './events';

export const FREE_BOARD_LIMIT = 7;
const BONUS_KEY = 'meme_capsule_bonus_boards';
const AD_FREE_KEY = 'meme_capsule_adfree_until';
let sessionStarted = false;

export function startRewardSession(): void {
  if (sessionStarted) return;
  sessionStarted = true;
  resetBonusBoards();
}

export function resetBonusBoards(): void {
  localStorage.setItem(BONUS_KEY, '0');
  notifyMonetizationChanged();
}

export function grantAdFreeWindow(): void {
  localStorage.setItem(AD_FREE_KEY, String(Date.now() + 30 * 60 * 1000));
  notifyMonetizationChanged();
}

export function getAdFreeExpiry(): number {
  const until = Number(localStorage.getItem(AD_FREE_KEY) ?? 0);
  return Number.isFinite(until) ? until : 0;
}

export function isInAdFreeWindow(): boolean {
  const until = Number(localStorage.getItem(AD_FREE_KEY) ?? 0);
  return Number.isFinite(until) && Date.now() < until;
}

export function grantThemedPack(packId: string): void {
  localStorage.setItem(`meme_capsule_pack_${packId}_until`, String(Date.now() + 24 * 60 * 60 * 1000));
  notifyMonetizationChanged();
}

export function isPackUnlocked(packId: string): boolean {
  const until = Number(localStorage.getItem(`meme_capsule_pack_${packId}_until`) ?? 0);
  return Number.isFinite(until) && Date.now() < until;
}

export function getBonusBoards(): number {
  const count = Number(localStorage.getItem(BONUS_KEY) ?? 0);
  return Number.isSafeInteger(count) && count > 0 ? count : 0;
}

export function grantBonusBoard(): void {
  localStorage.setItem(BONUS_KEY, String(getBonusBoards() + 1));
  notifyMonetizationChanged();
}

export function canCreateBoard(count: number, unlimited = false): boolean {
  return unlimited || count < FREE_BOARD_LIMIT + getBonusBoards();
}
