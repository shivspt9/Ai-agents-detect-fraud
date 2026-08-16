/**
 * The victim agent.
 *
 * Replaces the old random-phrase picker with a goal-directed state machine.
 * The agent holds a stable persona for the life of a conversation, advances
 * through engagement stages, and at every turn picks the reply most likely to
 * make the scammer volunteer a piece of intelligence we do not have yet.
 *
 * Two hard rules: never break character, and never send anything that could
 * function as real personal or payment data.
 */

/** Stable personas. Chosen once per conversation, derived from its id. */
const PERSONAS = [
  {
    id: 'sunita',
    name: 'Sunita',
    age: 54,
    occupation: 'retired school teacher',
    tech_level: 'low',
    voice: 'polite, slightly flustered, apologises a lot',
  },
  {
    id: 'ramesh',
    name: 'Ramesh',
    age: 61,
    occupation: 'retired bank clerk',
    tech_level: 'low',
    voice: 'cautious, asks a lot of procedural questions',
  },
  {
    id: 'priya',
    name: 'Priya',
    age: 29,
    occupation: 'shop owner',
    tech_level: 'medium',
    voice: 'busy, distracted, replies in short bursts',
  },
  {
    id: 'arjun',
    name: 'Arjun',
    age: 23,
    occupation: 'student',
    tech_level: 'medium',
    voice: 'eager, a bit gullible, uses casual Hinglish',
  },
];

export const STAGES = ['engaging', 'probing', 'extracting', 'stalling', 'closing'];

/**
 * What we still want, most valuable first. The agent steers toward the
 * highest-priority type it has not collected yet.
 */
const GOAL_PRIORITY = [
  'upi_id',
  'bank_account',
  'crypto_wallet',
  'phishing_url',
  'phone_number',
  'ifsc',
  'email',
];

/** Replies that bait a specific intel type out of the scammer. */
const GOAL_PROMPTS = {
  upi_id: [
    'Mera Google Pay chal raha hai. Aap apna UPI ID bhej do, main try karta hoon.',
    'PhonePe se bhej sakta hoon? Aapka UPI kya hai?',
    'Bank app nahi khul raha. UPI ID do, usme daal deta hoon.',
    'Scanner nahi aa raha screen pe. Aap UPI ID type karke bhejo please.',
  ],
  bank_account: [
    'UPI limit khatam ho gayi aaj ki. Account number aur IFSC bhejo, NEFT kar deta hoon.',
    'Mera beta kehta hai UPI safe nahi. Direct account number do, branch jaake jama kar dunga.',
    'Account number aur IFSC likh ke bhejo, main note kar leta hoon.',
    'Cheque se de sakta hoon? Account details aur naam bhejo.',
  ],
  crypto_wallet: [
    'Crypto wala option dikh raha hai. Aapka wallet address bhejo, dekh leta hoon.',
    'USDT bhejna hai to address kya hai? Main copy kar loonga.',
  ],
  phishing_url: [
    'Link nahi khula mere phone me. Dobara bhejo please.',
    'Woh website ka pura address bhejo, main laptop pe kholta hoon.',
    'Page blank aa raha hai. Koi aur link hai kya?',
  ],
  phone_number: [
    'Type karna mushkil hai mere liye. Aapka number bhejo, main call karta hoon.',
    'WhatsApp number do na, wahan baat karna aasan rahega.',
    'Call kar sakta hoon? Kaunsa number pe karun?',
  ],
  ifsc: [
    'Bank wale IFSC code maang rahe hain. Woh bhi bhej do.',
    'IFSC code ke bina form submit nahi ho raha. Kya hai woh?',
  ],
  email: [
    'Email pe bhej do details, main print karwa lunga. Aapka email kya hai?',
    'Mujhe likha hua chahiye. Email address bhejo.',
  ],
};

/** Stage-appropriate filler when the goal prompt would repeat itself. */
const STAGE_REPLIES = {
  engaging: [
    'Haan ji boliye, kya hua?',
    'Mujhe samajh nahi aaya. Thoda aur batayiye.',
    'Achha? Mujhe kuch message nahi mila tha.',
    'Ek minute, main chashma pehen leta hoon.',
    'Aap kaunse department se bol rahe ho?',
    'Sach me? Mujhe to pata hi nahi tha.',
  ],
  probing: [
    'Ye kaise hua? Maine to kuch kiya hi nahi.',
    'Aapka naam aur employee ID kya hai? Likh leta hoon.',
    'Kitne paise ki baat ho rahi hai exactly?',
    'Mere paas bank ka message nahi aaya. Aap sure ho?',
    'Isme koi charge to nahi lagega na?',
    'Pehle kabhi aisa nahi hua. Ye normal hai kya?',
  ],
  extracting: [
    'Thik hai, main karta hoon. Aage kya karna hai batao.',
    'Steps ek ek karke likho, main follow karunga.',
    'Kitna bhejna hai aur kahan? Sab detail me batao.',
    'Main ready hoon. Bas process samjha do.',
  ],
  stalling: [
    'Ek minute, network chala gaya tha.',
    'Beta bula raha hai, do minute me aata hoon.',
    'Bank app update ho raha hai abhi. Thoda ruko.',
    'OTP nahi aa raha abhi tak. Dobara bhejo.',
    'Transaction fail ho gaya. Kya karun ab?',
    'Balance check kar raha hoon, ek second.',
  ],
  closing: [
    'Aaj nahi ho payega. Kal baat karte hain.',
    'Mujhe beta se poochna padega pehle.',
    'Abhi bahar hoon, baad me message karta hoon.',
  ],
};

/** Reactions to specific things the scammer just said. */
const CUE_REPLIES = [
  {
    id: 'otp_request',
    re: /\b(otp|pin|cvv|mpin|password)\b/i,
    replies: [
      'OTP abhi tak aaya nahi mere phone pe. Aap bhej rahe ho na?',
      'OTP kaha se milega? Message me nahi dikh raha.',
      'Ruko, purana OTP expire ho gaya lagta hai. Naya bhejo.',
    ],
  },
  {
    id: 'remote_access',
    re: /\b(anydesk|teamviewer|remote|screen\s?shar|install)\b/i,
    replies: [
      'App download ho raha hai, slow net hai. Kitna time lagega?',
      'Install nahi ho raha, error aa raha hai. Koi aur tarika hai?',
      'Play Store pe kaunsa wala hai? Bahut saare dikh rahe hain.',
    ],
  },
  {
    id: 'urgency_pressure',
    re: /\b(urgent|immediately|right now|hurry|last (chance|warning)|expires?)\b/i,
    replies: [
      'Itni jaldi kyun? Mujhe thoda time do na.',
      'Ghabra mat raha hoon main. Bas dhang se samjha do.',
      'Thoda ruko, main buzurg aadmi hoon, dheere dheere hota hai.',
    ],
  },
  {
    id: 'threat',
    re: /\b(police|legal action|arrest|fir|penalty|court|blacklist)\b/i,
    replies: [
      'Police? Maine to kuch galat nahi kiya. Main dar gaya hoon.',
      'Aisa mat kaho, main sab kar dunga. Bas batao kya karna hai.',
    ],
  },
  {
    id: 'gift_card',
    re: /\b(gift\s?card|itunes|steam|google\s?play\s?code|amazon\s?card)\b/i,
    replies: [
      'Gift card kahan milega? Main dukaan jaakar puchta hoon.',
      'Kitne ka lena hai aur code kaise bhejun?',
    ],
  },
];

/** Deterministic persona pick, so the same conversation always gets the same one. */
function pickPersona(conversationId) {
  let hash = 0;
  for (let i = 0; i < conversationId.length; i++) {
    hash = (hash * 31 + conversationId.charCodeAt(i)) >>> 0;
  }
  return PERSONAS[hash % PERSONAS.length];
}

/** Rotates through a list without repeating what was just said. */
function choose(options, recent, seed) {
  const fresh = options.filter((o) => !recent.includes(o));
  const pool = fresh.length ? fresh : options;
  return pool[seed % pool.length];
}

/**
 * Decides the engagement stage from turn count and what has been collected.
 */
export function resolveStage({ turnCount, collectedTypes, isScam }) {
  if (!isScam) return 'engaging';
  if (turnCount >= 14) return 'closing';
  if (collectedTypes.length >= 2 && turnCount >= 6) return 'stalling';
  if (collectedTypes.length >= 1 || turnCount >= 4) return 'extracting';
  if (turnCount >= 2) return 'probing';
  return 'engaging';
}

/**
 * Produces the agent's next reply.
 *
 * @param {object} args
 * @param {string} args.conversationId
 * @param {string} args.message        what the scammer just sent
 * @param {number} args.turnCount
 * @param {string[]} args.collectedTypes intel types already extracted
 * @param {object} args.detection      output of detectScam
 * @param {string[]} [args.recentReplies] agent's last few replies, to avoid repeats
 * @returns {{reply: string, stage: string, goal: string|null, strategy: string, persona: object}}
 */
export function generateReply({
  conversationId,
  message = '',
  turnCount = 0,
  collectedTypes = [],
  detection = { is_scam: false },
  recentReplies = [],
}) {
  const persona = pickPersona(conversationId);
  const stage = resolveStage({
    turnCount,
    collectedTypes,
    isScam: detection.is_scam,
  });

  // Rotating seed keeps replies varied without needing stored RNG state.
  const seed = turnCount * 7 + conversationId.length;

  const goal = GOAL_PRIORITY.find((t) => !collectedTypes.includes(t)) ?? null;

  // A direct cue in the scammer's message takes priority: replying to what
  // they actually said is what keeps the persona believable.
  const cue = CUE_REPLIES.find((c) => c.re.test(message));

  let reply;
  let strategy;

  if (stage === 'closing') {
    reply = choose(STAGE_REPLIES.closing, recentReplies, seed);
    strategy = 'disengage without revealing the honeypot';
  } else if (cue && turnCount % 3 === 1) {
    reply = choose(cue.replies, recentReplies, seed);
    strategy = `react to ${cue.id.replace(/_/g, ' ')}`;
  } else if (goal && (stage === 'extracting' || stage === 'stalling') && GOAL_PROMPTS[goal]) {
    reply = choose(GOAL_PROMPTS[goal], recentReplies, seed);
    strategy = `bait ${goal.replace(/_/g, ' ')}`;
  } else if (cue) {
    reply = choose(cue.replies, recentReplies, seed);
    strategy = `react to ${cue.id.replace(/_/g, ' ')}`;
  } else {
    reply = choose(STAGE_REPLIES[stage], recentReplies, seed);
    strategy = `${stage}: keep them talking`;
  }

  return { reply, stage, goal, strategy, persona };
}

export { PERSONAS, GOAL_PRIORITY };
