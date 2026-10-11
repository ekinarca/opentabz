import {
  FONT_FAMILIES,
  FONT_SIZE,
  TEXT_ELEMENTS,
  type ScoreStyle,
  type TextElement,
  type TextFont,
} from '@opentabz/core/shared';
import { useState } from 'react';
import { strings } from '../strings.ts';
import { SELECT_CLASS } from './MetronomeSettingsForm.tsx';

const s = strings.stylesheet.text;
type FamilyChoice = keyof typeof FONT_FAMILIES | 'other';
const FAMILY_CHOICES: readonly FamilyChoice[] = ['serif', 'sans', 'mono', 'other'];

function familyChoice(family: string): FamilyChoice {
  return (
    (Object.keys(FONT_FAMILIES) as (keyof typeof FONT_FAMILIES)[]).find(
      key => FONT_FAMILIES[key] === family,
    ) ?? 'other'
  );
}

/** A font named by its family, taken when the field is left or Enter is pressed. */
function FamilyField({
  label,
  value,
  onCommit,
}: {
  readonly label: string;
  readonly value: string;
  readonly onCommit: (family: string) => void;
}) {
  const [text, setText] = useState<string | null>(null);
  const commit = () => {
    const family = text?.trim() ?? '';
    // A named font falls back to the browser's sans-serif where it is not installed.
    if (family.length > 0 && family !== value)
      onCommit(family.includes(',') ? family : `"${family}", sans-serif`);
    setText(null);
  };
  return (
    <input
      type="text"
      aria-label={label}
      value={text ?? value}
      spellCheck={false}
      onChange={event => {
        setText(event.target.value);
      }}
      onBlur={commit}
      onKeyDown={event => {
        if (event.key === 'Enter') commit();
      }}
      className={`${SELECT_CLASS} h-8 w-40 min-w-0 text-[12.5px]`}
    />
  );
}

/** The size, typed in whole pixels within reason. */
function SizeField({
  label,
  value,
  onCommit,
}: {
  readonly label: string;
  readonly value: number;
  readonly onCommit: (size: number) => void;
}) {
  const [text, setText] = useState<string | null>(null);
  return (
    <input
      type="number"
      inputMode="numeric"
      aria-label={label}
      min={FONT_SIZE.min}
      max={FONT_SIZE.max}
      value={text ?? String(value)}
      onChange={event => {
        setText(event.target.value);
        const size = Number.parseInt(event.target.value, 10);
        if (Number.isInteger(size) && size >= FONT_SIZE.min && size <= FONT_SIZE.max) onCommit(size);
      }}
      onBlur={() => {
        setText(null);
      }}
      className={`${SELECT_CLASS} h-8 w-16 font-mono tabular-nums`}
    />
  );
}

/** The font of each kind of text (REND-238): family, size, bold and italic. */
export function TextFontsSection({
  style,
  set,
}: {
  readonly style: ScoreStyle;
  readonly set: (patch: Partial<ScoreStyle>) => void;
}) {
  const setFont = (element: TextElement, patch: Partial<TextFont>) => {
    set({ fonts: { ...style.fonts, [element]: { ...style.fonts[element], ...patch } } });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-line text-left text-[12px] text-ink-muted">
            <th scope="col" className="py-1.5 pr-2 font-medium">
              {s.kind}
            </th>
            <th scope="col" className="py-1.5 pr-2 font-medium">
              {s.family}
            </th>
            <th scope="col" className="py-1.5 pr-2 font-medium">
              {s.size}
            </th>
            <th scope="col" className="px-1 py-1.5 text-center font-medium">
              {s.bold}
            </th>
            <th scope="col" className="px-1 py-1.5 text-center font-medium">
              {s.italic}
            </th>
          </tr>
        </thead>
        <tbody>
          {TEXT_ELEMENTS.map(element => {
            const font = style.fonts[element];
            const name = s.elements[element];
            const choice = familyChoice(font.family);
            return (
              <tr key={element} className="border-b border-line/60 last:border-0">
                <th scope="row" className="py-1.5 pr-2 text-left font-normal whitespace-nowrap text-ink">
                  {name}
                </th>
                <td className="py-1.5 pr-2">
                  <div className="flex items-center gap-1.5">
                    <select
                      aria-label={s.familyOf(name)}
                      value={choice}
                      onChange={event => {
                        const next = FAMILY_CHOICES.find(option => option === event.target.value);
                        if (next !== undefined && next !== 'other')
                          setFont(element, { family: FONT_FAMILIES[next] });
                      }}
                      className={`${SELECT_CLASS} h-8 text-[12.5px]`}
                    >
                      {FAMILY_CHOICES.map(option => (
                        <option key={option} value={option}>
                          {s.families[option]}
                        </option>
                      ))}
                    </select>
                    <FamilyField
                      label={s.fontOf(name)}
                      value={font.family}
                      onCommit={family => {
                        setFont(element, { family });
                      }}
                    />
                  </div>
                </td>
                <td className="py-1.5 pr-2">
                  <SizeField
                    label={s.sizeOf(name)}
                    value={font.size}
                    onCommit={size => {
                      setFont(element, { size });
                    }}
                  />
                </td>
                <td className="px-1 py-1.5 text-center">
                  <input
                    type="checkbox"
                    aria-label={s.boldOf(name)}
                    checked={font.bold}
                    onChange={event => {
                      setFont(element, { bold: event.target.checked });
                    }}
                    className="size-4 accent-[var(--ot-accent)]"
                  />
                </td>
                <td className="px-1 py-1.5 text-center">
                  <input
                    type="checkbox"
                    aria-label={s.italicOf(name)}
                    checked={font.italic}
                    onChange={event => {
                      setFont(element, { italic: event.target.checked });
                    }}
                    className="size-4 accent-[var(--ot-accent)]"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
