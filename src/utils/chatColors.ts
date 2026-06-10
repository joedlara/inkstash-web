// src/utils/chatColors.ts
//
// Deterministic per-user chat color. Two viewers seeing the same username
// must see the same color, on every reload, in every surface — that's the
// whole point of this helper, so the same user reads the same in the
// overlay chat, the desktop rail, the @-mention popup, and the profile
// card title.

export const CHAT_COLOR_PALETTE = [
  '#FF6B5E', // coral red
  '#54B2FF', // sky blue
  '#5BD08A', // mint
  '#FFC53D', // amber
  '#C99BFF', // lavender
  '#FF8FBE', // pink
  '#5FE3D0', // teal
  '#FFA24B', // tangerine
  '#9AE65C', // lime
  '#7FA8FF', // periwinkle
  '#F2C0FF', // orchid
  '#7BE0A4', // sage
] as const;

/**
 * Hash a username into a stable index into the palette.
 * Matches the spec hash: h = h*31 + charCodeAt(i) folded to a uint32,
 * then modulo the palette length. Same string in → same index out.
 */
export function userColor(name: string): string {
  if (!name) return CHAT_COLOR_PALETTE[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  return CHAT_COLOR_PALETTE[h % CHAT_COLOR_PALETTE.length];
}
