import { useId } from 'react';
import { useDocuments, type OpenDocument } from '../state/documents.ts';
import { strings } from '../strings.ts';
import { SELECT_CLASS } from './MetronomeSettingsForm.tsx';

/**
 * The active track, chosen from the instrument views (the fretboard, the keyboard, the chords),
 * marked with its colour (REND-036).
 */
export function TrackSelect({ doc }: { readonly doc: OpenDocument }) {
  const setActiveTrack = useDocuments(state => state.setActiveTrack);
  const id = useId();
  const track = doc.summary.tracks[doc.activeTrack] ?? doc.summary.tracks[0];
  return (
    <>
      <label htmlFor={id} className="sr-only">
        {strings.fretboard.track}
      </label>
      <span
        className="inline-block size-2.5 shrink-0 rounded-full"
        style={{ background: track?.color }}
        data-track-color={track?.color}
        aria-hidden
      />
      <select
        id={id}
        value={track?.index ?? 0}
        onChange={event => {
          setActiveTrack(doc.key, Number(event.target.value));
        }}
        className={`${SELECT_CLASS} h-8 max-w-[min(260px,40vw)]`}
      >
        {doc.summary.tracks.map(candidate => (
          <option key={candidate.index} value={candidate.index}>
            {strings.fretboard.trackOption(
              candidate.index + 1,
              candidate.name.trim().length > 0 ? candidate.name : candidate.shortName,
            )}
          </option>
        ))}
      </select>
    </>
  );
}
