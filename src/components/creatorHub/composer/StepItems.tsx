// src/components/creatorHub/composer/StepItems.tsx
//
// Step 2 of the Go Live composer: Run of Show. Left column is the
// add-item form; right column is the live list of queued lots with
// select-all + bulk actions + drag-to-reorder. Drag uses raw pointer
// events (works on touch + mouse), with the rearrange computed off
// cursor position vs. each row's vertical midpoint.

import { useLayoutEffect, useRef, useState } from 'react';
import { Box, MenuItem, Select, TextField, Typography, Checkbox, ButtonBase } from '@mui/material';
import { Copy, GripVertical, Plus, X } from 'lucide-react';
import type { ComposerItem, ComposerSettings, ItemType } from './types';
import { TYPE_LABEL } from './types';
import HBtn from '../HBtn';
import PhotoEditor, { BLANK_PHOTO, type Photo } from './PhotoEditor';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../../theme/inkstashTokens';

interface Props {
  items: ComposerItem[];
  setItems: (next: ComposerItem[] | ((prev: ComposerItem[]) => ComposerItem[])) => void;
  settings: ComposerSettings;
}

interface DraftItem {
  name: string;
  type: ItemType;
  start: string;
  qty: string;
  photo: Photo;
}

const EMPTY_DRAFT: DraftItem = { name: '', type: 'auction', start: '', qty: '1', photo: BLANK_PHOTO };

export default function StepItems({ items, setItems, settings }: Props) {
  const [draft, setDraft] = useState<DraftItem>(EMPTY_DRAFT);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStart, setBulkStart] = useState<string>('');

  // Drag state. dragRef holds the id outside React so pointermove
  // handlers don't need a state read to know what's being dragged.
  const listRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ id: string | null }>({ id: null });
  const [dragId, setDragId] = useState<string | null>(null);

  // FLIP-style rearrange animation: capture each row's previous top
  // and translateY -dy on the next paint so the swap looks fluid.
  const prevTops = useRef<Record<string, number>>({});
  useLayoutEffect(() => {
    const c = listRef.current;
    if (!c) return;
    c.querySelectorAll<HTMLDivElement>('[data-roshow-row]').forEach((row) => {
      const id = row.dataset.id ?? '';
      const top = row.getBoundingClientRect().top;
      const prev = prevTops.current[id];
      if (prev != null && id !== dragRef.current.id) {
        const dy = prev - top;
        if (dy) {
          row.style.transition = 'none';
          row.style.transform = `translateY(${dy}px)`;
          requestAnimationFrame(() => {
            row.style.transition = 'transform 200ms ease';
            row.style.transform = '';
          });
        }
      }
      prevTops.current[id] = top;
    });
  });

  function onPointerMove(e: PointerEvent) {
    const id = dragRef.current.id;
    if (!id || !listRef.current) return;
    const rows = Array.from(listRef.current.querySelectorAll<HTMLDivElement>('[data-roshow-row]'));
    let to = 0;
    for (const row of rows) {
      const rect = row.getBoundingClientRect();
      if (e.clientY > rect.top + rect.height / 2) to++;
    }
    setItems((arr) => {
      const from = arr.findIndex((x) => x.id === id);
      if (from === -1) return arr;
      let target = to;
      if (from < target) target -= 1;
      if (target === from || target < 0 || target >= arr.length) return arr;
      const next = [...arr];
      const [moved] = next.splice(from, 1);
      next.splice(target, 0, moved);
      return next;
    });
  }

  function onPointerUp() {
    dragRef.current = { id: null };
    setDragId(null);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  }

  function onGripDown(e: React.PointerEvent, it: ComposerItem) {
    e.preventDefault();
    dragRef.current = { id: it.id };
    setDragId(it.id);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }

  function addLots() {
    const base = draft.name.trim();
    if (!base) return;
    const qty = Math.max(1, Math.min(100, Number(draft.qty) || 1));
    // If qty > 1 and an item with the same prefix already exists, continue
    // the numbering from where we left off (e.g. existing "Mythic Pack 3"
    // means new lots start at 4).
    let startNum = 0;
    if (qty > 1) {
      const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`^${escaped} (\\d+)$`);
      items.forEach((x) => {
        const m = x.name.match(re);
        if (m) startNum = Math.max(startNum, Number(m[1]));
      });
    }
    const startPrice = Math.max(0, Number(draft.start) || 1);
    const made: ComposerItem[] = Array.from({ length: qty }, (_, k) => ({
      id: `it-${Date.now()}-${k}`,
      name: qty > 1 ? `${base} ${startNum + k + 1}` : base,
      type: draft.type,
      start: startPrice,
      qty: 1,
      // Lots created in the same batch share the photo. Editing a single
      // lot's photo later will be a future commit (per-row photo edit).
      photo: draft.photo,
    }));
    setItems((a) => [...a, ...made]);
    setDraft({ name: '', type: draft.type, start: '', qty: '1', photo: BLANK_PHOTO });
  }

  function cloneItem(it: ComposerItem) {
    setItems((arr) => {
      // Clone of "Comic 25" -> "Comic 26", continuing the series.
      // Anything without a trailing number gets " (copy)".
      const m = it.name.match(/^(.*?)(\d+)\s*$/);
      let newName: string;
      if (m) {
        const base = m[1];
        let max = 0;
        arr.forEach((x) => {
          const mm = x.name.match(/^(.*?)(\d+)\s*$/);
          if (mm && mm[1] === base) max = Math.max(max, Number(mm[2]));
        });
        newName = `${base}${max + 1}`;
      } else {
        newName = `${it.name} (copy)`;
      }
      const i = arr.indexOf(it);
      const copy: ComposerItem = { ...it, id: `c-${Date.now()}`, name: newName };
      const next = [...arr];
      next.splice(i + 1, 0, copy);
      return next;
    });
  }

  function delItem(it: ComposerItem) {
    setItems((a) => a.filter((x) => x.id !== it.id));
    setSelectedIds((a) => a.filter((id) => id !== it.id));
  }

  // ── Selection + bulk actions ────────────────────────────────────
  const allSelected = items.length > 0 && selectedIds.length === items.length;
  function toggleSel(id: string) {
    setSelectedIds((a) => a.includes(id) ? a.filter((x) => x !== id) : [...a, id]);
  }
  function toggleAll() {
    setSelectedIds(allSelected ? [] : items.map((i) => i.id));
  }
  function bulkDelete() {
    setItems((a) => a.filter((i) => !selectedIds.includes(i.id)));
    setSelectedIds([]);
  }
  function bulkApplyStart() {
    if (bulkStart === '') return;
    const v = Math.max(0, Number(bulkStart));
    setItems((a) => a.map((i) => selectedIds.includes(i.id) ? { ...i, start: v } : i));
  }

  const qtyNum = Number(draft.qty) || 1;
  const previewName = (draft.name.trim() || 'Mythic Pack');

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1.2fr' }, gap: 3, alignItems: 'start' }}>
      {/* LEFT — Add form */}
      <Box>
        <SectionLabel>Add item(s)</SectionLabel>
        <Box sx={{
          bgcolor: inkstashColors.bgElev,
          border: `1px solid ${inkstashColors.border}`,
          borderRadius: inkstashRadii.lg,
          // Roomy padding — felt cramped on mobile with p: 2 + jumbled
          // photo+fields side-by-side.
          p: { xs: 2.5, md: 3 },
        }}>
          {/* Photo sits on its own row, centered. Keeps the 1:1 frame
              clean and stops the photo from squishing the fields below. */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2.5 }}>
            <Box sx={{ width: 140 }}>
              <PhotoEditor
                photo={draft.photo}
                onChange={(photo) => setDraft({ ...draft, photo })}
                ratio="1 / 1"
                compact
              />
            </Box>
          </Box>

          {/* Fields in their own breathing space below. Type/Start/Qty
              stack on phones, sit in a 3-col grid on desktop. */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
            <Field label="Item name">
              <TextField
                fullWidth
                size="small"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLots())}
                placeholder="e.g. Mythic Pack"
                inputProps={{ maxLength: 100 }}
                sx={inputSx}
              />
            </Field>
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1.2fr 1fr 1fr' },
              gap: 1.5,
            }}>
              <Field label="Type">
                <Select
                  fullWidth size="small"
                  value={draft.type}
                  onChange={(e) => setDraft({ ...draft, type: e.target.value as ItemType })}
                  sx={inputSx}
                >
                  <MenuItem value="auction">Auction</MenuItem>
                  <MenuItem value="buynow">Buy now</MenuItem>
                  <MenuItem value="giveaway">Giveaway</MenuItem>
                </Select>
              </Field>
              <Field label="Start $">
                <TextField
                  fullWidth size="small" type="number"
                  value={draft.start}
                  onChange={(e) => setDraft({ ...draft, start: e.target.value })}
                  placeholder="1"
                  inputProps={{ min: 0 }}
                  sx={inputSx}
                />
              </Field>
              <Field label="Qty">
                <TextField
                  fullWidth size="small" type="number"
                  value={draft.qty}
                  onChange={(e) => setDraft({ ...draft, qty: e.target.value })}
                  placeholder="1"
                  inputProps={{ min: 1, max: 100 }}
                  sx={inputSx}
                />
              </Field>
            </Box>
          </Box>

          <Box sx={{ mt: 2.5 }}>
            <HBtn
              variant="dark"
              size="md"
              onClick={addLots}
              icon={<Plus size={15} strokeWidth={2.4} />}
              disabled={!draft.name.trim()}
            >
              {qtyNum > 1 ? `Add ${qtyNum} lots` : 'Add to run of show'}
            </HBtn>
          </Box>
          <Typography sx={{
            mt: 2, fontFamily: inkstashFonts.ui, fontSize: 12,
            color: inkstashColors.muted, lineHeight: 1.5,
          }}>
            Set <b style={{ color: inkstashColors.ink2 }}>Qty</b> above 1 to add separate numbered
            lots — "{previewName} 1", "{previewName} 2"… each sharing this photo. Drag
            the handle to reorder.
          </Typography>
        </Box>
      </Box>

      {/* RIGHT — Run of show list */}
      <Box>
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 1, mb: 1.25,
        }}>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
            <Checkbox
              size="small"
              checked={allSelected}
              indeterminate={selectedIds.length > 0 && !allSelected}
              disabled={items.length === 0}
              onChange={toggleAll}
              sx={{ p: 0.5, color: inkstashColors.muted, '&.Mui-checked': { color: inkstashColors.brand } }}
            />
            <Typography sx={{
              fontFamily: inkstashFonts.mono, fontSize: 11,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              fontWeight: 600, color: inkstashColors.muted,
            }}>
              Run of show · {items.length}
            </Typography>
          </Box>
        </Box>

        {/* Bulk action bar */}
        {selectedIds.length > 0 && (
          <Box sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 1, mb: 1, p: 1, pl: 1.25,
            bgcolor: inkstashColors.bgSunken,
            border: `1px solid ${inkstashColors.border}`,
            borderRadius: 999,
          }}>
            <Typography sx={{
              fontFamily: inkstashFonts.mono, fontSize: 11,
              color: inkstashColors.ink, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              {selectedIds.length} selected
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{
                display: 'inline-flex', alignItems: 'center',
                bgcolor: inkstashColors.bgElev,
                border: `1px solid ${inkstashColors.border}`,
                borderRadius: 999,
                pl: 1, pr: 0.25,
                height: 30,
              }}>
                <Box component="span" sx={{
                  fontFamily: inkstashFonts.mono, fontSize: 12, color: inkstashColors.muted, mr: 0.5,
                }}>$</Box>
                <TextField
                  size="small" type="number" placeholder="start"
                  value={bulkStart}
                  onChange={(e) => setBulkStart(e.target.value)}
                  inputProps={{ min: 0, style: { padding: '2px 0', width: 56, fontSize: 12.5 } }}
                  sx={{ '& fieldset': { border: 'none' }, '& .MuiInputBase-root': { p: 0 } }}
                />
              </Box>
              <HBtn variant="ghost" size="sm" onClick={bulkApplyStart} disabled={bulkStart === ''}>
                Set start
              </HBtn>
              <HBtn variant="ghost" size="sm" onClick={bulkDelete}>
                Delete
              </HBtn>
            </Box>
          </Box>
        )}

        {/* Item list */}
        <Box
          ref={listRef}
          sx={{
            bgcolor: inkstashColors.bgElev,
            border: `1px solid ${inkstashColors.border}`,
            borderRadius: inkstashRadii.lg,
            minHeight: 240,
            maxHeight: 480,
            overflowY: 'auto',
          }}
        >
          {items.length === 0 ? (
            <Box sx={{
              p: 4, textAlign: 'center',
              fontFamily: inkstashFonts.ui, fontSize: 13, color: inkstashColors.muted,
            }}>
              No items yet. Add lots on the left — drag the handle to reorder; they'll auction top to bottom.
            </Box>
          ) : items.map((it, i) => (
            <Box
              key={it.id}
              data-roshow-row=""
              data-id={it.id}
              sx={{
                display: 'grid',
                gridTemplateColumns: 'auto auto 28px 48px 1fr auto',
                alignItems: 'center',
                gap: 1.25,
                px: 1.5, py: 1,
                borderBottom: `1px solid ${inkstashColors.border}`,
                bgcolor: selectedIds.includes(it.id)
                  ? inkstashColors.brandSoft
                  : dragId === it.id
                    ? inkstashColors.bgSunken
                    : 'transparent',
                opacity: dragId === it.id ? 0.85 : 1,
                transition: 'background-color 120ms ease, opacity 120ms ease',
                '&:last-of-type': { borderBottom: 0 },
              }}
            >
              <Checkbox
                size="small"
                checked={selectedIds.includes(it.id)}
                onChange={() => toggleSel(it.id)}
                sx={{ p: 0.25, color: inkstashColors.muted, '&.Mui-checked': { color: inkstashColors.brand } }}
              />
              <Box
                onPointerDown={(e) => onGripDown(e, it)}
                sx={{
                  display: 'inline-flex', alignItems: 'center',
                  color: inkstashColors.muted2,
                  cursor: 'grab',
                  touchAction: 'none',
                  '&:hover': { color: inkstashColors.ink2 },
                  '&:active': { cursor: 'grabbing' },
                }}
                title="Drag to reorder"
              >
                <GripVertical size={15} strokeWidth={2.2} />
              </Box>
              <Typography sx={{
                fontFamily: inkstashFonts.mono, fontSize: 11, fontWeight: 700,
                color: inkstashColors.muted2, textAlign: 'center',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {String(i + 1).padStart(2, '0')}
              </Typography>
              <Box sx={{
                position: 'relative',
                width: 44, height: 44,
                borderRadius: inkstashRadii.sm,
                bgcolor: inkstashColors.bgSunken,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: inkstashColors.muted,
                fontFamily: inkstashFonts.display, fontWeight: 900, fontSize: 16,
                overflow: 'hidden',
              }}>
                {it.photo.src ? (
                  <Box component="img" src={it.photo.src} alt=""
                    sx={{
                      position: 'absolute', inset: 0,
                      width: '100%', height: '100%',
                      objectFit: 'cover',
                      filter: it.photo.filter,
                    }}
                  />
                ) : (
                  it.name.charAt(0).toUpperCase()
                )}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{
                  fontFamily: inkstashFonts.ui, fontSize: 13.5, fontWeight: 600,
                  color: inkstashColors.ink, letterSpacing: '-0.005em',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {it.name}
                </Typography>
                <Box sx={{
                  display: 'inline-flex', alignItems: 'center', gap: 0.75,
                  fontFamily: inkstashFonts.mono, fontSize: 11, color: inkstashColors.muted,
                  mt: 0.25,
                }}>
                  <Box component="span" sx={{
                    px: 0.6, py: '1px', borderRadius: 0.5,
                    bgcolor: it.type === 'auction' ? inkstashColors.brandSoft
                          : it.type === 'buynow' ? inkstashColors.goldSoft
                          : inkstashColors.bgSunken,
                    color: it.type === 'auction' ? inkstashColors.brand
                         : it.type === 'buynow' ? inkstashColors.goldDeep
                         : inkstashColors.ink2,
                    fontWeight: 700, fontSize: 9.5,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>
                    {TYPE_LABEL[it.type]}
                  </Box>
                  <span>${it.start}</span>
                  {settings.shipMode === 'flat' && (
                    <span>· +${settings.shipCostUsd.toFixed(2)} ship</span>
                  )}
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                <ButtonBase
                  onClick={() => cloneItem(it)}
                  title="Clone"
                  sx={{
                    width: 30, height: 30, borderRadius: 999,
                    color: inkstashColors.muted,
                    '&:hover': { bgcolor: inkstashColors.bgSunken, color: inkstashColors.ink },
                  }}
                >
                  <Copy size={14} strokeWidth={2.2} />
                </ButtonBase>
                <ButtonBase
                  onClick={() => delItem(it)}
                  title="Remove"
                  sx={{
                    width: 30, height: 30, borderRadius: 999,
                    color: inkstashColors.muted,
                    '&:hover': { bgcolor: inkstashColors.brandSoft, color: inkstashColors.brand },
                  }}
                >
                  <X size={15} strokeWidth={2.4} />
                </ButtonBase>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{
      fontFamily: inkstashFonts.mono, fontSize: 11, fontWeight: 600,
      textTransform: 'uppercase', letterSpacing: '0.08em',
      color: inkstashColors.muted, mb: 1,
    }}>
      {children}
    </Typography>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography sx={{
        fontFamily: inkstashFonts.ui, fontSize: 11, fontWeight: 700,
        color: inkstashColors.muted, letterSpacing: '0.04em',
        textTransform: 'uppercase', mb: 0.5,
      }}>
        {label}
      </Typography>
      {children}
    </Box>
  );
}

const inputSx = {
  '& .MuiInputBase-root': {
    fontFamily: inkstashFonts.ui, fontSize: 13,
    bgcolor: inkstashColors.bgSunken, borderRadius: 1.25,
  },
  '& fieldset': { borderColor: inkstashColors.border },
} as const;
