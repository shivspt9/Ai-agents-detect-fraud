/**
 * Intelligence extraction.
 *
 * The core idea is *masking*: entities are pulled out in precedence order and
 * the characters they consumed are blanked from a working copy of the text.
 * A phone number inside a URL, or the digits of an already-claimed account,
 * can therefore never be re-reported by a later, looser pattern.
 *
 * Every extractor validates its candidate before accepting it, so a bare run
 * of digits is only a "bank account" once it fails to be anything better.
 */

/** UPI payment-service handles, used to grade confidence. */
const KNOWN_PSP = new Set([
  'paytm', 'ybl', 'okaxis', 'okhdfcbank', 'okicici', 'oksbi', 'upi', 'ibl',
  'axl', 'apl', 'yapl', 'jio', 'airtel', 'freecharge', 'phonepe', 'gpay',
  'hdfcbank', 'icici', 'sbi', 'kotak', 'barodampay', 'pnb', 'idfcbank',
]);

/** TLDs that legitimate businesses rarely use for customer-facing links. */
const SUSPICIOUS_TLD = /\.(tk|ml|ga|cf|gq|xyz|top|pw|cc|club|work|link|buzz|icu|rest|fit)(\/|$|:)/i;

const URL_SHORTENER = /\b(bit\.ly|tinyurl\.com|goo\.gl|t\.co|ow\.ly|is\.gd|buff\.ly|cutt\.ly|rb\.gy|shorturl\.at|rebrand\.ly|tiny\.cc)\b/i;

/** Replaces a matched span with spaces so later patterns cannot reuse it. */
function mask(text, start, end) {
  return text.slice(0, start) + ' '.repeat(end - start) + text.slice(end);
}

function luhnValid(digits) {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

/**
 * Runs a pattern, accepting or rejecting each candidate via `validate`.
 * When the pattern has a capture group, the group is the value but the whole
 * match is masked — that is what stops "a/c 123456" from being reported
 * alongside "123456".
 */
function harvest(working, pattern, validate) {
  const found = [];
  let text = working;
  const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');

  for (const m of [...text.matchAll(re)]) {
    const raw = (m[1] ?? m[0]).trim();
    const result = validate(raw, m);
    if (!result) continue;
    found.push({ value: result.value, confidence: result.confidence, note: result.note });
    text = mask(text, m.index, m.index + m[0].length);
  }

  return { found, text };
}

const EXTRACTORS = [
  {
    type: 'phishing_url',
    pattern: /\bhttps?:\/\/[^\s<>"'`{}|\\^[\]]+/gi,
    validate(raw) {
      // Trailing sentence punctuation is not part of the URL.
      const value = raw.replace(/[.,;:!?)\]]+$/, '');
      if (value.length < 8) return null;
      let confidence = 0.7;
      const notes = [];
      if (URL_SHORTENER.test(value)) {
        confidence = 0.95;
        notes.push('link shortener');
      }
      if (SUSPICIOUS_TLD.test(value)) {
        confidence = Math.max(confidence, 0.9);
        notes.push('suspicious TLD');
      }
      if (/^http:\/\//i.test(value)) notes.push('unencrypted');
      if (/\d{1,3}(\.\d{1,3}){3}/.test(value)) {
        confidence = Math.max(confidence, 0.85);
        notes.push('raw IP host');
      }
      return { value, confidence, note: notes.join(', ') || 'link' };
    },
  },
  {
    type: 'email',
    // Requires a dotted TLD, which is what separates an address from a UPI ID.
    pattern: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+\.[a-zA-Z]{2,}\b|\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+\.[a-zA-Z]{2,}\b/g,
    validate(raw) {
      const value = raw.toLowerCase();
      const free = /@(gmail|yahoo|outlook|hotmail|proton(mail)?|rediffmail|mail)\./.test(value);
      return {
        value,
        confidence: free ? 0.9 : 0.75,
        note: free ? 'free webmail' : 'email',
      };
    },
  },
  {
    type: 'upi_id',
    // A UPI handle has no dot — anything dotted was already taken as email.
    pattern: /\b([a-zA-Z0-9][a-zA-Z0-9._-]{1,49}@[a-zA-Z]{2,20})\b/g,
    validate(raw) {
      const value = raw.toLowerCase();
      const handle = value.split('@')[1];
      if (!handle || handle.includes('.')) return null;
      const known = KNOWN_PSP.has(handle);
      return {
        value,
        confidence: known ? 0.95 : 0.6,
        note: known ? `UPI handle @${handle}` : 'possible UPI ID',
      };
    },
  },
  {
    type: 'ifsc',
    // Indian bank branch code: 4 letters, a literal 0, then 6 alphanumerics.
    pattern: /\b([A-Z]{4}0[A-Z0-9]{6})\b/g,
    validate(raw) {
      const value = raw.toUpperCase();
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(value)) return null;
      return { value, confidence: 0.95, note: `bank ${value.slice(0, 4)}` };
    },
  },
  {
    type: 'crypto_wallet',
    pattern: /\b(0x[a-fA-F0-9]{40}|bc1[a-z0-9]{25,62}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})\b/g,
    validate(raw) {
      if (/^0x/i.test(raw)) return { value: raw, confidence: 0.95, note: 'ETH / EVM address' };
      if (/^bc1/.test(raw)) return { value: raw, confidence: 0.95, note: 'BTC bech32' };
      return { value: raw, confidence: 0.8, note: 'BTC legacy' };
    },
  },
  {
    type: 'card_number',
    pattern: /\b(?:\d[ -]?){12,18}\d\b/g,
    validate(raw) {
      const digits = raw.replace(/\D/g, '');
      if (digits.length < 13 || digits.length > 19) return null;
      if (!luhnValid(digits)) return null; // reject anything failing the checksum
      const brand =
        /^4/.test(digits) ? 'Visa' :
        /^5[1-5]/.test(digits) ? 'Mastercard' :
        /^3[47]/.test(digits) ? 'Amex' :
        /^6/.test(digits) ? 'RuPay/Discover' : 'card';
      return { value: digits, confidence: 0.9, note: `${brand}, Luhn valid` };
    },
  },
  {
    type: 'phone_number',
    pattern: /(?:\+(\d{1,3})[\s-]?)?\b([6-9]\d{9})\b|\+(\d{1,3})[\s-]?(\d{7,12})\b/g,
    validate(raw, m) {
      const digits = raw.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 15) return null;
      const indianMobile = /^[6-9]\d{9}$/.test(digits);
      const cc = m[1] || m[3];
      const value = cc ? `+${cc} ${digits}` : digits;
      return {
        value,
        confidence: indianMobile ? 0.9 : 0.7,
        note: indianMobile ? 'Indian mobile' : 'phone',
      };
    },
  },
  {
    type: 'bank_account',
    // Last resort: a labelled account, or a bare digit run that survived
    // every earlier extractor.
    pattern: /(?:a\/c|acc(?:oun)?t|account)\s*(?:no\.?|number|#)?\s*[:\-]?\s*(\d{9,18})\b|\b(\d{11,18})\b/gi,
    validate(raw, m) {
      const value = (m[1] || m[2] || raw).replace(/\D/g, '');
      if (value.length < 9 || value.length > 18) return null;
      if (/^(\d)\1+$/.test(value)) return null; // 000000000000 is not an account
      const labelled = Boolean(m[1]);
      return {
        value,
        confidence: labelled ? 0.9 : 0.55,
        note: labelled ? 'labelled account number' : 'unlabelled digit run',
      };
    },
  },
];

/**
 * Extracts every intelligence entity from a message.
 * Returns `{ bank_account: [{value, confidence, note}], ... }`.
 */
export function extractIntelligence(text) {
  const out = {};
  for (const { type } of EXTRACTORS) out[type] = [];

  if (!text || typeof text !== 'string') return out;

  let working = text;
  for (const extractor of EXTRACTORS) {
    const { found, text: masked } = harvest(working, extractor.pattern, extractor.validate);
    working = masked;

    const seen = new Set();
    for (const item of found) {
      const key = item.value.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out[extractor.type].push(item);
    }
  }

  return out;
}

/** Flat `[{ intel_type, value, confidence, note }]` view of the above. */
export function flattenIntelligence(extracted) {
  const rows = [];
  for (const [intel_type, items] of Object.entries(extracted)) {
    for (const item of items) {
      rows.push({ intel_type, ...item });
    }
  }
  return rows;
}

/** Just the values, matching the shape the existing API response uses. */
export function toValueMap(extracted) {
  const map = {};
  for (const [type, items] of Object.entries(extracted)) {
    map[type] = items.map((i) => i.value);
  }
  return map;
}

export const INTEL_TYPES = EXTRACTORS.map((e) => e.type);
