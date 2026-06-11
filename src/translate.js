// ============================================
// DeepL Translation Service
// ============================================

const DEEPL_API_URL = 'https://api-free.deepl.com/v0/translate';
const DEEPL_AUTH_KEY = process.env.REACT_APP_DEEPL_AUTH_KEY || '';

// DeepL source language codes
export const translateLangs = [
  { code: 'EN', label: 'English', flag: '🇬🇧' },
  { code: 'ES', label: 'Spanish', flag: '🇪🇸' },
  { code: 'FR', label: 'French', flag: '🇫🇷' },
  { code: 'DE', label: 'German', flag: '🇩🇪' },
  { code: 'IT', label: 'Italian', flag: '🇮🇹' },
  { code: 'PT', label: 'Portuguese', flag: '🇵🇹' },
  { code: 'ZH', label: 'Chinese', flag: '🇨🇳' },
  { code: 'JA', label: 'Japanese', flag: '🇯🇵' },
  { code: 'KO', label: 'Korean', flag: '🇰🇷' },
  { code: 'RU', label: 'Russian', flag: '🇷🇺' },
  { code: 'SV', label: 'Swedish', flag: '🇸🇪' },
  { code: 'AR', label: 'Arabic', flag: '🇸🇦' },
  { code: 'NL', label: 'Dutch', flag: '🇳🇱' },
  { code: 'PL', label: 'Polish', flag: '🇵🇱' },
  { code: 'TR', label: 'Turkish', flag: '🇹🇷' },
];

// Map BCP47 speech lang codes to DeepL codes
const BCP_TO_DEEPL = {
  'en-US': 'EN', 'en-GB': 'EN', en: 'EN',
  'es-ES': 'ES', 'es-MX': 'ES', es: 'ES',
  'fr-FR': 'FR', fr: 'FR',
  'de-DE': 'DE', de: 'DE',
  'it-IT': 'IT', it: 'IT',
  'pt-BR': 'PT', 'pt-PT': 'PT', pt: 'PT',
  'zh-CN': 'ZH', 'zh-TW': 'ZH', 'zh-HK': 'ZH', zh: 'ZH',
  'ja-JP': 'JA', ja: 'JA',
  'ko-KR': 'KO', ko: 'KO',
  'ru-RU': 'RU', ru: 'RU',
  'sv-SE': 'SV', sv: 'SV',
  'ar-SA': 'AR', ar: 'AR',
};



export function bcpToDeepl(bcpLang) {
  return BCP_TO_DEEPL[bcpLang] || BCP_TO_DEEPL[bcpLang.split('-')[0]] || bcpLang.split('-')[0].toUpperCase();
}

// ============================================
// localStorage we_lang preference
// ============================================
const WE_LANG_KEY = 'lingua_class_we_lang';

export function getWeLang() {
  return localStorage.getItem(WE_LANG_KEY) || 'EN';
}

export function setWeLang(code) {
  localStorage.setItem(WE_LANG_KEY, code);
}

// ============================================
// DeepL translation
// ============================================
export async function translateText(text, targetLang, sourceLang = null) {
  if (!text || !text.trim()) return text;
  if (!DEEPL_AUTH_KEY) {
    console.warn('[Translate] No DEEPL_AUTH_KEY configured — translation skipped');
    return null;
  }

  const tgt = targetLang.toUpperCase();
  // Skip if source == target (no need to translate)
  if (sourceLang && bcpToDeepl(sourceLang) === tgt) return null;

  try {
    const res = await fetch(DEEPL_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${DEEPL_AUTH_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: [text],
        target_lang: tgt,
        source_lang: sourceLang ? bcpToDeepl(sourceLang) : undefined,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('[Translate] DeepL error:', err);
      return null;
    }

    const data = await res.json();
    const translated = data?.translations?.[0]?.text;
    return translated || null;
  } catch (e) {
    console.warn('[Translate] Network error:', e.message);
    return null;
  }
}

// Translate a batch of texts concurrently (for multiple listeners)
export async function translateBatch(texts, targetLang) {
  const results = await Promise.all(
    texts.map(t => translateText(t, targetLang))
  );
  return results;
}
