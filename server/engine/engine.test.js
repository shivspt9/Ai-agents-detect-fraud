import { describe, it, expect } from 'vitest';
import { extractIntelligence, toValueMap } from './extraction.js';
import { detectScam, bandFor } from './detection.js';
import { generateReply, resolveStage } from './agent.js';

describe('extraction', () => {
  it('does not report the same digits as two different entities', () => {
    // The old engine reported "a/c 123456789012" AND "123456789012" AND the
    // same digits again as a phone number. Masking must prevent that.
    const out = toValueMap(extractIntelligence('Transfer to a/c 918273645501 now'));
    expect(out.bank_account).toEqual(['918273645501']);
    expect(out.phone_number).toEqual([]);
  });

  it('does not report the label prefix as part of a UPI id', () => {
    const out = toValueMap(extractIntelligence('Pay to UPI scammer@paytm today'));
    expect(out.upi_id).toEqual(['scammer@paytm']);
  });

  it('separates an email from a UPI handle by the dotted TLD', () => {
    const out = toValueMap(
      extractIntelligence('mail me at fraud@gmail.com or pay victim@okhdfcbank')
    );
    expect(out.email).toEqual(['fraud@gmail.com']);
    expect(out.upi_id).toEqual(['victim@okhdfcbank']);
  });

  it('does not mistake digits inside a URL for an account number', () => {
    const out = toValueMap(extractIntelligence('go to http://pay.tk/id/918273645501x now'));
    expect(out.phishing_url).toEqual(['http://pay.tk/id/918273645501x']);
    expect(out.bank_account).toEqual([]);
  });

  it('accepts a Luhn-valid card and rejects an invalid one', () => {
    expect(toValueMap(extractIntelligence('card 4532015112830366')).card_number).toEqual([
      '4532015112830366',
    ]);
    expect(toValueMap(extractIntelligence('card 4532015112830367')).card_number).toEqual([]);
  });

  it('validates IFSC structure', () => {
    expect(toValueMap(extractIntelligence('IFSC HDFC0001234')).ifsc).toEqual(['HDFC0001234']);
    // A literal 0 in position 5 is required; HDFC1001234 is not an IFSC.
    expect(toValueMap(extractIntelligence('IFSC HDFC1001234')).ifsc).toEqual([]);
  });

  it('strips trailing sentence punctuation from a URL', () => {
    const out = toValueMap(extractIntelligence('Visit http://scam.tk/pay.'));
    expect(out.phishing_url).toEqual(['http://scam.tk/pay']);
  });

  it('grades a known UPI handle above an unknown one', () => {
    const known = extractIntelligence('pay fraudster@paytm').upi_id[0];
    const unknown = extractIntelligence('pay fraudster@zzqq').upi_id[0];
    expect(known.confidence).toBeGreaterThan(unknown.confidence);
  });

  it('ignores a single-character local part, which is almost always noise', () => {
    expect(toValueMap(extractIntelligence('rated a@10 overall')).upi_id).toEqual([]);
  });
});

describe('detection', () => {
  it('scores an ordinary message as not a scam', () => {
    const result = detectScam('Are we still meeting at 5pm for the review?');
    expect(result.is_scam).toBe(false);
    expect(result.confidence).toBe(0);
  });

  it('does not flag a delivery notification', () => {
    const result = detectScam('Your order #402-9981726 has been delivered. Rate it in the app.');
    expect(result.is_scam).toBe(false);
  });

  it('classifies a KYC scam and names the category', () => {
    const result = detectScam('URGENT: Your KYC has expired, account will be blocked today.');
    expect(result.is_scam).toBe(true);
    expect(result.scam_type).toBe('kyc_fraud');
    expect(['high', 'critical']).toContain(result.band);
  });

  it('escalates to critical once a payment channel is attached', () => {
    const text = 'URGENT: Your KYC has expired, account blocked. Update at http://kyc-verify.tk';
    const result = detectScam(text, extractIntelligence(text));
    expect(result.band).toBe('critical');
  });

  it('classifies a lottery scam', () => {
    const result = detectScam(
      'CONGRATULATIONS you WON Rs 25,00,000! Pay processing fee to claim your prize.'
    );
    expect(result.scam_type).toBe('lottery_prize');
  });

  it('raises confidence when payment details are present', () => {
    const text = 'Send the fee to claim your prize';
    const without = detectScam(text);
    const withIntel = detectScam(text, extractIntelligence(`${text} at upi win@paytm`));
    expect(withIntel.confidence).toBeGreaterThan(without.confidence);
  });

  it('carries evidence forward so a bland follow-up stays flagged', () => {
    const first = detectScam('Your KYC expired, account blocked, share OTP now');
    const followUp = detectScam('ok', null, first);
    expect(followUp.is_scam).toBe(true);
    expect(detectScam('ok').is_scam).toBe(false);
  });

  it('labels a band consistent with its confidence', () => {
    expect(bandFor(0.9)).toBe('critical');
    expect(bandFor(0.75)).toBe('high');
    expect(bandFor(0.55)).toBe('medium');
    expect(bandFor(0.35)).toBe('low');
    expect(bandFor(0.1)).toBe('none');
  });
});

describe('agent', () => {
  const detection = { is_scam: true };

  it('keeps the same persona for a conversation across turns', () => {
    const a = generateReply({ conversationId: 'abc', turnCount: 1, detection });
    const b = generateReply({ conversationId: 'abc', turnCount: 5, detection });
    expect(a.persona.id).toBe(b.persona.id);
  });

  it('targets the highest-priority intelligence it does not have', () => {
    const result = generateReply({
      conversationId: 'x1',
      turnCount: 5,
      collectedTypes: ['upi_id'],
      detection,
    });
    expect(result.goal).toBe('bank_account');
  });

  it('advances stage as intelligence accumulates', () => {
    expect(resolveStage({ turnCount: 1, collectedTypes: [], isScam: true })).toBe('engaging');
    expect(resolveStage({ turnCount: 3, collectedTypes: [], isScam: true })).toBe('probing');
    expect(resolveStage({ turnCount: 5, collectedTypes: ['upi_id'], isScam: true })).toBe(
      'extracting'
    );
    expect(
      resolveStage({ turnCount: 7, collectedTypes: ['upi_id', 'ifsc'], isScam: true })
    ).toBe('stalling');
    expect(resolveStage({ turnCount: 20, collectedTypes: [], isScam: true })).toBe('closing');
  });

  it('stays in engaging for a message that is not a scam', () => {
    expect(resolveStage({ turnCount: 9, collectedTypes: [], isScam: false })).toBe('engaging');
  });

  it('avoids immediately repeating its previous reply', () => {
    const first = generateReply({ conversationId: 'rep', turnCount: 4, detection });
    const second = generateReply({
      conversationId: 'rep',
      turnCount: 4,
      detection,
      recentReplies: [first.reply],
    });
    expect(second.reply).not.toBe(first.reply);
  });

  it('never emits a digit sequence that could look like real payment data', () => {
    for (let turn = 1; turn <= 15; turn++) {
      for (const id of ['a', 'bb', 'ccc', 'dddd']) {
        const { reply } = generateReply({
          conversationId: id,
          turnCount: turn,
          message: 'send money to 918273645501',
          detection,
        });
        expect(reply).not.toMatch(/\d{6,}/);
      }
    }
  });
});
