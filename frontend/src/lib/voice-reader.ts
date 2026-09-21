import type { Locale } from '@/locales';

export function getSpeechLanguage(locale: Locale): 'id-ID' | 'en-US' {
  return locale === 'en' ? 'en-US' : 'id-ID';
}

export function selectVoiceForLocale(
  voices: readonly SpeechSynthesisVoice[],
  locale: Locale
): SpeechSynthesisVoice | undefined {
  const normalized = voices.map((voice) => ({
    voice,
    lang: voice.lang.toLowerCase(),
  }));

  const exactPreference = locale === 'en' ? ['en-us', 'en-gb'] : ['id-id'];
  for (const language of exactPreference) {
    const match = normalized.find(({ lang }) => lang === language);
    if (match) return match.voice;
  }

  const prefix = locale === 'en' ? 'en' : 'id';
  return normalized.find(({ lang }) => lang === prefix || lang.startsWith(`${prefix}-`))?.voice;
}
