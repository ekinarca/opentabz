import {
  BUILT_IN_MUSIC_FONTS,
  DEFAULT_MUSIC_FONT,
  isBuiltInMusicFont,
  OWN_MUSIC_FONT_PREFIX,
} from '@opentabz/core/shared';
import { Button } from '@opentabz/ui';
import { useEffect, useId, useRef, useState } from 'react';
import { addOwnMusicFont, deleteOwnMusicFont, useOwnMusicFonts } from '../state/own-music-fonts.ts';
import { strings } from '../strings.ts';
import { Field, SELECT_CLASS } from './MetronomeSettingsForm.tsx';

const s = strings.stylesheet;

/**
 * The music font (REND-241): Bravura, engraved; Petaluma, handwritten; or any SMuFL font of one's
 * own, added from its font file and metadata (kept in this browser) and removed again.
 */
export function MusicFontField({
  value,
  onChange,
}: {
  readonly value: string;
  readonly onChange: (musicFont: string) => void;
}) {
  const id = useId();
  const fonts = useOwnMusicFonts(state => state.fonts);
  const refresh = useOwnMusicFonts(state => state.refresh);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const own = fonts.find(font => font.id === value);
  // A font of one's own chosen in another browser, or removed: the score is set in Bravura.
  const missing = value.startsWith(OWN_MUSIC_FONT_PREFIX) && own === undefined;
  const hint = isBuiltInMusicFont(value)
    ? s.musicFontHints[value]
    : missing
      ? s.ownFonts.missingHint
      : s.ownFonts.ownHint;

  const add = (files: readonly File[]) => {
    setAdding(true);
    setError(null);
    addOwnMusicFont(files)
      .then(onChange, (failure: unknown) => {
        setError(failure instanceof Error ? failure.message : String(failure));
      })
      .finally(() => {
        setAdding(false);
      });
  };

  return (
    <Field label={s.musicFont} htmlFor={id} hint={hint}>
      <div className="flex flex-wrap items-center gap-2">
        <select
          id={id}
          value={value}
          onChange={event => {
            onChange(event.target.value);
          }}
          className={`${SELECT_CLASS} min-w-0 flex-1`}
        >
          {BUILT_IN_MUSIC_FONTS.map(font => (
            <option key={font} value={font}>
              {s.musicFonts[font]}
            </option>
          ))}
          {(fonts.length > 0 || missing) && (
            <optgroup label={s.ownFonts.group}>
              {fonts.map(font => (
                <option key={font.id} value={font.id}>
                  {font.name}
                </option>
              ))}
              {missing && <option value={value}>{s.ownFonts.missing}</option>}
            </optgroup>
          )}
        </select>
        <Button
          size="sm"
          disabled={adding}
          onClick={() => {
            input.current?.click();
          }}
        >
          {s.ownFonts.add}
        </Button>
        {own !== undefined && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              void deleteOwnMusicFont(own.id).then(() => {
                onChange(DEFAULT_MUSIC_FONT);
              });
            }}
          >
            {s.ownFonts.remove(own.name)}
          </Button>
        )}
        <input
          ref={input}
          type="file"
          accept=".otf,.ttf,.woff,.json"
          multiple
          hidden
          aria-label={s.ownFonts.files}
          onChange={event => {
            const files = [...(event.target.files ?? [])];
            event.target.value = '';
            if (files.length > 0) add(files);
          }}
        />
      </div>
      {error !== null && (
        <p role="alert" className="text-[12px] text-danger">
          {error}
        </p>
      )}
    </Field>
  );
}
