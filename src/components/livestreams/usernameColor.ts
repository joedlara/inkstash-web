// src/components/livestreams/usernameColor.ts
//
// Twitch-style per-username chat colors. Hashes the username into a
// fixed palette of 10 bright, legible hues that work on the dark
// stage AND on the light chat card. Same palette as the redesign
// prototype (docs/design-system/README.md §Design Tokens).
//
// Deterministic per name — `joe` always gets the same color across
// every chat row, the auction-block status line, the winner banner,
// and the profile card so the eye can track a chatter at a glance.

export const USERNAME_COLORS = [
  '#FF6B5E', '#54B2FF', '#5BD08A', '#FFC53D',
  '#C99BFF', '#FF8FBE', '#5FE3D0', '#FFA24B',
  '#9AE65C', '#7FA8FF',
] as const;

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function colorForUsername(name: string | null | undefined): string {
  if (!name) return USERNAME_COLORS[0];
  return USERNAME_COLORS[hashName(name) % USERNAME_COLORS.length];
}
