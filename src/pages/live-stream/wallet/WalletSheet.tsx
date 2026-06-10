// WalletSheet — in-stream centered modal for the 402 'no_card_on_file'
// handshake. Replaces the deleted MUI WalletDrawer (Phase 1 teardown).
// Uses the prototype's .ls-wallet-sheet CSS for the chrome (grip,
// icon, title, secure footer) and Stripe's PaymentElement for the
// actual card collection. On confirmSetup() success we dispatch
// 'inkstash:wallet-card-ready' so useLiveAuction retries the
// pending bid.
//
// Body scroll is locked while open; Esc and click-on-scrim dismiss.
// We optionally jump straight into the add-card form when opened
// from a 402 (autoOpenAddCard=true) — otherwise we list the viewer's
// saved cards inline so they can switch the default.
import { useCallback, useEffect, useState } from 'react';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { paymentMethodsAPI, type UserPaymentMethod } from '../../../api/paymentMethods';
import { getStripe } from '../../../config/stripe';

type Props = {
  open: boolean;
  onClose: () => void;
  /** When true (e.g. opened from a 402), skip the saved-cards summary
   *  and mount the add-card form immediately. */
  autoOpenAddCard?: boolean;
};

export function WalletSheet({ open, onClose, autoOpenAddCard = false }: Props) {
  const [cards, setCards] = useState<UserPaymentMethod[] | null>(null);
  const [adding, setAdding] = useState(autoOpenAddCard);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await paymentMethodsAPI.listMine();
      setCards(list);
    } catch (err) {
      setError((err as Error).message ?? 'Failed to load cards');
    } finally {
      setLoading(false);
    }
  }, []);

  // Hydrate on open. Reset add-card state every open so the form
  // re-mints a fresh SetupIntent (Stripe client_secrets are one-shot).
  useEffect(() => {
    if (!open) return;
    void refresh();
    setAdding(autoOpenAddCard);
    setError(null);
  }, [open, autoOpenAddCard, refresh]);

  // Auto-flip to add-card when the viewer has no saved cards. No point
  // showing them an empty list.
  useEffect(() => {
    if (open && cards !== null && cards.length === 0) setAdding(true);
  }, [open, cards]);

  // Body scroll lock + Esc dismiss while mounted.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="ls-wallet-scrim"
      onClick={(e) => {
        // Only dismiss on scrim taps, not bubbles from the inner sheet.
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Wallet"
    >
      <div className="ls-wallet-sheet">
        <div className="ls-wallet-grip" />
        <div className="ls-wallet-icon" aria-hidden>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            width="22"
            height="22"
          >
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <path d="M2 10h20" />
          </svg>
        </div>
        <div className="ls-wallet-title">Wallet</div>
        <div className="ls-wallet-sub">
          Cards used for stream purchases and auction wins. Stored
          securely with Stripe — Inkstash never sees your card number.
        </div>

        {error && (
          <div
            style={{
              marginBottom: 12,
              padding: '10px 12px',
              borderRadius: 10,
              background: 'rgba(239, 68, 68, 0.12)',
              color: '#fda4a4',
              fontSize: 12.5,
              lineHeight: 1.4,
            }}
          >
            {error}
          </div>
        )}

        {loading && cards === null ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            Loading…
          </div>
        ) : adding ? (
          <AddCardSection
            onAdded={(newCard) => {
              setAdding(false);
              void refresh();
              if (newCard) {
                // Signal to anything listening (notably useLiveAuction)
                // that a card is now available — pending bids will
                // retry on this event.
                window.dispatchEvent(new CustomEvent('inkstash:wallet-card-ready'));
                onClose();
              }
            }}
            onCancel={() => {
              if (cards && cards.length === 0) onClose();
              else setAdding(false);
            }}
          />
        ) : (
          <>
            {(cards ?? []).map((card) => (
              <CardRow key={card.id} card={card} />
            ))}
            <button type="button" className="ls-wallet-add" onClick={() => setAdding(true)}>
              Add a card
            </button>
          </>
        )}

        <div className="ls-wallet-secure">
          <span className="ls-wallet-lock" />
          PCI-compliant · powered by Stripe
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// CardRow — compact saved-card summary (brand · last4 · exp). Default
// card gets a visual highlight. (We don't expose set-default here in
// Phase 3b; that lives in account settings.)
// ────────────────────────────────────────────────────────────────────

function CardRow({ card }: { card: UserPaymentMethod }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 13px',
        borderRadius: 11,
        border: card.is_default
          ? '1px solid var(--brand)'
          : '1px solid var(--border)',
        background: card.is_default ? 'var(--brand-soft)' : 'var(--bg-sunken)',
        marginBottom: 9,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13.5,
            fontWeight: 700,
            color: 'var(--ink)',
            textTransform: 'capitalize',
          }}
        >
          {card.card_brand} ····{card.card_last4}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10.5,
            color: 'var(--muted)',
            marginTop: 2,
          }}
        >
          {String(card.exp_month).padStart(2, '0')}/{String(card.exp_year).slice(-2)}
        </div>
      </div>
      {card.is_default && (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--brand)',
          }}
        >
          Default
        </span>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// AddCardSection — mints SetupIntent then mounts PaymentElement.
// On success polls listMine() until the webhook saves the row, then
// notifies the parent so the pending bid retries.
// ────────────────────────────────────────────────────────────────────

function AddCardSection({
  onAdded,
  onCancel,
}: {
  onAdded: (card: UserPaymentMethod | null) => void;
  onCancel: () => void;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { client_secret } = await paymentMethodsAPI.createSetupIntent();
        if (!cancelled) setClientSecret(client_secret);
      } catch (err) {
        if (!cancelled) setError((err as Error).message ?? 'Failed to start add card');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div>
        <div
          style={{
            marginBottom: 12,
            padding: '10px 12px',
            borderRadius: 10,
            background: 'rgba(239, 68, 68, 0.12)',
            color: '#fda4a4',
            fontSize: 12.5,
            lineHeight: 1.4,
          }}
        >
          {error}
        </div>
        <button type="button" className="ls-wallet-add" onClick={onCancel}>
          Close
        </button>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
        Preparing secure card form…
      </div>
    );
  }

  return (
    <Elements
      stripe={getStripe()}
      options={{
        clientSecret,
        appearance: {
          theme: 'night',
          variables: {
            colorPrimary: '#a1232c',
            colorBackground: '#1c1a20',
            colorText: '#faf7f2',
            colorTextSecondary: '#a8a4ad',
            colorDanger: '#ef4444',
            fontFamily: 'Geist, system-ui, sans-serif',
            borderRadius: '10px',
          },
        },
      }}
    >
      <AddCardForm onAdded={onAdded} onCancel={onCancel} />
    </Elements>
  );
}

function AddCardForm({
  onAdded,
  onCancel,
}: {
  onAdded: (card: UserPaymentMethod | null) => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [waitingForCard, setWaitingForCard] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setErr(null);

    const result = await stripe.confirmSetup({
      elements,
      // Stay in the sheet — no return_url redirect. Stripe still needs
      // the URL for SCA flows that REQUIRE a redirect (3DS); we set it
      // to the current page so worst case we just reload back into the
      // livestream.
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    });

    if (result.error) {
      setErr(result.error.message ?? 'Card add failed');
      setSubmitting(false);
      return;
    }

    // SetupIntent succeeded client-side. The Stripe webhook saves the
    // row in user_payment_methods within ~1-3s. Poll listMine() until
    // the row appears so we can notify the parent (which retries the
    // pending bid).
    setSubmitting(false);
    setWaitingForCard(true);
    const start = Date.now();
    while (Date.now() - start < 15_000) {
      const list = await paymentMethodsAPI.listMine();
      if (list.length > 0) {
        onAdded(list[0]);
        return;
      }
      await new Promise((r) => setTimeout(r, 800));
    }
    // Webhook is slow — close anyway; refresh in the parent will pick
    // the card up next time the sheet opens.
    onAdded(null);
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement options={{ layout: 'tabs' }} />
      {err && (
        <div
          style={{
            marginTop: 12,
            padding: '10px 12px',
            borderRadius: 10,
            background: 'rgba(239, 68, 68, 0.12)',
            color: '#fda4a4',
            fontSize: 12.5,
            lineHeight: 1.4,
          }}
        >
          {err}
        </div>
      )}
      {waitingForCard ? (
        <div
          style={{
            marginTop: 14,
            padding: '12px',
            borderRadius: 999,
            background: 'var(--brand-soft)',
            color: 'var(--brand)',
            fontSize: 13,
            fontWeight: 700,
            textAlign: 'center',
          }}
        >
          Saving card…
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 9, marginTop: 14 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              flex: 1,
              padding: 13,
              borderRadius: 12,
              border: '1px solid var(--border-strong)',
              background: 'transparent',
              color: 'var(--muted)',
              fontFamily: 'var(--font-ui)',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!stripe || submitting}
            className="ls-wallet-add"
            style={{ flex: 2, marginTop: 0 }}
          >
            {submitting ? 'Saving…' : 'Save card'}
          </button>
        </div>
      )}
    </form>
  );
}
