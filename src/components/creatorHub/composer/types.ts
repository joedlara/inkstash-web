// src/components/creatorHub/composer/types.ts
//
// Shared state shape for the Go Live composer. Lives outside the
// orchestrator so each step file can import the types without a
// circular dependency.

import type { Photo } from './PhotoEditor';
import { BLANK_PHOTO } from './PhotoEditor';

export type ComposerMode = 'live' | 'schedule';

export type ItemType = 'auction' | 'buynow' | 'giveaway';

export type ShipMode = 'flat' | 'free' | 'calculated';

export interface ComposerDetails {
  title: string;
  description: string;
  category: string;
  language: string;
  /** Thumbnail with filter + optional caption. Photo.src is a data
   *  URL while editing; gets uploaded to Supabase Storage at publish
   *  time so the public URL can be written to livestreams.cover_image_url. */
  thumb: Photo;
  /** Only set in 'schedule' mode. ISO string. */
  scheduledAt: string | null;
}

export interface ComposerItem {
  id: string;
  name: string;
  type: ItemType;
  /** Starting bid for auctions, fixed price for buynow, 0 for giveaway. */
  start: number;
  /** Always 1 per row — qty > 1 in the add form fans out into N rows. */
  qty: number;
  /** Per-lot photo. Defaults to BLANK_PHOTO. Lots created with Qty > 1
   *  share the same photo by reference until edited individually. */
  photo: Photo;
}

export interface ComposerSettings {
  shipMode: ShipMode;
  shipCostUsd: number;
  combineShipments: boolean;
  explicit18plus: boolean;
  mutedWords: string;
  allowPolls: boolean;
  allowCloning: boolean;
  coupons: { id: string; code: string; amountUsd: number }[];
  moderators: string[];
}

export const DEFAULT_DETAILS: ComposerDetails = {
  title: '',
  description: '',
  category: 'Comics',
  language: 'English',
  thumb: BLANK_PHOTO,
  scheduledAt: null,
};

export const DEFAULT_SETTINGS: ComposerSettings = {
  shipMode: 'flat',
  shipCostUsd: 6,
  combineShipments: true,
  explicit18plus: false,
  mutedWords: '',
  allowPolls: true,
  allowCloning: true,
  coupons: [],
  moderators: [],
};

export const TYPE_LABEL: Record<ItemType, string> = {
  auction: 'Auction',
  buynow: 'Buy now',
  giveaway: 'Giveaway',
};

export const CATEGORIES = [
  'Comics', 'Graded slabs', 'Vintage', 'Modern', 'Indie press', 'Variant covers', 'Sealed packs', 'Other',
] as const;

export const LANGUAGES = ['English', 'Español', 'Français', 'Deutsch', 'Português'] as const;
