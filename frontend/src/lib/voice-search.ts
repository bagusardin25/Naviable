/**
 * Utilitas pemrosesan teks, fuzzy matching, dan error untuk fitur pencarian suara (Voice Search)
 */
import type { Place } from '@/types';
import type { Locale } from '@/locales';
import { normalizeStreetText } from './streetSearch';

/**
 * Membersihkan hasil transkrip suara pengguna:
 * 1. Menghapus tanda baca di akhir (misalnya titik atau koma yang sering ditambahkan peramban).
 * 2. Menghapus awalan perintah lisan seperti "cari", "carikan", atau "pencarian".
 * 3. Menghapus spasi berlebih.
 */
export function cleanVoiceQuery(raw: string): string {
  if (!raw) return '';

  let cleaned = raw.trim();

  // Bersihkan tanda baca di akhir kalimat yang sering dihasilkan SpeechRecognition
  cleaned = cleaned.replace(/[.,?!;:~]+$/g, '').trim();

  // Bersihkan awalan kata perintah lisan bahasa Indonesia ("cari", "carikan", "pencarian")
  // Contoh: "Cari Puskesmas Jagir" -> "Puskesmas Jagir"
  // Namun jika ucapannya hanya "Cari" saja, jangan jadikan string kosong jika tidak ada kelanjutannya.
  const prefixMatch = cleaned.match(/^(?:cari(?:kan)?|pencarian|search(?:\s+for)?|find|look\s+for)\s+(.+)$/i);
  if (prefixMatch && prefixMatch[1]?.trim()) {
    cleaned = prefixMatch[1].trim();
  }

  // Bersihkan lagi tanda baca jika masih ada setelah regex
  cleaned = cleaned.replace(/[.,?!;:~]+$/g, '').trim();

  return cleaned;
}

/**
 * Pemetaan kode error Web Speech API ke pesan bahasa Indonesia yang ramah dan aksesibel.
 */
export function getVoiceErrorMessage(errorCode: string, locale: Locale = 'id'): string {
  if (locale === 'en') {
    switch (errorCode) {
      case 'not-allowed':
      case 'permission-denied':
        return 'Microphone permission was denied. Enable microphone access in your browser settings to use voice search.';
      case 'no-speech':
        return 'No speech was detected. Please try again and speak closer to the microphone.';
      case 'network':
        return 'Voice recognition is unavailable because of a network problem.';
      case 'audio-capture':
        return 'No microphone was found, or it is being used by another application.';
      case 'not-supported':
        return 'This browser does not support voice recognition. Please use Google Chrome, Edge, or another modern browser.';
      case 'aborted':
        return 'Voice search was cancelled.';
      default:
        return 'There was a problem processing your voice. Please try again shortly.';
    }
  }

  switch (errorCode) {
    case 'not-allowed':
    case 'permission-denied':
      return 'Izin mikrofon ditolak. Mohon aktifkan izin mikrofon di pengaturan peramban Anda untuk menggunakan pencarian suara.';
    case 'no-speech':
      return 'Tidak ada suara terdeteksi. Silakan coba lagi dan bicara lebih dekat ke mikrofon.';
    case 'network':
      return 'Layanan pengenalan suara terganggu karena masalah koneksi internet.';
    case 'audio-capture':
      return 'Mikrofon tidak ditemukan atau sedang digunakan oleh aplikasi lain.';
    case 'not-supported':
      return 'Peramban ini belum mendukung pengenalan suara langsung. Silakan gunakan Google Chrome, Edge, atau peramban modern lainnya.';
    case 'aborted':
      return 'Pencarian suara dibatalkan.';
    default:
      return 'Terjadi kendala saat memproses suara. Silakan coba beberapa saat lagi.';
  }
}

/**
 * Menghitung jarak Levenshtein antara dua string.
 */
export function levenshteinDistance(a: string, b: string): number {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;

  const matrix: number[][] = Array.from({ length: bn + 1 }, (_, i) => [i]);
  for (let j = 0; j <= an; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= bn; i++) {
    for (let j = 1; j <= an; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[bn][an];
}

/**
 * Menghitung nilai kemiripan string dari 0.0 (berbeda total) hingga 1.0 (persis sama).
 */
export function stringSimilarity(a: string, b: string): number {
  const s1 = a.trim().toLowerCase();
  const s2 = b.trim().toLowerCase();
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;

  const dist = levenshteinDistance(s1, s2);
  return Math.max(0, (maxLen - dist) / maxLen);
}

/**
 * Memecah string menjadi token kata-kata bersih.
 */
export function tokenizeWords(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export type PlaceMatchResult = {
  place: Place;
  score: number;
  isSpecificMatch: boolean;
};

/**
 * Mencari tempat terbaik berdasarkan query pencarian (termasuk toleransi salah eja lisan/fuzzy).
 * Contoh kasus: "Pakkuon City Mall" cocok dengan "Pakuwon City Mall".
 */
export function findBestMatchingPlace(
  rawQuery: string,
  places: Place[]
): PlaceMatchResult | null {
  const query = cleanVoiceQuery(rawQuery).trim().toLowerCase();
  if (!query || places.length === 0) return null;

  const queryTokens = tokenizeWords(query);
  if (queryTokens.length === 0) return null;

  // Deteksi pencarian kategori umum (misal: "puskesmas", "halte", "taman", "stasiun")
  const matchingCategoryPlaces = places.filter(
    (p) => p.category.toLowerCase() === query || p.rawCategory.toLowerCase() === query
  );
  if (matchingCategoryPlaces.length > 1 && queryTokens.length <= 1) {
    return {
      place: matchingCategoryPlaces[0],
      score: 0.5,
      isSpecificMatch: false,
    };
  }

  let bestMatch: PlaceMatchResult | null = null;
  let highestScore = 0;

  for (const place of places) {
    const nameLower = place.name.toLowerCase();
    const addressLower = (place.address || '').toLowerCase();
    const nameTokens = tokenizeWords(nameLower);

    let score = 0;

    // 1. Exact match nama tempat
    if (nameLower === query) {
      score = 1.0;
    }
    // 2. Query merupakan substring utuh dari nama tempat, atau sebaliknya
    else if (nameLower.includes(query)) {
      score = nameLower.startsWith(query) ? 0.94 : 0.88;
    } else if (query.includes(nameLower)) {
      score = 0.88;
    }
    // 3. String similarity & Token-level fuzzy match
    else {
      const overallSim = stringSimilarity(query, nameLower);

      let tokenSimSum = 0;
      for (const qToken of queryTokens) {
        let bestTokenSim = 0;
        for (const nToken of nameTokens) {
          let sim = stringSimilarity(qToken, nToken);
          // Bonus jika token adalah prefix
          if (nToken.startsWith(qToken) || qToken.startsWith(nToken)) {
            sim = Math.max(sim, 0.85);
          }
          if (sim > bestTokenSim) {
            bestTokenSim = sim;
          }
        }
        tokenSimSum += bestTokenSim;
      }
      const avgTokenSim = tokenSimSum / queryTokens.length;

      score = Math.max(overallSim, avgTokenSim);

      // Cek apakah ada kecocokan di alamat dan nama jalan jika nama belum pas
      if (addressLower) {
        const normQuery = normalizeStreetText(query);
        const normAddress = normalizeStreetText(addressLower);
        if (normAddress.includes(normQuery)) {
          score = Math.max(score, 0.85);
        } else if (addressLower.includes(query)) {
          score = Math.max(score, 0.75);
        }
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = {
        place,
        score,
        isSpecificMatch: score >= 0.65,
      };
    }
  }

  if (bestMatch && highestScore >= 0.6) {
    return bestMatch;
  }

  return null;
}
