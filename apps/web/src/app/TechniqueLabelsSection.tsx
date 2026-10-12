import {
  TECHNIQUE_LABEL_MAX,
  TECHNIQUE_LABELS,
  USUAL_TECHNIQUE_LABELS,
  type ScoreStyle,
  type TechniqueLabel,
} from '@opentabz/core/shared';
import { useState } from 'react';
import { strings } from '../strings.ts';
import { SELECT_CLASS } from './MetronomeSettingsForm.tsx';

const s = strings.stylesheet.techniqueLabels;

/** A technique's word typed in a field, taken when the field is left or Enter is pressed. */
function LabelField({
  technique,
  value,
  onCommit,
}: {
  readonly technique: TechniqueLabel;
  readonly value: string;
  readonly onCommit: (value: string) => void;
}) {
  const [text, setText] = useState<string | null>(null);
  const commit = () => {
    if (text !== null && text !== value) onCommit(text);
    setText(null);
  };
  return (
    <label className="flex items-center justify-between gap-3 text-[13px] text-ink">
      <span className="min-w-0 truncate">{s.names[technique]}</span>
      <input
        type="text"
        value={text ?? value}
        placeholder={USUAL_TECHNIQUE_LABELS[technique]}
        maxLength={TECHNIQUE_LABEL_MAX}
        spellCheck={false}
        onChange={event => {
          setText(event.target.value);
        }}
        onBlur={commit}
        onKeyDown={event => {
          if (event.key === 'Enter') commit();
        }}
        className={`${SELECT_CLASS} h-8 w-28 shrink-0 text-[12.5px]`}
      />
    </label>
  );
}

/**
 * The printed words of techniques (REND-242): let ring, palm mute, slide, hammer-on, pull-off,
 * slap, pop, pick scrape, rasgueado and the whammy bar, each as typed or, left empty, as usual.
 */
export function TechniqueLabelsSection({
  style,
  set,
}: {
  readonly style: ScoreStyle;
  readonly set: (patch: Partial<ScoreStyle>) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {TECHNIQUE_LABELS.map(technique => (
          <LabelField
            key={technique}
            technique={technique}
            value={style.techniqueLabels[technique]}
            onCommit={label => {
              set({ techniqueLabels: { ...style.techniqueLabels, [technique]: label.trim() } });
            }}
          />
        ))}
      </div>
      <p className="text-[12px] text-ink-faint">{s.hint}</p>
    </div>
  );
}
