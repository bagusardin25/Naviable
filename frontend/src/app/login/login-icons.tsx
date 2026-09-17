export function AccessibilityIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="2.4" />
      <circle cx="15.8" cy="8.3" r="2.4" fill="currentColor" />
      <path d="m15.8 12-.7 7h6l2.5 5M16 14l4 3M15 18l-4 5-4-1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 14a7 7 0 0 0 6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.04.97-3.38.97-2.61 0-4.83-1.76-5.62-4.12H3.04v2.59A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.38 13.93a6 6 0 0 1 0-3.86V7.48H3.04a10 10 0 0 0 0 9.04l3.34-2.59Z" />
      <path fill="#EA4335" d="M12 5.95c1.47 0 2.79.51 3.83 1.51L18.7 4.6A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.48l3.34 2.59A6 6 0 0 1 12 5.95Z" />
    </svg>
  );
}

export function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M27.5 15.5a11.5 11.5 0 0 1-17.1 10L4 27l1.6-6.1A11.5 11.5 0 1 1 27.5 15.5Z" stroke="currentColor" strokeWidth="2.3" strokeLinejoin="round" />
      <path d="m11.2 9.4 1.5 3c.2.5-.3 1-.9 1.6-.4.4.6 2 1.8 3.1 1.2 1.2 2.7 1.9 3.1 1.5l1.4-1.6c.3-.3.7-.2 1.1 0l2.7 1.4c.4.2.5.5.3 1-.6 2-1.9 2.6-3.6 2.3-2.7-.5-5.3-2.1-7.1-4.1-1.9-2.1-3.2-4.4-2.8-6.1.2-1.1 1.1-2.4 1.8-2.4.4 0 .5 0 .7.3Z" fill="currentColor" />
    </svg>
  );
}

export function SpeakerIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M5 12h5l7-6v20l-7-6H5Z" fill="currentColor" />
      <path d="M22 11a8 8 0 0 1 0 10m4-14a13 13 0 0 1 0 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function WaveformIcon() {
  return (
    <svg viewBox="0 0 42 30" fill="none" aria-hidden="true">
      {[10, 17, 22, 15, 19, 12, 20].map((height, index) => (
        <path key={index} d={`M${3 + index * 6} ${(30 - height) / 2}v${height}`} stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity={0.62 + index * 0.055} />
      ))}
    </svg>
  );
}

export function LoginIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M3 12h11m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
