const axios = require('axios');
const { franc } = require('franc');

const LIBRETRANSLATE_URL = process.env.LIBRETRANSLATE_URL || 'http://localhost:5005';

// franc uses ISO 639-3 codes; LibreTranslate uses ISO 639-1 (BCP-47)
const franc2bcp47 = {
  eng: 'en', hin: 'hi', tel: 'te', tam: 'ta',
  ben: 'bn', guj: 'gu', kan: 'kn', mal: 'ml',
  mar: 'mr', pan: 'pa', urd: 'ur',
};

/**
 * Detect language of text. Returns BCP-47 code (e.g. 'en', 'hi', 'te').
 * Falls back to 'en' for short text or unrecognized language.
 */
const detectLanguage = (text) => {
  if (!text || text.trim().split(/\s+/).length < 3) return 'en';
  const francCode = franc(text, { minLength: 3 });
  return franc2bcp47[francCode] || 'en';
};

/**
 * Translate text from sourceLang to targetLang via LibreTranslate.
 * Returns original text on failure — never breaks message delivery.
 */
const translateText = async (text, sourceLang, targetLang) => {
  if (!text || sourceLang === targetLang) return text;

  try {
    const response = await axios.post(
      `${LIBRETRANSLATE_URL}/translate`,
      { q: text, source: sourceLang, target: targetLang, format: 'text' },
      { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
    );
    return response.data.translatedText || text;
  } catch (err) {
    console.error(`Translation failed (${sourceLang}→${targetLang}):`, err.message);
    return text;
  }
};

/**
 * Get or generate translation for a specific target language.
 * Uses the JSONB translations array as a cache — avoids re-translating.
 *
 * Returns:
 *   text         — the text to display to the user
 *   isTranslated — whether translation was applied
 *   updatedCache — new cache array if a new translation was generated (null otherwise)
 */
const getOrTranslate = async (originalText, detectedLanguage, translationsCache, targetLang) => {
  if (detectedLanguage === targetLang) {
    return { text: originalText, isTranslated: false, updatedCache: null };
  }

  const cache = Array.isArray(translationsCache) ? translationsCache : [];
  const cached = cache.find((t) => t.language === targetLang);

  if (cached) {
    return { text: cached.text, isTranslated: true, updatedCache: null };
  }

  // Not in cache — fetch from LibreTranslate
  const translated = await translateText(originalText, detectedLanguage, targetLang);
  const updatedCache = [...cache, { language: targetLang, text: translated }];

  return { text: translated, isTranslated: true, updatedCache };
};

module.exports = { detectLanguage, translateText, getOrTranslate };
