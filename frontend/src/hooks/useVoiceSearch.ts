'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { cleanVoiceQuery, getVoiceErrorMessage } from '@/lib/voice-search';

// Definisi antarmuka Web Speech API untuk kompatibilitas lintas peramban & TypeScript
interface IWindowWithSpeech extends Window {
  SpeechRecognition?: {
    new (): ISpeechRecognition;
  };
  webkitSpeechRecognition?: {
    new (): ISpeechRecognition;
  };
}

interface ISpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      length: number;
      [index: number]: {
        transcript: string;
        confidence: number;
      };
    };
  };
}

interface ISpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((this: ISpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: ISpeechRecognition, ev: ISpeechRecognitionEvent) => void) | null;
  onerror: ((this: ISpeechRecognition, ev: ISpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: ISpeechRecognition, ev: Event) => void) | null;
}

export type UseVoiceSearchOptions = {
  lang?: string;
  onResult?: (transcript: string) => void;
  onError?: (errorMessage: string) => void;
};

export type UseVoiceSearchResult = {
  isSupported: boolean;
  isListening: boolean;
  interimTranscript: string;
  errorMessage: string | null;
  startListening: () => void;
  stopListening: () => void;
  cancelListening: () => void;
  clearError: () => void;
};

export function useVoiceSearch({
  lang = 'id-ID',
  onResult,
  onError,
}: UseVoiceSearchOptions = {}): UseVoiceSearchResult {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const isManuallyAbortedRef = useRef(false);
  const latestTranscriptRef = useRef('');

  // Periksa dukungan Web Speech API saat mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const speechWindow = window as unknown as IWindowWithSpeech;
    const hasSpeechSupport = Boolean(
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition
    );
    setIsSupported(hasSpeechSupport);
  }, []);

  // Simpan callback terbaru agar tidak menyebabkan re-instansiasi
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const cancelListening = useCallback(() => {
    isManuallyAbortedRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Abaikan jika sudah berhenti
      }
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Abaikan jika sudah berhenti
      }
    }
  }, []);

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;

    setErrorMessage(null);
    setInterimTranscript('');
    latestTranscriptRef.current = '';
    isManuallyAbortedRef.current = false;

    const speechWindow = window as unknown as IWindowWithSpeech;
    const SpeechRecognitionConstructor =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) {
      const unsupportedMsg = getVoiceErrorMessage('not-supported');
      setErrorMessage(unsupportedMsg);
      onErrorRef.current?.(unsupportedMsg);
      return;
    }

    try {
      // Hentikan sesi sebelumnya jika ada
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }

      const recognition = new SpeechRecognitionConstructor();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = lang;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMessage(null);
      };

      recognition.onresult = (event: ISpeechRecognitionEvent) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          const text = result[0]?.transcript || '';
          if (result.isFinal) {
            final += text;
          } else {
            interim += text;
          }
        }

        if (interim) {
          setInterimTranscript(interim);
        }

        if (final) {
          const cleaned = cleanVoiceQuery(final);
          latestTranscriptRef.current = cleaned;
          setInterimTranscript(cleaned);
          if (cleaned && onResultRef.current) {
            onResultRef.current(cleaned);
          }
        }
      };

      recognition.onerror = (event: ISpeechRecognitionErrorEvent) => {
        // Jangan laporkan error jika pembatalan dilakukan sengaja oleh pengguna
        if (event.error === 'aborted' && isManuallyAbortedRef.current) {
          setIsListening(false);
          return;
        }

        const friendlyMsg = getVoiceErrorMessage(event.error);
        setErrorMessage(friendlyMsg);
        setIsListening(false);
        onErrorRef.current?.(friendlyMsg);
      };

      recognition.onend = () => {
        setIsListening(false);
        // Jika recognition selesai dan ada transkrip interim yang belum difinalisasi
        if (!latestTranscriptRef.current && interimTranscript.trim()) {
          const cleaned = cleanVoiceQuery(interimTranscript);
          if (cleaned) {
            latestTranscriptRef.current = cleaned;
            onResultRef.current?.(cleaned);
          }
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      const friendlyMsg =
        err instanceof Error ? err.message : getVoiceErrorMessage('unknown');
      setErrorMessage(friendlyMsg);
      setIsListening(false);
      onErrorRef.current?.(friendlyMsg);
    }
  }, [lang, interimTranscript]);

  // Bersihkan saat komponen unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    interimTranscript,
    errorMessage,
    startListening,
    stopListening,
    cancelListening,
    clearError,
  };
}
