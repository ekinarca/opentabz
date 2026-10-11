# 0013 — Section names on a row of their own

## Problem

Effect bands above a staff share a row when their _beats_ do not overlap
(`EffectBandSlot.canBeUsed`); the width of their text is not considered. A section name is
attached to the first beat of its bar but its text runs on over the following beats, so an
effect that starts on the second beat (natural harmonics, palm muting, let ring) was drawn on the
same row, through the name: "Intro" over "N.H.", "Verse" over "P.M.".

## Change

`src/rendering/effects/MarkerEffectInfo.ts`:

```ts
public get canShareBand(): boolean {
    return false;
}
```

Section names keep a row of their own, above the other effects, as Guitar Pro draws them. (A
general fix would let bands share a row only where their glyphs do not overlap horizontally,
which needs glyph widths when slots are assigned.)

## Tests

`apps/web/e2e/engraving.spec.ts` renders `fixtures/alphatex/rendering/text-collisions.atex` and
fails if any two texts on the same line overlap; without this change it reported "Intro × N.H."
and "Verse with a long name × P.M.".
