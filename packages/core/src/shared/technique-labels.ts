/**
 * The printed words of techniques (REND-242), which the stylesheet changes as Guitar Pro 8's
 * does: let ring, palm mute, slide, hammer-on, pull-off, slap, pop, pick scrape, rasgueado and
 * the whammy-bar mark. An empty word is the usual one.
 */
export const TECHNIQUE_LABELS = [
  'letRing',
  'palmMute',
  'slide',
  'hammerOn',
  'pullOff',
  'slap',
  'pop',
  'pickScrape',
  'rasgueado',
  'whammyBar',
] as const;
export type TechniqueLabel = (typeof TECHNIQUE_LABELS)[number];
export type TechniqueLabels = Readonly<Record<TechniqueLabel, string>>;

/** The usual words, as Guitar Pro prints them. */
export const USUAL_TECHNIQUE_LABELS: TechniqueLabels = {
  letRing: 'let ring',
  palmMute: 'P.M.',
  slide: 'sl.',
  hammerOn: 'H',
  pullOff: 'P',
  slap: 'S',
  pop: 'P',
  pickScrape: 'P.S.',
  rasgueado: 'rasg.',
  whammyBar: 'w/bar',
};

/** Every technique written with its usual word. */
export const DEFAULT_TECHNIQUE_LABELS: TechniqueLabels = {
  letRing: '',
  palmMute: '',
  slide: '',
  hammerOn: '',
  pullOff: '',
  slap: '',
  pop: '',
  pickScrape: '',
  rasgueado: '',
  whammyBar: '',
};

/** The longest word a technique can be given. */
export const TECHNIQUE_LABEL_MAX = 20;

export function sameTechniqueLabels(a: TechniqueLabels, b: TechniqueLabels): boolean {
  return TECHNIQUE_LABELS.every(key => a[key] === b[key]);
}
