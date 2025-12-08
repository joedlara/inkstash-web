// Type definitions for Plaid Link
interface PlaidLinkHandler {
  open: () => void;
  exit: () => void;
  destroy: () => void;
}

interface PlaidLinkOptions {
  token: string;
  onSuccess: (publicToken: string | null, metadata: any) => void;
  onExit?: (error: any, metadata: any) => void;
  onEvent?: (eventName: string, metadata: any) => void;
  onLoad?: () => void;
}

interface PlaidStatic {
  create: (options: PlaidLinkOptions) => PlaidLinkHandler;
}

interface Window {
  Plaid: PlaidStatic;
}
