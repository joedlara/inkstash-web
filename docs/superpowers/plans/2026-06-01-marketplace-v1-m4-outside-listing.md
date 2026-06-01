# Marketplace v1 / M4 — Outside-Item Listing Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking. Execute task by task in order. After each task, run typecheck (`npx tsc --noEmit`) and commit before moving on.

**Goal:** Make `/list-item` a clean, comics-only listing wizard that any seller can use to list comics they own — including comics not pulled from packs — and that lands a valid `listings` row visible in the M3 marketplace feed and buyable end-to-end.

**Architecture:** M2-Task8 already laid in `ComicSearchInput`, `SellerConnectGate`, and the comic_* INSERT path. M4 is the final cleanup pass + free-text fallback + end-to-end smoke test. No new RPCs or edge functions — `search-comic-catalog` already exists and is used.

**Tech Stack:** React 19, TypeScript, MUI v7, react-router-dom, Supabase JS, existing `comicCatalogAPI`, existing `listings` table.

---

## File map

- Modify: `src/pages/ListItem.tsx` — strip legacy fields, fix `handleSaveDraft`, hide auction toggle, deduplicate Connect modal mount
- Modify: `src/components/listings/ComicSearchInput.tsx` — add free-text fallback row + form
- Modify: `src/api/comicCatalog.ts` — confirm the search response shape exposes everything the fallback needs (no-op if already complete)
- Create: none (all infra was built in M1/M2/M3)

---

## Background context

**Current state of `/list-item`** (post M2-Task8):
- `step` state machine: `'search' → 'match' → 'details' → 'complete'`
- `'search'` step renders `<ComicSearchInput onSelect={...} />` which calls `search-comic-catalog`
- On select, ComicVine fields populate `formData.{comicVineId, publisher, writer, artist, issueNumber, title}` and the wizard advances
- `handleSubmitListing` INSERTs into `listings` with all `comic_*` fields wired
- `<SellerConnectGate>` wraps the page so non-Connect sellers see the onboarding modal first

**Known issues (from M2-followup task + smoke-test observations):**
1. `handleSaveDraft` (~line 409-466) is missing the `comic_*` fields — resuming a draft loses the ComicVine match
2. Suspected duplicate `<ConnectOnboardingModal>` mount inside the page even though `SellerConnectGate` already renders one
3. Auction toggle is still visible despite spec saying "hidden in v1"
4. Legacy non-comic state vars may still be in the form schema (productType, category, etc.) even if no UI surfaces them
5. Free-text fallback row not implemented in `ComicSearchInput`
6. `/list-item` end-to-end has never been smoke-tested by a seller

---

## Task 1: Audit and document the current state

**Files:**
- Read-only: `src/pages/ListItem.tsx` (1556 lines), `src/components/listings/ComicSearchInput.tsx`, `src/components/listings/SellerConnectGate.tsx`, `src/components/listings/ConnectOnboardingModal.tsx`, `src/api/comicCatalog.ts`

- [ ] **Step 1: Read `src/pages/ListItem.tsx` end to end**

Specifically locate and note line numbers for:
- `useState` and `useReducer` (form state shape)
- `setStep`, `step === '...'` branches (state machine)
- `handleSaveDraft` (~line 409)
- `handleSubmitListing` (~line 474)
- `renderSearchStep`, `renderMatchStep`, `renderDetailsStep`, `renderCompleteListingStep`
- Every reference to `isAuction`, `auctionDurationDays`, `startingBid`, `auction_*` — these are the toggle to hide
- Every reference to `category`, `productType`, `listingType`, `Cards`, `Funko`, `Figures` — legacy non-comic vestiges
- Every `<ConnectOnboardingModal>` mount (we need to keep exactly one — the one inside `SellerConnectGate`)

- [ ] **Step 2: Confirm `ComicSearchInput` API**

Read `src/components/listings/ComicSearchInput.tsx`. Note:
- Props (especially `onSelect` shape — what fields does it pass back?)
- Does it have a "no results" or "manual entry" affordance today? If yes, skip Task 4. If no, Task 4 implements it.
- Does it render the dropdown via MUI `<Autocomplete>` or custom popper?

- [ ] **Step 3: Read `SellerConnectGate` + `ConnectOnboardingModal`**

Confirm that `SellerConnectGate` mounts `ConnectOnboardingModal` internally. This is the canonical mount; any sibling mount in `ListItem.tsx` is the redundant one.

- [ ] **Step 4: Read `src/api/comicCatalog.ts`**

Confirm the search function's return type. Note whether the cache row contains writer/artist/publisher (we need these for the spec's autocomplete row + the listing's comic_* fields).

- [ ] **Step 5: Write findings to scratch comment block (mental model only)**

No file write needed — just confirm you can answer:
- Where is the auction toggle rendered? (line numbers)
- Where is the redundant Connect modal? (line numbers)
- Which non-comic state vars exist?
- What's the exact `ComicSelection` shape from `onSelect`?
- What does `comicCatalogAPI.search` return?

This audit informs all subsequent tasks. **Do not skip this step.**

---

## Task 2: Hide the auction toggle and auction-specific UI

**Files:**
- Modify: `src/pages/ListItem.tsx`

Spec Section 3: "The `is_auction` flag and auction fields stay hidden in v1 (Phase 6 surfaces them)."

- [ ] **Step 1: Locate the auction toggle**

Most likely inside `renderCompleteListingStep` or `renderDetailsStep`. Find the `<Switch>` or `<ToggleButtonGroup>` that flips `isAuction`. Also find the auction-only fields: `startingBid`, `auctionDurationDays`, and any "auction ends on..." preview.

- [ ] **Step 2: Hide the toggle + force buy-now defaults**

Replace the auction toggle render with a hidden state. Initial state should be:

```tsx
const [isAuction, setIsAuction] = useState(false);
const [isBuyNow, setIsBuyNow] = useState(true);
// Auction fields below are unused in v1 but kept so handleSubmitListing
// still compiles. Phase 6 surfaces them.
const [startingBid, setStartingBid] = useState('');
const [auctionDurationDays, setAuctionDurationDays] = useState(7);
```

In the render, replace any block guarded by `{isAuction && ...}` with nothing (the block won't render anyway since `isAuction === false`, but remove the dead JSX too — including any "Choose auction type" toggle group). Keep the buy-now price input (it's required).

- [ ] **Step 3: Verify `handleSubmitListing`**

The existing INSERT already handles both branches correctly via `is_auction ? ... : null`. No changes needed in the submit path — just don't render the inputs.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors. If anything complains about unused vars, prefix with `_` or leave them (state vars are read in submit).

- [ ] **Step 5: Commit**

```bash
git add src/pages/ListItem.tsx
git commit -m "feat(list-item): hide auction toggle for marketplace v1 (buy-now only)"
```

---

## Task 3: Strip legacy non-comic state and field references

**Files:**
- Modify: `src/pages/ListItem.tsx`

Spec Section 3, "Removed from `ListItem.tsx`": category dropdown, non-comic condition strings, multi-product tabs.

- [ ] **Step 1: Search for legacy state vars**

Use Grep to find any state in the wizard that is no longer used by the UI:
- `productType`, `listingType`, `Cards`, `Funko`, `Figures` — should already be gone from JSX after M2-Task8; remove any state vars that no JSX references
- `category` state — keep `null` write to DB, but remove any state var / UI input (per spec: "category dropdown — column stays nullable in DB; we just never set it")

- [ ] **Step 2: Remove the dead state**

Delete each unused `useState` line. Run typecheck after each deletion. If TS complains, restore and investigate (the var is read somewhere).

- [ ] **Step 3: Confirm `condition` options are comics-only**

The `CONDITION_OPTIONS` constant should match spec Section 3: Sealed / Near Mint / Very Fine / Fine / Good / Poor (per existing memory note 1045, this was already done in M2). If you see "New / Used / Refurbished" or similar, replace with the comic grade options.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/pages/ListItem.tsx
git commit -m "refactor(list-item): drop legacy non-comic state vars and category UI"
```

---

## Task 4: Implement free-text fallback in `ComicSearchInput`

**Files:**
- Modify: `src/components/listings/ComicSearchInput.tsx`

Spec Section 3, "Free-text fallback": At the bottom of the dropdown, "Don't see your comic? Enter manually." opens an inline form.

- [ ] **Step 1: Add the fallback row to the dropdown**

Inside the Autocomplete's options render (or wherever the dropdown items are listed), append a special row after the search hits. Render it visually distinct (italic text, divider above it):

```tsx
{/* Free-text fallback row, always rendered last in the dropdown */}
<MenuItem
  onClick={() => setShowManualForm(true)}
  sx={{
    borderTop: `1px solid ${inkstashColors.border}`,
    fontStyle: 'italic',
    color: inkstashColors.muted,
  }}
>
  Don&apos;t see your comic? Enter manually
</MenuItem>
```

The exact integration depends on whether the component uses `<Autocomplete renderOption={...}>` or a custom popper. Match whatever pattern is already in the file.

- [ ] **Step 2: Add manual-entry form state**

```tsx
const [showManualForm, setShowManualForm] = useState(false);
const [manualForm, setManualForm] = useState({
  title: '',
  issueNumber: '',
  publisher: '',
  writer: '',
  artist: '',
});
```

- [ ] **Step 3: Render the form when toggled**

When `showManualForm` is true, replace the search input + dropdown with an inline form:

```tsx
{showManualForm && (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 2 }}>
    <TextField
      label="Title"
      value={manualForm.title}
      onChange={(e) => setManualForm({ ...manualForm, title: e.target.value })}
      required
      fullWidth
    />
    <TextField
      label="Issue number"
      value={manualForm.issueNumber}
      onChange={(e) => setManualForm({ ...manualForm, issueNumber: e.target.value })}
      fullWidth
    />
    <TextField
      label="Publisher"
      value={manualForm.publisher}
      onChange={(e) => setManualForm({ ...manualForm, publisher: e.target.value })}
      fullWidth
    />
    <TextField
      label="Writer"
      value={manualForm.writer}
      onChange={(e) => setManualForm({ ...manualForm, writer: e.target.value })}
      fullWidth
    />
    <TextField
      label="Artist"
      value={manualForm.artist}
      onChange={(e) => setManualForm({ ...manualForm, artist: e.target.value })}
      fullWidth
    />
    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
      <Button onClick={() => setShowManualForm(false)}>Cancel</Button>
      <Button
        variant="contained"
        disabled={!manualForm.title.trim()}
        onClick={() => {
          onSelect({
            comicVineId: null,
            title: manualForm.title.trim(),
            issueNumber: manualForm.issueNumber.trim() || null,
            publisher: manualForm.publisher.trim() || null,
            writer: manualForm.writer.trim() || null,
            artist: manualForm.artist.trim() || null,
            coverUrl: null,
          });
          setShowManualForm(false);
        }}
      >
        Use this comic
      </Button>
    </Box>
  </Box>
)}
```

**Important:** the `onSelect` shape must match what the autocomplete row already passes. If `ComicSelection` from `ComicSearchInput.tsx` doesn't have a `comicVineId | null` field, update the type to allow `null` and confirm the consumer (`ListItem.tsx`) handles it (it should — `handleSubmitListing` already writes `formData.comicVineId ?? null` per line 524).

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean. If `ComicSelection` type errors, widen `comicVineId: number | null` (whatever the existing type is) to allow null.

- [ ] **Step 5: Commit**

```bash
git add src/components/listings/ComicSearchInput.tsx
git commit -m "feat(list-item): free-text fallback for comics not in ComicVine"
```

---

## Task 5: Fix `handleSaveDraft` to round-trip comic_* fields

**Files:**
- Modify: `src/pages/ListItem.tsx`

The M2-followup note explicitly flagged this: `handleSaveDraft` is missing the `comic_*` columns, so reopening a draft loses the ComicVine match.

- [ ] **Step 1: Locate `handleSaveDraft`**

Should be around line 409. Compare its INSERT/UPSERT payload against `handleSubmitListing`'s (line 474). The submit payload writes:

```
comic_vine_id, comic_publisher, comic_writer, comic_artist, comic_issue_number
```

Confirm none of these are in the draft payload.

- [ ] **Step 2: Add the comic_* fields to the draft payload**

Mirror them exactly as in submit. Example diff inside `handleSaveDraft`:

```ts
.insert({
  user_id: user.id,
  title,
  // ...existing fields...
  comic_vine_id: formData.comicVineId ?? null,
  comic_publisher: formData.publisher || null,
  comic_writer: formData.writer || null,
  comic_artist: formData.artist || null,
  comic_issue_number: formData.issueNumber || null,
  status: 'draft',
})
```

- [ ] **Step 3: Confirm the draft-restore path reads them back**

Find where drafts are loaded into state (likely a `loadDraft` or initial-state useEffect). Ensure each comic_* column from the DB row is written into the corresponding formData key. If the restore path uses a generic `setFormData(row)`, the new keys come along automatically — but verify the keys match exactly between DB column and form state (`comic_vine_id` → `comicVineId`, etc.).

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/pages/ListItem.tsx
git commit -m "fix(list-item): persist comic_* fields when saving draft"
```

---

## Task 6: Remove redundant `<ConnectOnboardingModal>` mount

**Files:**
- Modify: `src/pages/ListItem.tsx`

The page is wrapped in `<SellerConnectGate>` which already mounts `<ConnectOnboardingModal>`. Any sibling mount inside `ListItem.tsx` is dead code and risks rendering twice / firing duplicate `initiate-seller-connect` calls.

- [ ] **Step 1: Search for `<ConnectOnboardingModal>` in `ListItem.tsx`**

Run: `grep -n "ConnectOnboardingModal" src/pages/ListItem.tsx`

If you find a mount inside the page body (not inside `SellerConnectGate`), delete it along with its `useState` open/close vars and any `setOpen(true)` triggers that would have toggled it.

- [ ] **Step 2: Remove the import if unused**

If `ConnectOnboardingModal` is no longer imported by `ListItem.tsx` after deletion, drop the import line.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean (TS will flag unused imports).

- [ ] **Step 4: Commit**

```bash
git add src/pages/ListItem.tsx
git commit -m "refactor(list-item): drop redundant ConnectOnboardingModal mount"
```

---

## Task 7: End-to-end smoke test (manual)

**Test plan executed by the user via the dev server. Document results inline so we know which bugs to fix.**

- [ ] **Step 1: Start dev server**

```bash
bun run dev
```

- [ ] **Step 2: Sign in as a seller who is NOT Connect-active**

Verify on landing at `/list-item`:
- `SellerConnectGate` opens `ConnectOnboardingModal` automatically
- Wizard form does NOT render until Connect onboarding completes

- [ ] **Step 3: Sign in as a Connect-active seller**

Visit `/list-item`. Confirm:
- Wizard renders at step `'search'`
- `ComicSearchInput` is mounted

- [ ] **Step 4: Test ComicVine search path**

Type a real comic title (e.g., "Saga"). Confirm:
- Debounced search fires (Network tab → `search-comic-catalog`)
- Dropdown populates with results
- Each row shows cover + title + publisher
- Free-text fallback row "Don't see your comic? Enter manually" is the last item
- Clicking a result advances to step `'match'` (or `'details'`, depending on flow) with formData populated

- [ ] **Step 5: Test free-text fallback**

Re-enter the search step. Click "Enter manually". Confirm:
- Form replaces dropdown
- Title is required (button disabled when empty)
- Filling title + clicking "Use this comic" advances the wizard with `comic_vine_id=null` in formData

- [ ] **Step 6: Complete the wizard**

- Pick condition (radio: Sealed / Near Mint / Very Fine / Fine / Good / Poor)
- Optional: grade ("CGC 9.8")
- Optional: description
- Upload 1-2 photos
- Set `buy_now_price` (e.g., $42)
- Pick ship-from address (from `seller_ship_from_addresses`)
- Get shipping rates (ShipEngine)
- Submit

- [ ] **Step 7: Verify the listing landed**

- Wizard redirects to `/item/:id`
- ItemDetail renders with the comic metadata you entered
- Open Marketplace tab — listing appears in the unified feed
- (If you used ComicVine) publisher filter pill works
- (If you used free-text) the listing still shows up but with publisher-as-entered

- [ ] **Step 8: Verify buyability**

Switch accounts. Buy the listing. Confirm:
- M3 buy flow works on an outside-item listing (no `source_inventory_id`)
- Order lands in `orders` table
- Listing flips to `sold`
- Vault inventory transfer skipped (no source) — verify `open-listing-order` handles `source_inventory_id IS NULL` gracefully

- [ ] **Step 9: Test draft save + restore**

Start a new listing as the seller. Fill through ComicVine search + condition + price. Click "Save draft" (or whatever the affordance is). Reload `/list-item`. Confirm:
- The wizard offers to resume the draft
- All comic_* fields are still populated (this is the bug Task 5 fixed)
- All other fields restore correctly

- [ ] **Step 10: Document any bugs found**

For each issue, fix in a follow-up commit titled `fix(list-item): <description>`. After all bugs are fixed, return to Step 1 and re-run the smoke test. Only mark complete when the full flow is bug-free.

---

## Task 8: Open the M4 PR

- [ ] **Step 1: Push branch**

```bash
git checkout -b marketplace-v1-m4
git push -u origin marketplace-v1-m4
```

- [ ] **Step 2: Open PR**

Title: `Marketplace v1 / M4 — Outside-item listing flow (ComicVine + free-text)`

Body:

```markdown
## Summary

Marketplace v1 / M4 — closes the seller side of marketplace v1. Any seller (vault items or comics they own) can now list on InkStash.

- **ComicVine search**: `/list-item` step 1 is now `ComicSearchInput` (already in place from M2-Task8); free-text fallback added for comics not in ComicVine's database.
- **Comics-only**: auction toggle hidden (Phase 6 surfaces it). Legacy non-comic state and category UI stripped. Condition radio uses comic grades only.
- **Draft round-trip**: `handleSaveDraft` now persists comic_* fields so resuming a draft preserves the ComicVine match.
- **Connect gate cleanup**: removed redundant ConnectOnboardingModal mount (SellerConnectGate already owns it).

## Test plan

- [x] ComicVine search path → listing created → appears in marketplace
- [x] Free-text fallback → listing created with comic_vine_id=NULL → appears in marketplace
- [x] Draft save + restore preserves all comic_* fields
- [x] Non-Connect seller blocked at SellerConnectGate
- [x] Outside-item listing bought via M3 buy flow (no source_inventory_id branch)
```

---

## Self-review

After implementation, before opening the PR, verify:

1. **Spec coverage:** Every "Removed from ListItem.tsx" item in spec Section 3 is actually gone (auction fields hidden, category UI gone, non-comic state vars deleted).
2. **No placeholders:** No `TODO` comments added. No stub functions.
3. **Type consistency:** `ComicSelection` allows `comic_vine_id: number | null` and `coverUrl: string | null`. `ListItem.tsx`'s formData accepts both.
4. **No regressions:** Vault-item listing flow (CardDispositionRow → SetPriceModal → list_vault_item RPC) still works untouched.

## Out of scope

- **Delist flow** — deferred to M5 or a one-task hotfix
- **Refunds + chargebacks** — deferred until real volume
- **CovrPrice integration** (M2.5) — blocked on partnership
- **In-app shipping labels** (C10-followup) — deferred
- **Aesthetic polish** (Sold badge color, etc.) — deferred to a styling-only PR
