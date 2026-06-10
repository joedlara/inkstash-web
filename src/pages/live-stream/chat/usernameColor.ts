// Twitch-style per-username chat colors. Bright + legible on the dark stage.
// Mirrors docs/design-system/live_stream/stream-view.jsx exactly so the
// per-user color is stable between the prototype and this port.

const NAME_COLORS = [
  '#FF6B5E', '#54B2FF', '#5BD08A', '#FFC53D', '#C99BFF', '#FF8FBE',
  '#5FE3D0', '#FFA24B', '#9AE65C', '#7FA8FF', '#F2C0FF', '#7BE0A4',
] as const;

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h;
}

export function usernameColor(name: string): string {
  return NAME_COLORS[hashName(name) % NAME_COLORS.length];
}

// Deterministic gradient per username (used for avatars).
export type AvatarGradient = readonly [string, string];

const AV_PALETTE: readonly AvatarGradient[] = [
  ['#C2362F', '#5C1116'], ['#1F3A6E', '#0E1D3E'], ['#5B3DB8', '#2A1A5C'],
  ['#B8893A', '#5C3F0F'], ['#3F6F4A', '#1B3024'], ['#1A1A1A', '#454545'],
] as const;

export function avatarGrad(name: string): AvatarGradient {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AV_PALETTE[h % AV_PALETTE.length];
}

export function gradStyle(g: readonly [string, string]): string {
  return `linear-gradient(160deg, ${g[0]} 0%, ${g[1]} 100%)`;
}
