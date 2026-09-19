'use client';

import React, { useEffect, useState } from 'react';
import { useAccessibility } from '@/hooks/useAccessibility';

export function ReadingGuideOverlay() {
  const { settings } = useAccessibility();
  const [positionY, setPositionY] = useState<number>(300);

  useEffect(() => {
    if (!settings.readingGuide) return;

    function handlePointerMove(e: MouseEvent | TouchEvent) {
      if ('clientY' in e && typeof e.clientY === 'number') {
        setPositionY(e.clientY);
      } else if ('touches' in e && e.touches.length > 0) {
        setPositionY(e.touches[0].clientY);
      }
    }

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
    };
  }, [settings.readingGuide]);

  if (!settings.readingGuide) return null;

  return (
    <div
      className="reading-guide-container"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        top: positionY - 20,
        height: '40px',
        pointerEvents: 'none',
        zIndex: 9999,
        transition: 'top 0.05s ease-out',
      }}
      aria-hidden="true"
    >
      <div className="reading-guide-bar" />
    </div>
  );
}
