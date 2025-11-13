declare namespace JSX {
  interface IntrinsicElements {
    'add-to-calendar-button': {
      name?: string;
      description?: string;
      startDate?: string;
      startTime?: string;
      endDate?: string;
      endTime?: string;
      timeZone?: string;
      location?: string;
      options?: string[] | string;
      buttonStyle?: 'default' | 'round' | 'neumorphism' | 'flat' | '3d' | 'date';
      lightMode?: 'system' | 'dark' | 'light' | 'bodyScheme';
      size?: string | number;
      trigger?: 'click' | 'hover';
      inline?: boolean;
      listStyle?: 'dropdown' | 'modal' | 'overlay';
      hideIconButton?: boolean;
      hideIconList?: boolean;
      hideIconModal?: boolean;
      hideTextLabelButton?: boolean;
      hideTextLabelList?: boolean;
      hideBackground?: boolean;
      hideCheckmark?: boolean;
      hideBranding?: boolean;
      buttonsList?: boolean;
      language?: string;
      customLabels?: string;
      customCss?: string;
      children?: React.ReactNode;
    };
  }
}

export {};
