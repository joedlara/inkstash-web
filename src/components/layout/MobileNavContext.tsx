import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface MobileNavContextValue {
  hidden: boolean;
  setHidden: (next: boolean) => void;
}

const MobileNavContext = createContext<MobileNavContextValue>({
  hidden: false,
  setHidden: () => {},
});

export function MobileNavProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);
  return (
    <MobileNavContext.Provider value={{ hidden, setHidden }}>
      {children}
    </MobileNavContext.Provider>
  );
}

export function useMobileNav() {
  return useContext(MobileNavContext);
}

export function useSuppressMobileNav() {
  const { setHidden } = useMobileNav();
  useEffect(() => {
    setHidden(true);
    return () => setHidden(false);
  }, [setHidden]);
}
