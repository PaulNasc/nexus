import React from 'react';

export interface TooltipProps {
  content: string;
  children: React.ReactNode;
  placement?: 'top' | 'bottom';
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, placement = 'top' }) => {
  if (!content) {
    return <>{children}</>;
  }

  return (
    <span className={`tooltip-wrapper tooltip-${placement}`} tabIndex={0}>
      {children}
      <span className="tooltip-bubble" role="tooltip">
        {content}
      </span>
    </span>
  );
};
