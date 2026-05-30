// src/components/listings/SellerConnectGate.tsx
//
// Wraps any "start selling" affordance (the List for sale button on MyStash,
// the /list-item wizard, etc.) and intercepts unverified users with the
// ConnectOnboardingModal.
//
// If user.seller_status === 'active': renders children normally.
// Otherwise: renders children but their onClick is intercepted to open the
// modal instead. The children are wrapped so they can't accidentally fire.
//
// Usage:
//   <SellerConnectGate>
//     <Button onClick={handleList}>List for sale</Button>
//   </SellerConnectGate>

import { Children, cloneElement, isValidElement, useState, type ReactElement, type MouseEvent } from 'react';
import { useAuth } from '../../hooks/useAuth';
import ConnectOnboardingModal from './ConnectOnboardingModal';

interface Props {
  children: ReactElement;
  /** Optional: render something else (e.g. a tooltip) instead of the child when not active. */
  fallback?: ReactElement;
}

export default function SellerConnectGate({ children, fallback }: Props) {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  const isActive = user?.seller_status === 'active';

  if (isActive) {
    return Children.only(children);
  }

  if (fallback) {
    // Wrap the fallback in a click handler that opens the modal
    const wrapped = isValidElement(fallback)
      ? cloneElement(fallback as ReactElement<{ onClick?: (e: MouseEvent) => void }>, {
          onClick: (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setModalOpen(true);
          },
        })
      : fallback;

    return (
      <>
        {wrapped}
        <ConnectOnboardingModal open={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    );
  }

  // Default: wrap the child element so clicks open the modal
  const wrappedChild = cloneElement(children as ReactElement<{ onClick?: (e: MouseEvent) => void }>, {
    onClick: (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setModalOpen(true);
    },
  });

  return (
    <>
      {wrappedChild}
      <ConnectOnboardingModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
