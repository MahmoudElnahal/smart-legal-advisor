/**
 * Production Arabic NLP Normalizer & Tokenizer for Legal Information Retrieval
 */

// Arabic Diacritics Regex (Tashkeel: Fat-ha, Damma, Kasra, Sukun, Tanween, Shadda)
const DIACRITICS_REGEX = /[\u064B-\u065F\u0670]/g;

// Tatweel / Kashida
const TATWEEL_REGEX = /\u0640/g;

// Arabic-Indic Numerals Map (٠-٩ to 0-9)
const ARABIC_INDIC_NUMS: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
};

// Curated Arabic Stopwords for Legal Retrieval (omitting terms with legal significance like 'حق', 'واجب')
export const ARABIC_STOPWORDS = new Set([
  'في', 'من', 'على', 'إلى', 'الي', 'عن', 'مع', 'هذا', 'هذه', 'هؤلاء',
  'ذلك', 'تلك', 'الذي', 'التي', 'الذين', 'اللاتي', 'اللواتي', 'ما', 'ماذا',
  'من', 'هو', 'هي', 'هم', 'هن', 'أنا', 'نحن', 'أنت', 'أنتم', 'أنتن',
  'قد', 'لقد', 'ثم', 'أو', 'أم', 'بل', 'لكن', 'كان', 'كانت', 'يكون',
  'تكون', 'أصبح', 'صار', 'ليس', 'غير', 'سوف', 'لن', 'لم', 'إذا', 'ان',
  'إن', 'أن', 'لو', 'لولا', 'كل', 'بعض', 'أي', 'أين', 'كيف', 'متى',
  'كم', 'حيث', 'حين', 'بين', 'أمام', 'خلف', 'فوق', 'تحت', 'دون', 'نحو',
  'يا', 'فان', 'فإن', 'بما', 'كما', 'وهل', 'هل', 'فقد', 'حتى'
]);

/**
 * Standardizes Arabic characters:
 * - Strips diacritics and kashida
 * - Normalizes Alif forms (أ, إ, آ, ٱ -> ا)
 * - Normalizes Taa Marbuta (ة -> ه)
 * - Normalizes Alef Maksura (ى -> ي)
 * - Converts Arabic-Indic numbers to Western Arabic digits (0-9)
 */
export function normalizeArabicText(text: string): string {
  if (!text) return '';

  let normalized = text
    .replace(DIACRITICS_REGEX, '')
    .replace(TATWEEL_REGEX, '');

  // Convert Arabic numerals
  normalized = normalized.replace(/[٠-٩]/g, (char) => ARABIC_INDIC_NUMS[char] || char);

  // Normalize Alif
  normalized = normalized.replace(/[أإآٱ]/g, 'ا');

  // Normalize Taa Marbuta
  normalized = normalized.replace(/ة/g, 'ه');

  // Normalize Alef Maksura
  normalized = normalized.replace(/ى/g, 'ي');

  // Normalize Hamza forms to base
  normalized = normalized.replace(/ؤ/g, 'و').replace(/ئ/g, 'ي');

  // Lowercase latin if any
  normalized = normalized.toLowerCase();

  return normalized;
}

/**
 * Light Stemming for Arabic words:
 * Strips common prefixes (الـ, والـ, فالـ, كالـ, للـ, بـ) while preserving word root length.
 */
export function lightStemArabic(word: string): string {
  if (word.length <= 3) return word;

  // Preserve numerical and legal identifiers (e.g. 2025, 2026, 14, 162)
  if (/^\d+$/.test(word)) return word;

  let stem = word;

  // Definite article and compound prefixes
  if (stem.startsWith('وال') || stem.startsWith('فال') || stem.startsWith('كال')) {
    if (stem.length > 5) stem = stem.slice(3);
  } else if (stem.startsWith('ال') || stem.startsWith('لل') || stem.startsWith('بال')) {
    if (stem.length > 4) stem = stem.slice(2);
  }

  // Suffixes: plural 'ين', 'ون', 'ات', dual 'ان'
  if (stem.length > 5) {
    if (stem.endsWith('ات') || stem.endsWith('ين') || stem.endsWith('ون') || stem.endsWith('ان')) {
      stem = stem.slice(0, -2);
    }
  }

  return stem;
}

/**
 * Tokenizes text into normalized, stemmed search tokens with stopwords removed
 */
export function tokenizeArabic(text: string, stem = true): string[] {
  const normalized = normalizeArabicText(text);
  
  // Extract alphanumeric tokens (Arabic letters, latin, and digits)
  const rawTokens = normalized.match(/[\p{L}\p{N}]+/gu) || [];

  const tokens: string[] = [];
  for (const token of rawTokens) {
    if (token.length < 2 && !/^\d+$/.test(token)) continue;
    if (ARABIC_STOPWORDS.has(token)) continue;

    const processedToken = stem ? lightStemArabic(token) : token;
    if (processedToken && !ARABIC_STOPWORDS.has(processedToken)) {
      tokens.push(processedToken);
    }
  }

  return tokens;
}
