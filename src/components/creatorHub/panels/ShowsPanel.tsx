// src/components/creatorHub/panels/ShowsPanel.tsx
//
// "Shows" — first sub-tab of the Stream panel. Upcoming / Past tab
// switcher + a grid of ShowCards. Schedule a show CTA in the header
// will open the Go Live composer (a future commit); for now it logs
// so the rail surfaces don't dead-end.

import { useEffect, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { CalendarPlus, HelpCircle, Sliders, Radio } from 'lucide-react';
import HubPanelFrame from '../HubPanelFrame';
import HBtn from '../HBtn';
import ShowCard from '../ShowCard';
import { livestreamsAPI, type Livestream } from '../../../api/livestreams';
import { useAuth } from '../../../hooks/useAuth';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../../theme/inkstashTokens';

type SubTab = 'upcoming' | 'past';

interface Props {
  /** Opens the Go Live composer in Schedule mode. */
  onSchedule?: () => void;
  /** Opens the Go Live composer in Live (go-live-now) mode. */
  onGoLive?: () => void;
}

export default function ShowsPanel({ onSchedule, onGoLive }: Props) {
  const { user } = useAuth();
  const [sub, setSub] = useState<SubTab>('upcoming');
  const [upcoming, setUpcoming] = useState<Livestream[]>([]);
  const [past, setPast] = useState<Livestream[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    livestreamsAPI.listMyShows(user.id).then((res) => {
      if (cancelled) return;
      setUpcoming(res.upcoming);
      setPast(res.past);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [user]);

  const list = sub === 'upcoming' ? upcoming : past;

  return (
    <HubPanelFrame
      eyebrow="Stream management"
      title="Shows"
      sub="Schedule shows, review past streams, and jump into live control."
      actions={(
        <>
          <HBtn variant="ghost" size="sm" icon={<Sliders size={15} strokeWidth={2.3} />}>
            Stream tools
          </HBtn>
          <HBtn variant="ghost" size="sm" icon={<HelpCircle size={15} strokeWidth={2.3} />}>
            Going live help
          </HBtn>
          <HBtn variant="ghost" size="sm" icon={<Radio size={15} strokeWidth={2.3} />} onClick={onGoLive}>
            Go live now
          </HBtn>
          <HBtn variant="primary" size="sm" icon={<CalendarPlus size={15} strokeWidth={2.3} />} onClick={onSchedule}>
            Schedule a show
          </HBtn>
        </>
      )}
    >
      {/* Sub-tab strip */}
      <Box sx={{
        display: 'flex',
        gap: 3.25,
        borderBottom: `1px solid ${inkstashColors.border}`,
        mb: 3,
      }}>
        <SubTabBtn label="Upcoming" active={sub === 'upcoming'} onClick={() => setSub('upcoming')} />
        <SubTabBtn label="Past" active={sub === 'past'} onClick={() => setSub('past')} />
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={28} sx={{ color: inkstashColors.brand }} />
        </Box>
      ) : list.length === 0 ? (
        <Box sx={{
          bgcolor: inkstashColors.bgElev,
          border: `1px dashed ${inkstashColors.border}`,
          borderRadius: inkstashRadii.lg,
          p: 6,
          textAlign: 'center',
        }}>
          <Typography sx={{
            fontFamily: inkstashFonts.display, fontWeight: 800, fontSize: 18,
            textTransform: 'uppercase', letterSpacing: '0.01em',
            color: inkstashColors.ink, mb: 1,
          }}>
            {sub === 'upcoming' ? 'No shows scheduled' : 'No past shows yet'}
          </Typography>
          <Typography sx={{
            fontFamily: inkstashFonts.ui, fontSize: 13,
            color: inkstashColors.muted, mb: sub === 'upcoming' ? 2 : 0,
          }}>
            {sub === 'upcoming'
              ? 'Schedule a show so your followers can set reminders.'
              : 'Once you run your first stream, the recap lands here.'}
          </Typography>
          {sub === 'upcoming' && (
            <HBtn variant="primary" size="sm" icon={<CalendarPlus size={15} strokeWidth={2.3} />} onClick={onSchedule}>
              Schedule a show
            </HBtn>
          )}
        </Box>
      ) : (
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
          gap: 2.25,
        }}>
          {list.map((s) => <ShowCard key={s.id} stream={s} variant={sub} />)}
        </Box>
      )}
    </HubPanelFrame>
  );
}

function SubTabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <Box
      component="button"
      onClick={onClick}
      sx={{
        position: 'relative',
        background: 'none',
        border: 0,
        cursor: 'pointer',
        fontFamily: inkstashFonts.ui,
        fontWeight: 600,
        fontSize: 14,
        color: active ? inkstashColors.ink : inkstashColors.muted,
        pb: 1.4,
        transition: 'color 120ms ease',
        '&:hover': { color: inkstashColors.ink2 },
        '&::after': active ? {
          content: '""',
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: -1,
          height: 2,
          bgcolor: inkstashColors.brand,
        } : undefined,
      }}
    >
      {label}
    </Box>
  );
}
