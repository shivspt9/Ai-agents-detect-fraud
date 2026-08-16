/**
 * Scam detection.
 *
 * Replaces the old "any pattern matched → it's a scam" boolean with weighted
 * signal scoring. Each signal contributes evidence; signals are grouped by
 * scam category so the strongest category also names the scam type. A
 * saturating curve turns the raw evidence total into a 0–1 confidence, so a
 * message with six weak tells does not automatically outrank one with a
 * single decisive tell.
 */

/** Category-specific signals. Weight reflects how damning the tell is. */
const CATEGORIES = {
  banking_fraud: {
    label: 'Banking Fraud',
    signals: [
      { id: 'account_blocked', weight: 3.0, re: /\b(account|card|a\/c)\b[^.!?]{0,40}\b(blocked|suspended|locked|frozen|deactivat|disabled|compromised)/i },
      { id: 'share_otp', weight: 4.0, re: /\b(send|share|tell|give|provide|forward|enter)\b[^.!?]{0,25}\b(otp|pin|cvv|password|mpin|passcode)/i },
      { id: 'otp_mention', weight: 1.5, re: /\botp\b|\bone[\s-]?time[\s-]?password\b/i },
      { id: 'debit_reversal', weight: 2.5, re: /\b(debited|deducted|transaction)\b[^.!?]{0,40}\b(reverse|refund|revert|cancel)/i },
      { id: 'card_expiry', weight: 2.0, re: /\b(card|atm)\b[^.!?]{0,30}\b(expir|renew|reactivat)/i },
      { id: 'card_details_request', weight: 3.5, re: /\b(card|debit|credit)\b[^.!?]{0,60}\b(full number|complete number|16[\s-]?digit|card number|expiry|cvv)/i },
      { id: 'avoid_blocking', weight: 2.0, re: /\b(to avoid|prevent|stop)\b[^.!?]{0,25}\b(block|suspend|deactivat|closure|termination)/i },
      { id: 'net_banking', weight: 1.5, re: /\b(net\s?banking|internet\s?banking|mobile\s?banking)\b/i },
    ],
  },
  kyc_fraud: {
    label: 'KYC / Verification',
    signals: [
      { id: 'kyc_expiry', weight: 3.5, re: /\bkyc\b[^.!?]{0,30}\b(update|pending|expir|complete|verif|suspend)/i },
      { id: 'kyc_bare', weight: 2.0, re: /\bkyc\b/i },
      { id: 'aadhaar_pan', weight: 2.5, re: /\b(aadhaar|aadhar|pan\s?card)\b[^.!?]{0,30}\b(link|update|verif|submit)/i },
      { id: 'verify_identity', weight: 2.0, re: /\bverify\b[^.!?]{0,25}\b(identity|account|details|document)/i },
    ],
  },
  lottery_prize: {
    label: 'Lottery / Prize',
    signals: [
      { id: 'won_prize', weight: 4.0, re: /\b(won|win|winner|congratulat)\b[^.!?]{0,40}\b(prize|lottery|jackpot|lakh|crore|million|reward|cash|gift)/i },
      { id: 'claim_reward', weight: 3.0, re: /\bclaim\b[^.!?]{0,25}\b(reward|prize|bonus|amount|money|gift)/i },
      { id: 'lucky_draw', weight: 3.0, re: /\b(lucky\s?draw|prize\s?money|selected\s?winner|bumper\s?offer)\b/i },
      { id: 'processing_fee', weight: 3.5, re: /\b(processing|registration|handling|clearance|release)\s?fee\b/i },
    ],
  },
  tech_support: {
    label: 'Tech Support',
    signals: [
      { id: 'device_infected', weight: 3.5, re: /\b(computer|pc|laptop|device|phone|system)\b[^.!?]{0,35}\b(virus|infected|hacked|malware|compromised|at risk)/i },
      { id: 'impersonate_vendor', weight: 3.0, re: /\b(microsoft|apple|google|windows|norton|mcafee)\b[^.!?]{0,30}\b(support|security|technician|team|helpdesk)/i },
      { id: 'remote_access', weight: 4.0, re: /\b(anydesk|teamviewer|quick\s?support|remote\s?(access|desktop|connection)|screen\s?shar)/i },
      { id: 'subscription_renew', weight: 2.5, re: /\b(subscription|licence|license)\b[^.!?]{0,30}\b(renew|expir|auto[\s-]?debit|charged)/i },
    ],
  },
  investment_crypto: {
    label: 'Investment / Crypto',
    signals: [
      { id: 'guaranteed_return', weight: 4.0, re: /\b(guaranteed|assured|risk[\s-]?free|100%)\b[^.!?]{0,30}\b(return|profit|income|double)/i },
      { id: 'double_money', weight: 3.5, re: /\b(double|triple|multiply)\b[^.!?]{0,25}\b(money|investment|amount|capital)/i },
      { id: 'crypto_pitch', weight: 2.5, re: /\b(bitcoin|btc|ethereum|usdt|crypto|forex|binary\s?option)\b[^.!?]{0,40}\b(invest|profit|trading|scheme|plan)/i },
      { id: 'daily_profit', weight: 3.0, re: /\b(daily|weekly|monthly)\s+(profit|return|income|payout)\b/i },
    ],
  },
  job_offer: {
    label: 'Job / Task Scam',
    signals: [
      { id: 'wfh_offer', weight: 3.0, re: /\b(work\s?from\s?home|part[\s-]?time\s?job|online\s?job)\b[^.!?]{0,40}\b(earn|salary|income|daily|per day)/i },
      { id: 'task_earn', weight: 3.5, re: /\b(complete|do)\b[^.!?]{0,20}\b(task|review|rating|like)\b[^.!?]{0,25}\b(earn|get paid|receive)/i },
      { id: 'no_experience', weight: 2.0, re: /\bno\s+(experience|skill|investment)\s+(required|needed)\b/i },
      { id: 'job_selected', weight: 2.5, re: /\b(selected|shortlisted|hired)\b[^.!?]{0,30}\b(position|role|job|vacancy)/i },
    ],
  },
  courier_customs: {
    label: 'Courier / Customs',
    signals: [
      { id: 'parcel_held', weight: 3.5, re: /\b(parcel|package|courier|shipment|consignment)\b[^.!?]{0,35}\b(held|stuck|customs|clearance|seiz|detain|undeliver)/i },
      { id: 'delivery_fee', weight: 3.0, re: /\b(delivery|shipping|customs|redelivery)\b[^.!?]{0,25}\b(fee|charge|payment|duty)\b/i },
      { id: 'fedex_impersonation', weight: 2.0, re: /\b(fedex|dhl|bluedart|india\s?post|dtdc)\b/i },
    ],
  },
  romance: {
    label: 'Romance / Social',
    signals: [
      { id: 'stranded', weight: 4.0, re: /\b(stranded|stuck|emergency|hospital|accident)\b[^.!?]{0,40}\b(need|send|help)\b[^.!?]{0,25}\b(money|fund|cash)/i },
      { id: 'gift_card_request', weight: 4.0, re: /\b(gift\s?card|itunes|steam\s?card|google\s?play\s?code|amazon\s?card)\b/i },
      { id: 'deployed_soldier', weight: 3.0, re: /\b(deployed|army|military|peacekeep|un mission)\b[^.!?]{0,40}\b(gift|money|transfer|help)/i },
      { id: 'inheritance', weight: 3.5, re: /\b(inheritance|next of kin|beneficiary|will of|deceased client)\b/i },
    ],
  },
  loan_offer: {
    label: 'Loan / Credit',
    signals: [
      { id: 'instant_loan', weight: 3.0, re: /\b(instant|quick|pre[\s-]?approved)\s+(loan|credit|cash)\b/i },
      { id: 'no_cibil', weight: 3.0, re: /\b(no\s?cibil|bad\s?credit\s?ok|without\s?documents?)\b/i },
      { id: 'loan_advance_fee', weight: 3.5, re: /\b(loan|credit)\b[^.!?]{0,40}\b(advance|upfront|security)\s?(fee|deposit|payment)/i },
    ],
  },
  phishing: {
    label: 'Phishing',
    signals: [
      { id: 'click_link', weight: 2.5, re: /\b(click|tap|open|visit)\b[^.!?]{0,20}\b(here|link|below|now|url)/i },
      { id: 'login_credentials', weight: 3.5, re: /\b(login|sign\s?in|log\s?in)\b[^.!?]{0,30}\b(verify|confirm|restore|secure|update)/i },
      { id: 'update_details', weight: 2.5, re: /\b(update|confirm|re[\s-]?submit)\b[^.!?]{0,25}\b(details|information|credentials|profile)/i },
      { id: 'account_closure', weight: 3.0, re: /\b(account|service)\b[^.!?]{0,30}\bwill be\b[^.!?]{0,25}\b(closed|terminated|deleted|suspended)/i },
    ],
  },
};

/** Pressure and manipulation tactics. They boost score but name no category. */
const GENERIC_SIGNALS = [
  { id: 'urgency', weight: 1.5, re: /\b(urgent|immediately|right now|within \d+ (min|hour)|expires? (today|soon|in)|last (chance|warning)|act now|hurry)\b/i },
  { id: 'threat_consequence', weight: 2.0, re: /\b(legal action|police|arrest|fir |penalty|fine|court|blacklist)\b/i },
  { id: 'secrecy', weight: 2.0, re: /\b(do not (tell|share|inform)|keep (this|it) (secret|confidential)|between us)\b/i },
  { id: 'money_request', weight: 2.5, re: /\b(send|transfer|pay|deposit|remit)\b[^.!?]{0,25}\b(money|amount|rs\.?|inr|₹|\$|fee|rupees)/i },
  { id: 'currency_amount', weight: 1.0, re: /(₹|rs\.?\s?|inr\s?|\$)\s?\d{2,3}(,\d{2,3})*(\.\d+)?|\b\d+\s?(lakh|crore|k)\b/i },
  { id: 'authority_claim', weight: 1.5, re: /\b(rbi|income tax|govt|government|cyber cell|trai|npci|sebi|customs department)\b/i },
  { id: 'shouting', weight: 0.8, test: (t) => t.length > 20 && (t.replace(/[^A-Z]/g, '').length / t.replace(/[^a-zA-Z]/g, '').length) > 0.6 },
  { id: 'excess_punctuation', weight: 0.6, re: /[!?]{3,}/ },
  { id: 'poor_grammar', weight: 0.8, re: /\b(kindly do the needful|revert back|dear (customer|sir\/madam|user)|your good self)\b/i },
];

/** Structural evidence, derived from what the extractor actually found. */
const STRUCTURAL = [
  { id: 'payment_handle_present', weight: 3.0, types: ['upi_id'] },
  { id: 'bank_details_present', weight: 2.5, types: ['bank_account', 'ifsc'] },
  { id: 'crypto_wallet_present', weight: 3.0, types: ['crypto_wallet'] },
  { id: 'card_number_present', weight: 3.0, types: ['card_number'] },
  { id: 'suspicious_link_present', weight: 2.0, types: ['phishing_url'] },
];

/** Evidence needed for ~86% confidence. Tuned so one strong tell ≈ 0.55. */
const SATURATION = 5.0;

const BANDS = [
  { min: 0.85, band: 'critical' },
  { min: 0.7, band: 'high' },
  { min: 0.5, band: 'medium' },
  { min: 0.3, band: 'low' },
  { min: 0, band: 'none' },
];

function matches(signal, text) {
  return signal.test ? signal.test(text) : signal.re.test(text);
}

/** Band for a confidence value. Exported so callers scoring a *peak* confidence
 *  label it with the matching band rather than the latest turn's. */
export function bandFor(confidence) {
  return BANDS.find((b) => confidence >= b.min).band;
}

/**
 * Scores a message.
 *
 * @param {string} text incoming message
 * @param {object} [extracted] output of extractIntelligence, for structural signals
 * @param {object} [prior] previous conversation score, so evidence accumulates across turns
 */
export function detectScam(text, extracted = null, prior = null) {
  const signals = [];
  const categoryScores = {};

  if (typeof text !== 'string' || !text.trim()) {
    return {
      is_scam: false,
      confidence: 0,
      scam_type: 'unknown',
      scam_label: 'Unknown',
      threat_score: 0,
      band: 'none',
      signals: [],
      category_scores: {},
    };
  }

  for (const [type, category] of Object.entries(CATEGORIES)) {
    let score = 0;
    for (const signal of category.signals) {
      if (!matches(signal, text)) continue;
      score += signal.weight;
      signals.push({ id: signal.id, weight: signal.weight, category: type });
    }
    if (score > 0) categoryScores[type] = Number(score.toFixed(2));
  }

  let generic = 0;
  for (const signal of GENERIC_SIGNALS) {
    if (!matches(signal, text)) continue;
    generic += signal.weight;
    signals.push({ id: signal.id, weight: signal.weight, category: 'generic' });
  }

  let structural = 0;
  if (extracted) {
    for (const rule of STRUCTURAL) {
      const hit = rule.types.some((t) => (extracted[t] ?? []).length > 0);
      if (!hit) continue;
      structural += rule.weight;
      signals.push({ id: rule.id, weight: rule.weight, category: 'structural' });
    }
  }

  // Only the best category counts, so a message hitting two categories weakly
  // does not outscore one hitting a single category decisively.
  const ranked = Object.entries(categoryScores).sort((a, b) => b[1] - a[1]);
  const [topType, topScore] = ranked[0] ?? [null, 0];

  // Runner-up categories still contribute, but heavily discounted.
  const runnerUp = ranked.slice(1).reduce((acc, [, s]) => acc + s * 0.25, 0);

  let raw = topScore + runnerUp + generic + structural;

  // Evidence carries forward: a scammer who already revealed themselves stays
  // flagged even when their next message is a bland "ok".
  if (prior?.raw_score) {
    raw = Math.max(raw, prior.raw_score * 0.8);
  }

  const confidence = Number((1 - Math.exp(-raw / SATURATION)).toFixed(3));
  const band = BANDS.find((b) => confidence >= b.min).band;
  const is_scam = confidence >= 0.5;

  const scam_type = is_scam ? (topType ?? 'generic_scam') : 'unknown';
  const scam_label = is_scam ? (CATEGORIES[topType]?.label ?? 'Generic Scam') : 'Unknown';

  return {
    is_scam,
    confidence,
    scam_type,
    scam_label,
    threat_score: Math.round(confidence * 100),
    band,
    raw_score: Number(raw.toFixed(2)),
    signals: signals.sort((a, b) => b.weight - a.weight),
    category_scores: categoryScores,
  };
}

export const SCAM_CATEGORIES = Object.fromEntries(
  Object.entries(CATEGORIES).map(([k, v]) => [k, v.label])
);
