import type { ScoreStyle } from '@opentabz/core/shared';
import { Button } from '@opentabz/ui';
import { useId, useState } from 'react';
import {
  applyStylesheet,
  deleteStylesheet,
  loadStylesheets,
  LOOK_IDS,
  saveStylesheet,
  setDefaultStylesheet,
  type StylesheetChoice,
} from '../state/stylesheets.ts';
import { strings } from '../strings.ts';
import { Field, SELECT_CLASS } from './MetronomeSettingsForm.tsx';

const s = strings.stylesheet.choices;

/** A stylesheet choice as an option value, and back. */
function valueOf(choice: StylesheetChoice | null): string {
  if (choice === null) return 'file';
  return 'look' in choice ? `look:${choice.look}` : `saved:${choice.saved}`;
}

function choiceOf(value: string): StylesheetChoice | null {
  const look = LOOK_IDS.find(id => value === `look:${id}`);
  if (look !== undefined) return { look };
  return value.startsWith('saved:') ? { saved: value.slice('saved:'.length) } : null;
}

/**
 * Stylesheets to choose from (REND-220, REND-310): bundled looks and one's own, applied to this
 * score, saved from it, and one of them the default for scores opened from now on.
 */
export function StylesheetChoices({
  style,
  fileStyle,
  onApply,
}: {
  readonly style: ScoreStyle;
  readonly fileStyle: ScoreStyle;
  readonly onApply: (style: ScoreStyle) => void;
}) {
  const [stored, setStored] = useState(loadStylesheets);
  const [name, setName] = useState('');
  const applyId = useId();
  const defaultId = useId();
  const nameId = useId();
  const reload = () => {
    setStored(loadStylesheets());
  };

  const options = (
    <>
      <optgroup label={s.looks}>
        {LOOK_IDS.map(look => (
          <option key={look} value={`look:${look}`}>
            {s.lookNames[look]}
          </option>
        ))}
      </optgroup>
      {stored.saved.length > 0 && (
        <optgroup label={s.own}>
          {stored.saved.map(entry => (
            <option key={entry.id} value={`saved:${entry.id}`}>
              {entry.name}
            </option>
          ))}
        </optgroup>
      )}
    </>
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label={s.apply} htmlFor={applyId} hint={s.applyHint}>
        <select
          id={applyId}
          value=""
          onChange={event => {
            const choice = choiceOf(event.target.value);
            if (choice !== null) onApply(applyStylesheet(choice, fileStyle));
          }}
          className={`${SELECT_CLASS} w-full`}
        >
          <option value="" disabled>
            {s.choose}
          </option>
          {options}
        </select>
      </Field>
      <Field label={s.default} htmlFor={defaultId} hint={s.defaultHint}>
        <select
          id={defaultId}
          value={valueOf(stored.default)}
          onChange={event => {
            setDefaultStylesheet(choiceOf(event.target.value));
            reload();
          }}
          className={`${SELECT_CLASS} w-full`}
        >
          <option value="file">{s.asInFile}</option>
          {options}
        </select>
      </Field>
      <form
        className="flex flex-col gap-1.5"
        onSubmit={event => {
          event.preventDefault();
          if (name.trim().length === 0) return;
          saveStylesheet(name, style);
          setName('');
          reload();
        }}
      >
        <label htmlFor={nameId} className="text-[13px] font-medium text-ink">
          {s.saveAs}
        </label>
        <div className="flex gap-2">
          <input
            id={nameId}
            type="text"
            value={name}
            maxLength={60}
            placeholder={s.namePlaceholder}
            onChange={event => {
              setName(event.target.value);
            }}
            className={`${SELECT_CLASS} min-w-0 flex-1`}
          />
          <Button type="submit" disabled={name.trim().length === 0}>
            {s.save}
          </Button>
        </div>
      </form>
      {stored.saved.length > 0 && (
        <ul aria-label={s.own} className="flex flex-col gap-1">
          {stored.saved.map(entry => (
            <li key={entry.id} className="flex items-center justify-between gap-2 text-[13px] text-ink">
              <span className="truncate">{entry.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  deleteStylesheet(entry.id);
                  reload();
                }}
              >
                {s.delete(entry.name)}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
