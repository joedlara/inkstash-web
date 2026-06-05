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

import { useState } from 'react';
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

export default function GoLiveComposer({ open, mode, onClose, onPublished }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [details, setDetails] = useState<ComposerDetails>(DEFAULT_DETAILS);
  const [items, setItems] = useState<ComposerItem[]>([]);
  const [settings, setSettings] = useState<ComposerSettings>(DEFAULT_SETTINGS);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  // Reset on close so reopening the modal doesn't show stale state.
  function handleClose() {
    if (publishing) return;
    setStep(0);
    setDetails(DEFAULT_DETAILS);
    setItems([]);
    setSettings(DEFAULT_SETTINGS);
    setPublishError(null);
    onClose();
  }

  const canAdvance = step === 0 ? details.title.trim().length > 0 : true;

  async function handlePublish() {
    setPublishing(true);
    setPublishError(null);
    try {
      if (mode === 'live') {
        // Live mode: stream row already exists from DualDevicePairing's
        // prepare call on Step 4 mount. Persist items, then flip status
        // 'preparing' -> 'live' via goLive(). No second start() call.
        if (!preparedId) throw new Error('Stream not prepared. Close and try again.');
        if (user?.id && items.length > 0) {
          const result = await persistComposerItems({
            items, livestreamId: preparedId, userId: user.id,
          });
          if (result.failed > 0) {
            console.warn(`[GoLiveComposer] ${result.failed}/${items.length} lots failed to persist`);
          }
        }
        await livestreamsAPI.goLive(preparedId);
        onPublished?.(preparedId, mode);
        handleClose();
        return;
      }

      // Schedule mode: legacy start() path. No phone needed.
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
      handleClose();
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
                  <Typography sx={{
                    fontFamily: inkstashFonts.mono, fontSize: 11, fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    color: inkstashColors.muted, mb: 2,
                  }}>
                    Connect your camera
                  </Typography>
                  <DualDevicePairing
                    title={details.title.trim() || 'Untitled show'}
                    description={details.description.trim() || undefined}
                    coverImageUrl={details.thumb.src || undefined}
                    onPrepared={setPreparedId}
                    onPaired={setPhonePaired}
                  />
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
            onClick={() => step === 0 ? handleClose() : setStep(step - 1)}
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

