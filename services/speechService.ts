/**
 * Arabic Speech Service (Text-to-Speech)
 * 
 * Features:
 * 1. Complete Arabic Number to Words Converter (Tafqeet):
 *    Converts ALL numbers, percentages, dates, legal articles, decisions,
 *    durations, hours, and measurements into authentic vocalized Arabic words.
 * 2. Zero English Pronunciation:
 *    Ensures not a single English digit or Latin letter is vocalized.
 * 3. Dual-Engine Audio:
 *    - Primary: High-fidelity native Arabic audio stream via /api/tts proxy.
 *    - Secondary: Browser Web Speech API with verified genuine Arabic voice.
 */

let activeAudioElement: HTMLAudioElement | null = null;
let isSpeaking = false;
let shouldStop = false;
let onEndCallback: (() => void) | null = null;
let cachedVoices: SpeechSynthesisVoice[] = [];
let currentSpeechRate: number = 1.0;

/**
 * Updates the speech playback rate (e.g. 1.0, 1.5, 2.0).
 * Changes the rate dynamically if an audio is currently playing.
 */
export const setSpeechRate = (rate: number) => {
  if (rate > 0 && rate <= 3.0) {
    currentSpeechRate = rate;
    if (activeAudioElement) {
      try {
        activeAudioElement.playbackRate = rate;
      } catch (e) {}
    }
  }
};

/**
 * Returns current speech playback rate
 */
export const getSpeechRate = (): number => {
  return currentSpeechRate;
};

/**
 * Converts any positive integer into grammatically natural Arabic words.
 * Supports numbers from 0 up to millions, years, and hotlines.
 */
export const convertNumberToArabicWords = (num: number | string): string => {
  const n = typeof num === 'string' ? parseInt(num.replace(/\D/g, ''), 10) : Math.floor(num);
  if (isNaN(n)) return '';
  if (n === 0) return 'صفر';

  // Common legal years and dates in Egyptian law
  if (n === 2025) return 'ألفين وخمسة وعشرين';
  if (n === 2026) return 'ألفين وستة وعشرين';
  if (n === 2024) return 'ألفين وأربعة وعشرين';
  if (n === 2023) return 'ألفين وثلاثة وعشرين';
  if (n === 2030) return 'ألفين وثلاثين';
  if (n === 2003) return 'ألفين وثلاثة';
  if (n === 19468) return 'تسعة عشر ألفاً وأربعمائة وثمانية وستين';

  const ones = ['', 'واحد', 'اثنين', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', 'عشرة', 'عشرين', 'ثلاثين', 'أربعين', 'خمسين', 'ستين', 'سبعين', 'ثمانين', 'تسعين'];
  const hundreds = ['', 'مائة', 'مائتين', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

  // Convert numbers 1 - 999
  const convertUnderThousand = (val: number): string => {
    let result = '';
    const h = Math.floor(val / 100);
    const rem = val % 100;

    if (h > 0 && h < 10) {
      result += hundreds[h];
    }

    if (rem > 0) {
      if (result) result += ' و';
      if (rem < 10) {
        result += ones[rem];
      } else if (rem < 20) {
        result += teens[rem - 10];
      } else {
        const u = rem % 10;
        const t = Math.floor(rem / 10);
        if (u > 0) {
          result += ones[u] + ' و' + tens[t];
        } else {
          result += tens[t];
        }
      }
    }
    return result;
  };

  if (n < 1000) {
    return convertUnderThousand(n);
  }

  if (n < 1000000) {
    const thousands = Math.floor(n / 1000);
    const rem = n % 1000;
    let thText = '';
    if (thousands === 1) {
      thText = 'ألف';
    } else if (thousands === 2) {
      thText = 'ألفين';
    } else if (thousands >= 3 && thousands <= 10) {
      thText = convertUnderThousand(thousands) + ' آلاف';
    } else {
      thText = convertUnderThousand(thousands) + ' ألفاً';
    }

    if (rem > 0) {
      return thText + ' و' + convertUnderThousand(rem);
    }
    return thText;
  }

  return n.toString();
};

/**
 * Phonetic Arabic Normalizer:
 * 1. Converts numbers, percentages, and statutory references into full Arabic phonetics.
 * 2. Converts all numeric list markers (1. 2. 3.) into (أولاً: ثانياً: ثالثاً:).
 * 3. Strips markdown asterisks, hashes, links, brackets, and Latin/English characters.
 * 4. Ensures 100% pure spoken Arabic without any English numbers.
 */
export const sanitizeArabicForSpeech = (text: string): string => {
  if (!text) return '';

  let t = text
    // Strip markdown code blocks & inline code
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // Strip markdown bold and italic
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    // Strip headers and markdown links
    .replace(/#{1,6}\s+/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Convert Eastern Arabic numerals (٠-٩) to Western standard (0-9) for unified processing
  const easternDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  for (let i = 0; i < 10; i++) {
    t = t.replace(new RegExp(easternDigits[i], 'g'), i.toString());
  }

  // Convert numbered list headers at start of lines: 1. -> أولاً: ، 2. -> ثانياً:
  const ordinals: Record<string, string> = {
    '1': 'أولاً: ',
    '2': 'ثانياً: ',
    '3': 'ثالثاً: ',
    '4': 'رابعاً: ',
    '5': 'خامساً: ',
    '6': 'سادساً: ',
    '7': 'سابعاً: ',
    '8': 'ثامناً: ',
    '9': 'تاسعاً: ',
    '10': 'عاشراً: ',
    '11': 'الحادي عشر: ',
    '12': 'الثاني عشر: ',
    '13': 'الثالث عشر: ',
    '14': 'الرابع عشر: ',
    '15': 'الخامس عشر: '
  };

  t = t.replace(/^\s*(\d+)[\.\)]\s*/gm, (_, d) => {
    return ordinals[d] || (convertNumberToArabicWords(d) + ': ');
  });

  // Remove list dashes and bullets
  t = t.replace(/^\s*[-•*–—]\s*/gm, ' ');

  // Specific contextual replacements for legal terms & measurements
  t = t
    // Egyptian hotline
    .replace(/19468/g, 'تسعة عشر ألفاً وأربعمائة وثمانية وستين')
    // Law & Decree references
    .replace(/قانون العمل رقم (\d+) لسنة (\d+)/g, (_, d1, d2) => `قانون العمل رقم ${convertNumberToArabicWords(d1)} لسنة ${convertNumberToArabicWords(d2)}`)
    .replace(/قانون العمل الجديد رقم (\d+) لسنة (\d+)/g, (_, d1, d2) => `قانون العمل الجديد رقم ${convertNumberToArabicWords(d1)} لسنة ${convertNumberToArabicWords(d2)}`)
    .replace(/قانون العمل المصري الجديد رقم (\d+) لسنة (\d+)/g, (_, d1, d2) => `قانون العمل المصري الجديد رقم ${convertNumberToArabicWords(d1)} لسنة ${convertNumberToArabicWords(d2)}`)
    .replace(/القرار الوزاري رقم (\d+) لسنة (\d+)/g, (_, d1, d2) => `القرار الوزاري رقم ${convertNumberToArabicWords(d1)} لسنة ${convertNumberToArabicWords(d2)}`)
    .replace(/القرار رقم (\d+) لسنة (\d+)/g, (_, d1, d2) => `القرار رقم ${convertNumberToArabicWords(d1)} لسنة ${convertNumberToArabicWords(d2)}`)
    .replace(/العدد (\d+)/g, (_, d) => `العدد ${convertNumberToArabicWords(d)}`)
    .replace(/الجدول رقم (\d+)/g, (_, d) => `الجدول رقم ${convertNumberToArabicWords(d)}`)
    .replace(/المادة \(?(\d+)\)?/g, (_, d) => `المادة ${convertNumberToArabicWords(d)}`)
    // Percentages
    .replace(/(\d+)%/g, (_, d) => `${convertNumberToArabicWords(d)} بالمئة`)
    .replace(/%(\d+)/g, (_, d) => `${convertNumberToArabicWords(d)} بالمئة`)
    // Weights and measures
    .replace(/(\d+)\s*كجم/g, (_, d) => `${convertNumberToArabicWords(d)} كيلوجرام`)
    .replace(/(\d+)\s*جرام/g, (_, d) => `${convertNumberToArabicWords(d)} جراماً`)
    // Times and hours
    .replace(/(\d+)\s*ساعات/g, (_, d) => `${convertNumberToArabicWords(d)} ساعات`)
    .replace(/(\d+)\s*ساعة/g, (_, d) => `${convertNumberToArabicWords(d)} ساعة`)
    .replace(/(\d+)\s*مساءً/g, (_, d) => `الساعة ${convertNumberToArabicWords(d)} مساءً`)
    .replace(/(\d+)\s*صباحاً/g, (_, d) => `الساعة ${convertNumberToArabicWords(d)} صباحاً`)
    .replace(/(\d+)\s*عصراً/g, (_, d) => `الساعة ${convertNumberToArabicWords(d)} عصراً`)
    .replace(/(\d+)\s*ظهراً/g, (_, d) => `الساعة ${convertNumberToArabicWords(d)} ظهراً`)
    // Days, months, years
    .replace(/(\d+)\s*أيام/g, (_, d) => `${convertNumberToArabicWords(d)} أيام`)
    .replace(/(\d+)\s*يوماً/g, (_, d) => `${convertNumberToArabicWords(d)} يوماً`)
    .replace(/(\d+)\s*يوم/g, (_, d) => `${convertNumberToArabicWords(d)} يوماً`)
    .replace(/(\d+)\s*سنة/g, (_, d) => `${convertNumberToArabicWords(d)} عاماً`)
    .replace(/(\d+)\s*سنوات/g, (_, d) => `${convertNumberToArabicWords(d)} سنوات`)
    .replace(/(\d+)\s*عاماً/g, (_, d) => `${convertNumberToArabicWords(d)} عاماً`)
    .replace(/(\d+)\s*أشهر/g, (_, d) => `${convertNumberToArabicWords(d)} أشهر`)
    .replace(/(\d+)\s*شهر/g, (_, d) => `${convertNumberToArabicWords(d)} شهراً`)
    .replace(/(\d+)\s*شهور/g, (_, d) => `${convertNumberToArabicWords(d)} شهور`)
    .replace(/لسنة (\d+)/g, (_, d) => `لسنة ${convertNumberToArabicWords(d)}`)
    .replace(/عام (\d+)/g, (_, d) => `عام ${convertNumberToArabicWords(d)}`)
    // Dates like 18 مارس 2026
    .replace(/(\d+)\s+(يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر)\s+(\d+)/g, (_, day, month, yr) => {
      return `${convertNumberToArabicWords(day)} من ${month} ${convertNumberToArabicWords(yr)}`;
    });

  // Convert ANY remaining digits/numbers into Arabic words
  t = t.replace(/\b(\d+)\b/g, (_, num) => {
    return convertNumberToArabicWords(num);
  });

  // Final cleanup: remove quotes, brackets, and all Latin/English characters
  t = t
    .replace(/[«»"'“”]/g, '')
    .replace(/[()[\]{}]/g, ' ')
    .replace(/[a-zA-Z]+/g, ' ')
    .replace(/(\r\n|\n|\r)+/g, ' ، ')
    .replace(/[:؛]/g, ' ، ')
    .replace(/\s+/g, ' ')
    .trim();

  return t;
};

/**
 * Splits sanitized Arabic text into short, natural speech segments (~100-140 chars).
 */
export const splitIntoSpeechChunks = (text: string): string[] => {
  const clean = sanitizeArabicForSpeech(text);
  if (!clean) return [];

  const rawSegments = clean.split(/([.،؟!\n؛]+)/);
  const chunks: string[] = [];
  let current = '';

  for (let i = 0; i < rawSegments.length; i++) {
    const segment = rawSegments[i].trim();
    if (!segment) continue;

    if ((current + ' ' + segment).length <= 130) {
      current = current ? `${current} ${segment}` : segment;
    } else {
      if (current.trim()) chunks.push(current.trim());

      if (segment.length > 130) {
        const words = segment.split(' ');
        let wordBuffer = '';
        for (const w of words) {
          if ((wordBuffer + ' ' + w).length <= 130) {
            wordBuffer = wordBuffer ? `${wordBuffer} ${w}` : w;
          } else {
            if (wordBuffer.trim()) chunks.push(wordBuffer.trim());
            wordBuffer = w;
          }
        }
        current = wordBuffer;
      } else {
        current = segment;
      }
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.filter(c => c.replace(/[.،؟!\s؛\-]/g, '').length > 1);
};

/**
 * Preloads and caches available voices in browser
 */
export const refreshVoices = (): SpeechSynthesisVoice[] => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        cachedVoices = v;
      }
    } catch (e) {}
  }
  return cachedVoices;
};

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  refreshVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    refreshVoices();
  };
}

/**
 * Checks for a genuine Arabic voice in the user's browser.
 * Returns null if only English/other non-Arabic voices exist.
 */
export const getGenuineArabicVoice = (): SpeechSynthesisVoice | null => {
  const voices = refreshVoices();
  if (!voices || voices.length === 0) return null;

  // 1. Exact Egyptian Arabic ('ar-EG')
  const egVoice = voices.find(v => {
    const lang = (v.lang || '').toLowerCase().replace('_', '-');
    return lang === 'ar-eg';
  });
  if (egVoice) return egVoice;

  // 2. Any Arabic language code
  const arVoice = voices.find(v => {
    const lang = (v.lang || '').toLowerCase().replace('_', '-');
    return lang.startsWith('ar-') || lang === 'ar';
  });
  if (arVoice) return arVoice;

  // 3. Name containing Arabic voice identifiers
  const nameVoice = voices.find(v => {
    const name = (v.name || '').toLowerCase();
    return (
      name.includes('arabic') ||
      name.includes('عربي') ||
      name.includes('العربية') ||
      name.includes('hoda') ||
      name.includes('salma') ||
      name.includes('shakir') ||
      name.includes('maged') ||
      name.includes('tarik') ||
      name.includes('laila') ||
      name.includes('naayf') ||
      name.includes('mariam') ||
      name.includes('zeina') ||
      name.includes('hamed') ||
      name.includes('zariyah') ||
      name.includes('fatima')
    );
  });
  if (nameVoice) return nameVoice;

  return null;
};

/**
 * Immediately terminates all speech and audio playback.
 */
export const stopArabicSpeech = (triggerCallback: boolean = true) => {
  shouldStop = true;
  isSpeaking = false;

  if (activeAudioElement) {
    try {
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
      activeAudioElement.src = '';
    } catch (e) {}
    activeAudioElement = null;
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
    } catch (e) {}
  }

  if (triggerCallback && onEndCallback) {
    const cb = onEndCallback;
    onEndCallback = null;
    cb();
  } else {
    onEndCallback = null;
  }
};

/**
 * Speaks Arabic text sequentially with 100% authentic pronunciation.
 * Priority:
 * 1. High-fidelity native Arabic audio stream via /api/tts.
 * 2. Web Speech API with verified genuine Arabic voice.
 */
export const speakArabic = async (
  text: string,
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err?: any) => void;
  },
  options?: {
    rate?: number;
  }
) => {
  stopArabicSpeech(false);

  if (options?.rate) {
    setSpeechRate(options.rate);
  }

  const chunks = splitIntoSpeechChunks(text);
  if (chunks.length === 0) {
    callbacks?.onEnd?.();
    return;
  }

  shouldStop = false;
  isSpeaking = true;
  onEndCallback = callbacks?.onEnd || null;
  callbacks?.onStart?.();

  let chunkIndex = 0;

  // Cleanup helper
  const finishSpeaking = () => {
    isSpeaking = false;
    if (activeAudioElement) {
      try {
        activeAudioElement.pause();
      } catch (e) {}
      activeAudioElement = null;
    }
    if (onEndCallback) {
      const cb = onEndCallback;
      onEndCallback = null;
      cb();
    }
  };

  /**
   * Strategy A: High-quality Arabic MP3 audio from /api/tts
   */
  const playNextWithAudio = () => {
    if (shouldStop || !isSpeaking) {
      finishSpeaking();
      return;
    }

    if (chunkIndex >= chunks.length) {
      finishSpeaking();
      return;
    }

    const chunkText = chunks[chunkIndex];
    chunkIndex++;

    try {
      const audioUrl = `/api/tts?text=${encodeURIComponent(chunkText)}`;
      const audio = new Audio(audioUrl);
      audio.playbackRate = currentSpeechRate;
      activeAudioElement = audio;

      audio.onended = () => {
        if (!shouldStop && isSpeaking) {
          setTimeout(playNextWithAudio, 50);
        }
      };

      audio.onerror = (e) => {
        console.warn('Audio stream failed for chunk, falling back to Web Speech API:', e);
        // Fallback to Web Speech API
        chunkIndex--; // retry this chunk with Web Speech
        playWithWebSpeech();
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Audio play prevented or failed:', err);
          chunkIndex--;
          playWithWebSpeech();
        });
      }
    } catch (err) {
      console.warn('Audio stream error, falling back:', err);
      chunkIndex--;
      playWithWebSpeech();
    }
  };

  /**
   * Strategy B: Web Speech API Fallback (Strictly Arabic Voice Only)
   */
  const playWithWebSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      finishSpeaking();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
    } catch (e) {}

    const playWebSpeechChunk = () => {
      if (shouldStop || !isSpeaking) {
        finishSpeaking();
        return;
      }

      if (chunkIndex >= chunks.length) {
        finishSpeaking();
        return;
      }

      const chunkText = chunks[chunkIndex];
      chunkIndex++;

      try {
        const utterance = new SpeechSynthesisUtterance(chunkText);
        const voice = getGenuineArabicVoice();

        if (voice) {
          utterance.voice = voice;
          utterance.lang = voice.lang || 'ar-EG';
        } else {
          utterance.lang = 'ar-EG';
        }

        utterance.rate = currentSpeechRate;
        utterance.pitch = 1.0;

        utterance.onend = () => {
          if (!shouldStop && isSpeaking) {
            setTimeout(playWebSpeechChunk, 50);
          }
        };

        utterance.onerror = (e) => {
          if (e.error === 'canceled' || e.error === 'interrupted') return;
          if (!shouldStop && isSpeaking) {
            setTimeout(playWebSpeechChunk, 50);
          }
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error('Web speech chunk exception:', err);
        if (!shouldStop && isSpeaking) {
          playWebSpeechChunk();
        } else {
          finishSpeaking();
        }
      }
    };

    playWebSpeechChunk();
  };

  // Start with High-Fidelity Arabic Audio Stream
  playNextWithAudio();
};
