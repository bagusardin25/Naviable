'use client';

import React from 'react';
import Image from 'next/image';

export type BrandLogoProps = {
  size?: number;
  className?: string;
  priority?: boolean;
  alt?: string;
  theme?: 'auto' | 'light' | 'dark';
};

/**
 * BrandLogo renders the official Naviable logo adapting automatically to the
 * active dark/light theme, with support for explicit theme overrides.
 */
export function BrandLogo({
  size = 36,
  className = '',
  priority = false,
  alt = 'NaviAble Logo',
  theme = 'auto',
}: BrandLogoProps) {
  const isLightForced = theme === 'light';
  const isDarkForced = theme === 'dark';

  return (
    <span
      className={`brand-logo-wrap ${className}`.trim()}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
      }}
    >
      {!isDarkForced && (
        <Image
          src="/branding/logo-light.png"
          alt={alt}
          width={size}
          height={size}
          priority={priority}
          className={`brand-logo-img brand-logo-light ${isLightForced ? 'brand-logo-forced' : ''}`}
        />
      )}
      {!isLightForced && (
        <Image
          src="/branding/logo-dark.png"
          alt={alt}
          width={size}
          height={size}
          priority={priority}
          className={`brand-logo-img brand-logo-dark ${isDarkForced ? 'brand-logo-forced' : ''}`}
        />
      )}
    </span>
  );
}
