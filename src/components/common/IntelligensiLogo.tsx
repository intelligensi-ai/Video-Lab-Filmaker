/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { VideoLabLogo, VideoLabLogoProps } from './VideoLabLogo';

export interface IntelligensiLogoProps extends Omit<VideoLabLogoProps, 'variant'> {
  variant?: 'full' | 'mark' | 'graphic' | 'badge' | 'text';
}

/**
 * Re-exporting VideoLabLogo as the primary brand logo across the platform.
 */
export const IntelligensiLogo: React.FC<IntelligensiLogoProps> = ({
  className = '',
  height = 28,
  variant = 'full',
  theme = 'light',
  subtitle,
}) => {
  const mappedVariant = variant === 'graphic' || variant === 'badge' ? 'full' : variant;
  return (
    <VideoLabLogo
      className={className}
      height={height}
      variant={mappedVariant}
      theme={theme}
      subtitle={subtitle}
    />
  );
};
