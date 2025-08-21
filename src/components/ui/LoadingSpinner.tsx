import React from 'react';
import '../../styles/ui/loadingSpinner.css';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'accent' | 'white';
  className?: string;
  text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color = 'primary',
  className = '',
  text,
}) => {
  return (
    <div className={`loading-spinner-container ${className}`}>
      <div className={`loading-spinner ${size} ${color}`}>
        <div className="spinner-circle"></div>
      </div>
      {text && <p className="spinner-text">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
