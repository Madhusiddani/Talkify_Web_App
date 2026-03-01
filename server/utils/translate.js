const axios = require('axios');
const franc = require('franc');  // franc v4: default export, no destructuring

// ─── LANGUAGE DETECTION ────────────────────────────────────────────────────────

/**
 * Unicode script ranges for Indian languages.
 * These override franc when native script characters are detected.
 * This reliably handles native-script messages (Devanagari, Telugu, Tamil, etc.)
 */
const SCRIPT_DETECTORS = [
  { lang: 'hi', regex: /[\u0900-\u097F]/ },   // Devanagari → Hindi (also Marathi/Nepali)
  { lang: 'mr', regex: /[\u0900-\u097F][\u0900-\u097F][\u0900-\u097F]/ }, // More Devanagari chars = Marathi (heuristic)
  { lang: 'te', regex: /[\u0C00-\u0C7F]/ },   // Telugu script
  { lang: 'ta', regex: /[\u0B80-\u0BFF]/ },   // Tamil script
  { lang: 'bn', regex: /[\u0980-\u09FF]/ },   // Bengali script
  { lang: 'gu', regex: /[\u0A80-\u0AFF]/ },   // Gujarati script
  { lang: 'kn', regex: /[\u0C80-\u0CFF]/ },   // Kannada script
  { lang: 'ml', regex: /[\u0D00-\u0D7F]/ },   // Malayalam script
  { lang: 'pa', regex: /[\u0A00-\u0A7F]/ },   // Gurmukhi (Punjabi) script
  { lang: 'ur', regex: /[\u0600-\u06FF]/ },   // Arabic/Urdu script
  { lang: 'ar', regex: /[\u0600-\u06FF]/ },   // Arabic script
  { lang: 'ja', regex: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/ }, // Japanese
  { lang: 'zh', regex: /[\u4E00-\u9FFF]/ },   // Chinese
  { lang: 'ko', regex: /[\uAC00-\uD7AF]/ },   // Korean
  { lang: 'ru', regex: /[\u0400-\u04FF]/ },   // Cyrillic (Russian)
];

/**
 * franc ISO 639-3 → ISO 639-1 (BCP-47) mapping
 */
const FRANC_MAP = {
  eng: 'en', fra: 'fr', spa: 'es', deu: 'de',
  por: 'pt', ita: 'it', rus: 'ru', jpn: 'ja',
  zho: 'zh', hin: 'hi', ara: 'ar', kor: 'ko',
  tel: 'te', tam: 'ta', ben: 'bn', guj: 'gu',
  kan: 'kn', mal: 'ml', mar: 'mr', pan: 'pa', urd: 'ur',
};

/**
 * Detect the language of a text string.
 * Returns an ISO 639-1 code (e.g. 'en', 'hi', 'te'). Falls back to 'en'.
 *
 * Strategy:
 *   1. Check for non-Latin Unicode script characters first (reliable for Indian langs).
 *   2. Use franc for Latin-script languages.
 *   3. Fall back to 'en' for short/ambiguous text.
 */
const detectLang = (text) => {
  if (!text || !text.trim()) return 'en';

  // Step 1: Unicode script detection (highest priority, very reliable)
  // Note: check Hindi BEFORE Marathi (Marathi is a subset refinement)
  for (const { lang, regex } of SCRIPT_DETECTORS) {
    if (regex.test(text)) return lang;
  }

  // Step 2: franc for Latin-script languages (needs at least 10 chars to be reliable)
  if (text.trim().length < 10) return 'en';

  const lang3 = franc(text, { minLength: 10 });
  return FRANC_MAP[lang3] || 'en';
};

// ─── TRANSLATION ───────────────────────────────────────────────────────────────

/**
 * MyMemory API translation.
 * Free, no API key, no installation. Supports all required Indian languages.
 * Limit: 5,000 words/day per IP (sufficient for development and small deployments).
 *
 * Supported language codes: en, hi, te, ta, bn, gu, kn, ml, mr, pa, ur, fr, es, de, etc.
 */
const translateText = async (text, targetLang, sourceLang = 'auto') => {
  if (!text || !text.trim()) return text;
  if (sourceLang === targetLang) return text;

  // MyMemory doesn't support 'auto' — default to English as source when unknown
  const source = (sourceLang === 'auto' || !sourceLang) ? 'en' : sourceLang;

  try {
    const response = await axios.get('https://api.mymemory.translated.net/get', {
      params: {
        q: text,
        langpair: `${source}|${targetLang}`,
      },
      timeout: 8000, // 8 second timeout
    });

    const result = response.data;

    // MyMemory returns responseStatus 200 on success
    if (result.responseStatus === 200 && result.responseData?.translatedText) {
      const translated = result.responseData.translatedText;

      // MyMemory sometimes returns MYMEMORY WARNING when quota is exceeded
      if (translated.includes('MYMEMORY WARNING')) {
        console.warn('MyMemory quota warning — returning original text');
        return text;
      }

      return translated;
    }

    console.warn(`Translation API returned status ${result.responseStatus} for ${source}→${targetLang}`);
    return text;

  } catch (err) {
    console.error(`Translation failed (${source}→${targetLang}):`, err.message);
    return text; // Always fall back to original — never break message delivery
  }
};

module.exports = { detectLang, translateText };
