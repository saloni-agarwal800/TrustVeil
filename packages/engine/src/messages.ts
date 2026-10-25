import type { Lang, LocalizedText, Severity } from '@trustveil/shared';

type Vars = Record<string, string | number>;

/** Plain-language reasons. {name} placeholders are filled from `vars`. */
const MESSAGES: Record<string, LocalizedText> = {
  'preticked-consent': {
    en: 'A subscription box is already ticked for you.',
    hinglish: 'Subscription wala box pehle se tick kar diya gaya hai.'
  },
  'tiny-decline-button': {
    en: 'The "no" option is made small or hard to see.',
    hinglish: '"Nahi" ka option chhota ya mushkil se dikhne wala banaya gaya hai.'
  },
  'countdown-timer': {
    en: 'A countdown timer is pushing you to decide fast.',
    hinglish: 'Countdown timer aapko jaldi faisla karne ke liye daba raha hai.'
  },
  'urgency-language': {
    en: 'The page uses pressure words like "{phrases}".',
    hinglish: 'Page pressure wale shabd use kar raha hai, jaise "{phrases}".'
  },
  'price-trap': {
    en: 'A tiny starting price (Rs {low}) turns into Rs {high} later.',
    hinglish: 'Shuruaat mein sirf Rs {low}, lekin baad mein Rs {high} cut sakte hain.'
  },
  'hidden-fineprint': {
    en: 'Important billing terms are hidden in tiny print.',
    hinglish: 'Billing ki zaroori baatein bahut chhote akshar mein chhupai gayi hain.'
  },
  'no-https-sensitive': {
    en: 'This page asks for a password or card but is not secure (no HTTPS).',
    hinglish: 'Ye page password ya card maangta hai par secure nahi hai (HTTPS nahi).'
  },
  'lookalike-domain': {
    en: 'The web address looks like {brand} but is not the real {brand} site.',
    hinglish: 'Ye web address {brand} jaisa dikhta hai par asli {brand} site nahi hai.'
  },
  'brand-mismatch': {
    en: 'The page says it is {brand}, but the address does not belong to {brand}.',
    hinglish: 'Page khud ko {brand} bata raha hai, par address {brand} ka nahi hai.'
  },
  'punycode-domain': {
    en: 'The address uses look-alike characters to imitate another site.',
    hinglish: 'Address mein milte-julte akshar use hue hain taaki dusri site jaisa lage.'
  },

  'deep-recurring-charge': {
    en: 'Signing up leads to a repeating charge: {detail}.',
    hinglish: 'Signup ke baad baar-baar paise kat-te hain: {detail}.'
  },
  'deep-step-charge': {
    en: 'Step {n} charges {amount}.',
    hinglish: 'Step {n} mein {amount} charge hota hai.'
  },
  'deep-card-first': {
    en: 'It asks for card details before the trial starts.',
    hinglish: 'Trial shuru hone se pehle hi card details maangta hai.'
  },
  'deep-cancel-hidden': {
    en: 'Cancelling is hard: {detail}.',
    hinglish: 'Cancel karna mushkil hai: {detail}.'
  },
  'deep-hidden-fees': {
    en: 'Extra charges show up later: {detail}.',
    hinglish: 'Baad mein extra charges dikhte hain: {detail}.'
  },
  'deep-inconclusive': {
    en: 'Deep Check could not finish the signup flow, so it found nothing extra.',
    hinglish: 'Deep Check signup flow poora nahi kar paya, isliye kuch extra nahi mila.'
  }
};

function fill(template: string, vars: Vars): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));
}

export function message(id: string, vars: Vars = {}): LocalizedText {
  const m = MESSAGES[id];
  if (!m) return { en: id, hinglish: id };
  return { en: fill(m.en, vars), hinglish: fill(m.hinglish, vars) };
}

export function explain(finding: { message: LocalizedText }, lang: Lang): string {
  return finding.message[lang];
}

const LEVEL_LABEL: Record<Severity, LocalizedText> = {
  low: { en: 'Looks OK', hinglish: 'Theek lag raha hai' },
  medium: { en: 'Be careful', hinglish: 'Savdhan rahein' },
  high: { en: 'High risk', hinglish: 'Zyada khatra' }
};

const HEADLINE: Record<Severity, LocalizedText> = {
  low: {
    en: 'No warning signs found on this page.',
    hinglish: 'Is page pe koi warning sign nahi mila.'
  },
  medium: {
    en: 'This page has some warning signs.',
    hinglish: 'Is page mein kuch warning signs hain.'
  },
  high: {
    en: 'This page shows several scam signs. Do not pay or enter passwords.',
    hinglish: 'Is page pe kai scam ke nishaan hain. Paise ya password mat daaliye.'
  }
};

export function levelLabel(level: Severity, lang: Lang): string {
  return LEVEL_LABEL[level][lang];
}

export function headline(level: Severity, lang: Lang): string {
  return HEADLINE[level][lang];
}
