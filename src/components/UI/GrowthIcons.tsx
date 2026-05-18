import React from 'react';

type IconProps = {
  size?: number;
  className?: string;
};

const baseProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export const SeedlingIcon = ({ size = 20, className = '' }: IconProps) => (
  <svg width={size} height={size} {...baseProps} className={className} aria-hidden>
    <path d="M12 21v-7" />
    <path d="M12 14c0-4 3-6.5 7-6.5C19 11.5 16 14 12 14z" />
    <path d="M6 21h12" />
  </svg>
);

export const BuddingIcon = ({ size = 20, className = '' }: IconProps) => (
  <svg width={size} height={size} {...baseProps} className={className} aria-hidden>
    <path d="M12 21V5" />
    <path d="M12 12c0-3.5 2.5-6 6-6 0 3.5-2.5 6-6 6z" />
    <path d="M12 16c0-3-2.5-5.5-5.5-5.5 0 3 2.5 5.5 5.5 5.5z" />
    <path d="M6 21h12" />
  </svg>
);

export const EvergreenIcon = ({ size = 20, className = '' }: IconProps) => (
  <svg width={size} height={size} {...baseProps} className={className} aria-hidden>
    <path d="M12 21v-2.5" />
    <path d="M12 4c-3.5 0-5.5 4-6 7h12c-0.5-3-2.5-7-6-7z" />
    <path d="M12 11c-3 0-5 3.5-5.5 6.5h11C17 14.5 15 11 12 11z" />
    <path d="M7 21h10" />
  </svg>
);

export type GrowthStage = 'seedling' | 'budding' | 'evergreen';

export function GrowthIcon({
  stage,
  size = 20,
  className = '',
}: {
  stage: GrowthStage;
  size?: number;
  className?: string;
}) {
  if (stage === 'seedling') return <SeedlingIcon size={size} className={className} />;
  if (stage === 'budding') return <BuddingIcon size={size} className={className} />;
  return <EvergreenIcon size={size} className={className} />;
}
