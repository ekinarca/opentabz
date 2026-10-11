import type { StaffDisplay, TrackStaves, TrackSummary } from '@opentabz/core/shared';
import { Button, Dialog } from '@opentabz/ui';
import { useDocuments, type OpenDocument } from '../state/documents.ts';
import { strings } from '../strings.ts';

const s = strings.trackStaves;
const KINDS = ['standard', 'tablature', 'slash', 'numbered'] as const;
type Kind = (typeof KINDS)[number];

/** Whether a track can show tablature: strings, and not a drum kit. */
function stringed(track: TrackSummary): boolean {
  return track.staves.some(staff => staff.stringCount > 0 && !staff.isPercussion);
}

/** The staves a track shows now: chosen for it, else as the Staves menu and the file say. */
export function shownStaves(
  track: TrackSummary,
  display: StaffDisplay,
  chosen: readonly TrackStaves[],
): TrackStaves {
  const own = chosen.find(entry => entry.trackIndex === track.index);
  if (own !== undefined) return own;
  const staff = track.staves[0];
  const fromFile = {
    trackIndex: track.index,
    standard: staff?.showStandardNotation ?? true,
    tablature: staff?.showTablature ?? false,
    slash: staff?.showSlash ?? false,
    numbered: staff?.showNumbered ?? false,
  };
  if (display === 'default' || !stringed(track)) return fromFile;
  return {
    ...fromFile,
    standard: display === 'score-tab' || display === 'score',
    tablature: display === 'score-tab' || display === 'tab',
  };
}

/**
 * The kinds of staff each track shows (REND-031): standard notation, tablature, rhythm slashes
 * and numbered notation, chosen track by track.
 */
export function TrackStavesDialog({
  doc,
  open,
  onOpenChange,
}: {
  readonly doc: OpenDocument;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}) {
  const updateView = useDocuments(state => state.updateView);
  const { staffDisplay, staves } = doc.view;
  const choose = (track: TrackSummary, kind: Kind, on: boolean) => {
    const next = { ...shownStaves(track, staffDisplay, staves), [kind]: on };
    updateView(doc.key, {
      staves: [...staves.filter(entry => entry.trackIndex !== track.index), next].sort(
        (a, b) => a.trackIndex - b.trackIndex,
      ),
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={s.title}
      description={s.description}
      closeLabel={s.close}
      width="lg"
      footer={
        <Button
          disabled={staves.length === 0}
          onClick={() => {
            updateView(doc.key, { staves: [] });
          }}
        >
          {s.reset}
        </Button>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-line text-left text-[12px] text-ink-muted">
              <th scope="col" className="py-2 pr-3 font-medium">
                {s.track}
              </th>
              {KINDS.map(kind => (
                <th key={kind} scope="col" className="px-2 py-2 text-center font-medium">
                  {s.kinds[kind]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {doc.summary.tracks.map(track => {
              const name = track.name.trim().length > 0 ? track.name : track.shortName;
              const shown = shownStaves(track, staffDisplay, staves);
              const drums = track.staves.every(staff => staff.isPercussion);
              const unavailable: Readonly<Record<Kind, boolean>> = {
                standard: false,
                tablature: !stringed(track),
                slash: false,
                numbered: drums,
              };
              return (
                <tr key={track.index} className="border-b border-line/60 last:border-0">
                  <th scope="row" className="py-2 pr-3 text-left font-normal text-ink">
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block size-2.5 shrink-0 rounded-full"
                        style={{ background: track.color }}
                        aria-hidden
                      />
                      <span className="truncate">{name}</span>
                    </span>
                  </th>
                  {KINDS.map(kind => (
                    <td key={kind} className="px-2 py-2 text-center">
                      <input
                        type="checkbox"
                        aria-label={s.kindFor(s.kinds[kind], name)}
                        checked={shown[kind] && !unavailable[kind]}
                        disabled={unavailable[kind]}
                        onChange={event => {
                          choose(track, kind, event.target.checked);
                        }}
                        className="size-4 accent-[var(--ot-accent)] disabled:opacity-40"
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Dialog>
  );
}
