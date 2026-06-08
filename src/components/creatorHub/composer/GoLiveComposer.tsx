// src/components/creatorHub/composer/GoLiveComposer.tsx
//
// 4-step modal: Details → Run of Show → Settings → Preview. Opened by
// the top-bar [+], the Home/Stream "Go live now" / "Schedule a show"
// buttons. The publish action dispatches to livestreamsAPI.start();
// a successful publish in Live mode redirects to /live/:id (so the
// host can switch to the dual-device Live Control panel from the hub
// in a follow-up commit).
//
// Steps 2 and 3 are placeholders in this first commit so the chrome +
// step navigation work end-to-end. The real Run of Show + Settings
// land in follow-up commits.

import { useEffect, useState } from 'react';
import { Box, IconButton, Modal, Typography, CircularProgress } from '@mui/material';
import { Check, X as Close, Zap } from 'lucide-react';
import { livestreamsAPI } from '../../../api/livestreams';
import { useAuth } from '../../../hooks/useAuth';
import { uploadComposerPhoto } from './uploadPhoto';
import { persistComposerItems } from './persistItems';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../../theme/inkstashTokens';
import HBtn from '../HBtn';
import StepDetails from './StepDetails';
import StepItems from './StepItems';
import StepSettings from './StepSettings';
import StepPreview from './StepPreview';
import DualDevicePairing from './DualDevicePairing';
import SingleDeviceCamera from './SingleDeviceCamera';
import { useMediaQuery, useTheme } from '@mui/material';
import type { ComposerDetails, ComposerItem, ComposerMode, ComposerSettings } from './types';
import { DEFAULT_DETAILS, DEFAULT_SETTINGS } from './types';

interface Props {
  open: boolean;
  mode: ComposerMode;
  onClose: () => void;
  /** Called after a successful publish. Receives the new livestream id
   *  so the hub can route to Live Control or back to the Shows list. */
  onPublished?: (livestreamId: string, mode: ComposerMode) => void;
}

const STEPS = ['Details', 'Run of show', 'Settings', 'Preview'] as const;

// localStorage key for draft persistence. Keyed by mode so Live and
// Schedule drafts don't clobber each other. Cleared on successful
// publish or explicit Cancel; backdrop-click only sets a flag so the
// next mount re-hydrates from the draft.
const DRAFT_KEY = (mode: ComposerMode) => `inkstash.creator-hub.compose-draft.${mode}`;
interface ComposerDraft {
  step: number;
  details: ComposerDetails;
  items: ComposerItem[];
  settings: ComposerSettings;
}
function readDraft(mode: ComposerMode): ComposerDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY(mode));
    if (!raw) return null;
    return JSON.parse(raw) as ComposerDraft;
  } catch { return null; }
}
function writeDraft(mode: ComposerMode, draft: ComposerDraft): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(DRAFT_KEY(mode), JSON.stringify(draft)); } catch { /* quota / private mode */ }
}
function clearDraft(mode: ComposerMode): void {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(DRAFT_KEY(mode)); } catch { /* ignore */ }
}

export default function GoLiveComposer({ open, mode, onClose, onPublished }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [details, setDetails] = useState<ComposerDetails>(DEFAULT_DETAILS);
  const [items, setItems] = useState<ComposerItem[]>([]);
  const [settings, setSettings] = useState<ComposerSettings>(DEFAULT_SETTINGS);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  // Dual-device pairing state (Live mode only). preparedId is set when
  // prepareDualDevice succeeds; phonePaired flips true once the phone
  // joins the LiveKit room as a publisher.
  const [preparedId, setPreparedId] = useState<string | null>(null);
  const [phonePaired, setPhonePaired] = useState(false);
  // Camera mode: 'dual' (laptop = producer, phone = camera via QR) or
  // 'single' (this device IS the camera). Default by viewport: phones
  // get 'single' because you can't scan a QR with the same device,
  // desktops get 'dual' because the laptop webcam isn't the typical
  // host camera. Either can manually switch via a toggle in Step 4.
  const theme = useTheme();
  const isMobileViewport = useMediaQuery(theme.breakpoints.down('md'));
  const [cameraMode, setCameraMode] = useState<'dual' | 'single'>(
    isMobileViewport ? 'single' : 'dual',
  );
  // Re-default if the viewport flips after open (e.g. dev rotation).
  // Don't override if the user has manually switched — track that with
  // a "touched" flag.
  const [cameraModeTouched, setCameraModeTouched] = useState(false);
  useEffect(() => {
    if (cameraModeTouched) return;
    setCameraMode(isMobileViewport ? 'single' : 'dual');
  }, [isMobileViewport, cameraModeTouched]);
  // Flips true the moment goLive() flips the row status to 'live'.
  // Passed to DualDevicePairing so its unmount cleanup knows NOT to
  // delete the row (it's a real stream now). Without this, the soft-
  // delete on unmount would race the goLive() success path.
  const [published, setPublished] = useState(false);

  // Hydrate from a saved draft when the modal opens. Means an accidental
  // backdrop click on Step 3 doesn't nuke the seller's work — reopening
  // restores Title / Description / lots / settings / step.
  useEffect(() => {
    if (!open) return;
    const draft = readDraft(mode);
    if (!draft) return;
    setStep(draft.step);
    setDetails(draft.details);
    setItems(draft.items);
    setSettings(draft.settings);
    // Pairing state intentionally NOT restored — a fresh phone pair is
    // required each session since the pair_token gets nulled on publish.
  }, [open, mode]);

  // Persist draft on any change while the modal is open (debounce-y via
  // React batching — fine for this size of payload).
  useEffect(() => {
    if (!open) return;
    writeDraft(mode, { step, details, items, settings });
  }, [open, mode, step, details, items, settings]);

  // Soft close (backdrop / Esc / X). Keeps the draft so reopening
  // resumes. Used for everything except Cancel + successful publish.
  function handleSoftClose() {
    if (publishing) return;
    setPublishError(null);
    setPreparedId(null);
    setPhonePaired(false);
    setPublished(false);
    onClose();
  }

  // Hard close: discards the draft. Used by the Cancel button on
  // Step 1 (intentional abandonment) and after a successful publish.
  function handleHardClose() {
    if (publishing) return;
    setStep(0);
    setDetails(DEFAULT_DETAILS);
    setItems([]);
    setSettings(DEFAULT_SETTINGS);
    setPublishError(null);
    setPreparedId(null);
    setPhonePaired(false);
    setPublished(false);
    clearDraft(mode);
    onClose();
  }

  // Legacy alias — most callers want the soft variant now.
  const handleClose = handleSoftClose;

  const canAdvance = step === 0 ? details.title.trim().length > 0 : true;

  async function handlePublish() {
    setPublishing(true);
    setPublishError(null);
    try {
      if (mode === 'live') {
        // Live mode: stream row already exists from Step 4's prepare
        // call. Persist items, then either flip preparing → live (dual-
        // device) or no-op (single-device, already live).
        if (!preparedId) throw new Error('Stream not prepared. Close and try again.');
        if (user?.id && items.length > 0) {
          const result = await persistComposerItems({
            items, livestreamId: preparedId, userId: user.id,
          });
          if (result.failed > 0) {
            console.warn(`[GoLiveComposer] ${result.failed}/${items.length} lots failed to persist`);
          }
        }
        // Both modes use prepare-only semantics now (row stays
        // 'preparing' until the host hits Publish). Flip to 'live'
        // here so the row doesn't appear on /live before Publish.
        await livestreamsAPI.goLive(preparedId);
        // Tell Step 4 the row is now a real, live stream so its
        // unmount cleanup doesn't delete/end it.
        setPublished(true);
        onPublished?.(preparedId, mode);
        handleHardClose();
        return;
      }

      // Schedule mode: legacy start() path. No phone needed.
      // Validate the scheduled time before hitting the edge fn — without
      // this, a missing/past timestamp would silently fall through the
      // backend's "no future scheduled_start_at = go live immediately"
      // branch, which is the opposite of what scheduling means.
      if (!details.scheduledAt) {
        throw new Error('Pick a date and time before scheduling.');
      }
      const scheduledMs = new Date(details.scheduledAt).getTime();
      if (Number.isNaN(scheduledMs) || scheduledMs <= Date.now()) {
        throw new Error('Scheduled time must be in the future.');
      }
      let coverUrl: string | undefined;
      if (user?.id && details.thumb.src) {
        const url = await uploadComposerPhoto(details.thumb.src, user.id, 'livestream-thumbnails');
        coverUrl = url ?? undefined;
      }
      const res = await livestreamsAPI.start({
        title: details.title.trim(),
        description: details.description.trim() || undefined,
        cover_image_url: coverUrl,
        scheduled_start_at: details.scheduledAt,
        queue: undefined,
      });
      if (user?.id && items.length > 0) {
        const result = await persistComposerItems({
          items, livestreamId: res.livestream_id, userId: user.id,
        });
        if (result.failed > 0) {
          console.warn(`[GoLiveComposer] ${result.failed}/${items.length} lots failed to persist`);
        }
      }
      onPublished?.(res.livestream_id, mode);
      handleHardClose();
    } catch (err) {
      setPublishError((err as Error).message ?? 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      slotProps={{
        backdrop: { sx: { bgcolor: 'rgba(8,7,10,0.6)' } },
      }}
      sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 1, md: 3 } }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 980,
          maxHeight: 'calc(100vh - 48px)',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: inkstashColors.bgElev,
          borderRadius: inkstashRadii.xl,
          boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
          outline: 'none',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <Box sx={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: 2, p: 3, borderBottom: `1px solid ${inkstashColors.border}`,
        }}>
          <Box>
            <Typography sx={{
              fontFamily: inkstashFonts.mono, fontSize: 11, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              color: inkstashColors.muted, mb: 0.75,
            }}>
              {mode === 'live' ? 'Go live now' : 'Schedule a show'}
            </Typography>
            <Typography sx={{
              fontFamily: inkstashFonts.display, fontWeight: 900, fontSize: 22,
              textTransform: 'uppercase', letterSpacing: '-0.005em', lineHeight: 1,
              color: inkstashColors.ink,
            }}>
              {details.title || 'Untitled show'}
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small" disabled={publishing}>
            <Close size={18} />
          </IconButton>
        </Box>

        {/* Stepper */}
        <Box sx={{
          display: 'flex', gap: 0,
          px: 3, pt: 2, pb: 0,
          borderBottom: `1px solid ${inkstashColors.border}`,
          overflowX: 'auto',
        }}>
          {STEPS.map((label, i) => (
            <StepChip
              key={label}
              n={i + 1}
              label={label}
              state={i === step ? 'active' : i < step ? 'done' : 'pending'}
              onClick={() => i < step && setStep(i)}
            />
          ))}
        </Box>

        {/* Body */}
        <Box sx={{ p: 3, flex: 1, overflowY: 'auto', minHeight: 320 }}>
          {step === 0 && (
            <StepDetails details={details} setDetails={setDetails} mode={mode} />
          )}
          {step === 1 && (
            <StepItems items={items} setItems={setItems} settings={settings} />
          )}
          {step === 2 && (
            <StepSettings settings={settings} setSettings={setSettings} />
          )}
          {step === 3 && (
            <Box sx={{ display: 'grid', gridTemplateColumns: mode === 'live' ? { xs: '1fr', md: '1fr 280px' } : '1fr', gap: 3 }}>
              <StepPreview mode={mode} details={details} items={items} settings={settings} />
              {mode === 'live' && (
                <Box sx={{
                  borderLeft: { md: `1px solid ${inkstashColors.border}` },
                  pl: { md: 3 },
                }}>
                  <Box sx={{
                    display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
                    gap: 1, mb: 2,
                  }}>
                    <Typography sx={{
                      fontFamily: inkstashFonts.mono, fontSize: 11, fontWeight: 600,
                      textTransform: 'uppercase', letterSpacing: '0.08em',
                      color: inkstashColors.muted,
                    }}>
                      {cameraMode === 'dual' ? 'Connect your camera' : 'This device is the camera'}
                    </Typography>
                    {/* Manual override link. Resetting preparedId +
                        readiness flags so the new component gets a
                        fresh prepare call instead of inheriting
                        stale state from the previous mode. */}
                    <Box
                      component="button"
                      onClick={() => {
                        setCameraModeTouched(true);
                        setCameraMode((m) => m === 'dual' ? 'single' : 'dual');
                        setPreparedId(null);
                        setPhonePaired(false);
                        setPublished(false);
                      }}
                      sx={{
                        bgcolor: 'transparent', border: 0, p: 0, m: 0,
                        cursor: 'pointer',
                        fontFamily: inkstashFonts.ui, fontSize: 11.5, fontWeight: 600,
                        color: inkstashColors.brand,
                        textDecoration: 'underline',
                        textUnderlineOffset: 2,
                        '&:hover': { color: inkstashColors.brandDeep },
                      }}
                    >
                      {cameraMode === 'dual'
                        ? 'Use this device instead'
                        : 'Pair a phone instead'}
                    </Box>
                  </Box>
                  {cameraMode === 'dual' ? (
                    <DualDevicePairing
                      title={details.title.trim() || 'Untitled show'}
                      description={details.description.trim() || undefined}
                      coverImageUrl={details.thumb.src || undefined}
                      onPrepared={setPreparedId}
                      onPaired={setPhonePaired}
                      published={published}
                    />
                  ) : (
                    <SingleDeviceCamera
                      title={details.title.trim() || 'Untitled show'}
                      description={details.description.trim() || undefined}
                      coverImageUrl={details.thumb.src || undefined}
                      onPrepared={setPreparedId}
                      onCameraReady={setPhonePaired}
                      published={published}
                    />
                  )}
                </Box>
              )}
            </Box>
          )}
        </Box>

        {publishError && (
          <Box sx={{
            px: 3, py: 1.25, bgcolor: inkstashColors.brandSoft,
            borderTop: `1px solid ${inkstashColors.brand}`,
            color: inkstashColors.brandDeep, fontSize: 13,
            fontFamily: inkstashFonts.ui,
          }}>
            {publishError}
          </Box>
        )}

        {/* Footer */}
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 2, p: 3, borderTop: `1px solid ${inkstashColors.border}`,
        }}>
          <HBtn
            variant="ghost"
            size="md"
            onClick={() => step === 0 ? handleHardClose() : setStep(step - 1)}
            disabled={publishing}
          >
            {step === 0 ? 'Cancel' : 'Back'}
          </HBtn>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography sx={{
              fontFamily: inkstashFonts.mono, fontSize: 11.5, color: inkstashColors.muted,
              display: { xs: 'none', sm: 'inline' },
            }}>
              {items.length} item{items.length === 1 ? '' : 's'} · {STEPS[step]}
            </Typography>
            {step === 3 ? (
              <HBtn
                variant="primary"
                size="md"
                onClick={handlePublish}
                // Live mode also requires the phone to be paired and
                // the stream to be prepared before publish enables.
                disabled={
                  publishing
                  || !details.title.trim()
                  || (mode === 'live' && (!preparedId || !phonePaired))
                  || (mode === 'schedule' && !details.scheduledAt)
                }
                icon={publishing
                  ? <CircularProgress size={14} sx={{ color: '#fff' }} />
                  : mode === 'live' ? <Zap size={15} strokeWidth={2.4} /> : undefined}
              >
                {publishing
                  ? 'Publishing…'
                  : mode === 'live'
                    ? (phonePaired ? 'Go live' : 'Connect phone to go live')
                    : 'Schedule show'}
              </HBtn>
            ) : (
              <HBtn
                variant="dark"
                size="md"
                onClick={() => setStep(step + 1)}
                disabled={!canAdvance}
              >
                Continue
              </HBtn>
            )}
          </Box>
        </Box>
      </Box>
    </Modal>
  );
}

function StepChip({
  n, label, state, onClick,
}: {
  n: number;
  label: string;
  state: 'pending' | 'active' | 'done';
  onClick: () => void;
}) {
  const isActive = state === 'active';
  const isDone = state === 'done';
  return (
    <Box
      component="button"
      onClick={onClick}
      disabled={state === 'pending'}
      sx={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        background: 'none',
        border: 0,
        cursor: state === 'pending' ? 'default' : 'pointer',
        pr: 2.5,
        pl: 0.5,
        pb: 1.5,
        fontFamily: inkstashFonts.ui,
        fontSize: 13,
        fontWeight: 600,
        color: isActive ? inkstashColors.ink : isDone ? inkstashColors.ink2 : inkstashColors.muted,
        whiteSpace: 'nowrap',
        '&::after': isActive ? {
          content: '""',
          position: 'absolute',
          left: 8, right: 12, bottom: -1,
          height: 2,
          bgcolor: inkstashColors.brand,
        } : undefined,
      }}
    >
      <Box sx={{
        width: 22, height: 22, borderRadius: '50%',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: isDone ? inkstashColors.brand : isActive ? inkstashColors.ink : inkstashColors.bgSunken,
        color: (isDone || isActive) ? '#fff' : inkstashColors.muted,
        fontFamily: inkstashFonts.mono, fontSize: 11, fontWeight: 700,
        flexShrink: 0,
      }}>
        {isDone ? <Check size={12} strokeWidth={3} /> : n}
      </Box>
      {label}
    </Box>
  );
}

