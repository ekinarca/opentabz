import { Dialog } from '@opentabz/ui';
import type { OpenDocument } from '../state/documents.ts';
import { describeFormat, formatBytes, strings } from '../strings.ts';

const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

function noteName(midi: number): string {
  return `${NOTE_NAMES[((midi % 12) + 12) % 12] ?? '?'}${Math.floor(midi / 12) - 1}`;
}

export function SongInfoDialog({
  doc,
  open,
  onOpenChange,
}: {
  readonly doc: OpenDocument;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}) {
  const { summary } = doc;
  const fields = (Object.keys(strings.songInfo.fields) as (keyof typeof strings.songInfo.fields)[])
    .map(key => [strings.songInfo.fields[key], summary[key]] as const)
    .filter(([, value]) => value.trim().length > 0);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={summary.title.trim().length > 0 ? summary.title : doc.source.name}
      description={strings.songInfo.title}
      closeLabel={strings.songInfo.close}
      width="lg"
    >
      <dl className="grid grid-cols-[minmax(110px,max-content)_1fr] gap-x-6 gap-y-2 text-[14px]">
        {fields.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-ink-faint">{label}</dt>
            <dd className="whitespace-pre-wrap text-ink">{value}</dd>
          </div>
        ))}
        <dt className="text-ink-faint">{strings.songInfo.tempo}</dt>
        <dd className="text-ink">{strings.songInfo.tempoValue(summary.tempo, summary.tempoLabel)}</dd>
        <dt className="text-ink-faint">{strings.songInfo.bars}</dt>
        <dd className="text-ink tabular-nums">{summary.barCount}</dd>
        <dt className="text-ink-faint">{strings.songInfo.file}</dt>
        <dd className="break-all text-ink">{doc.source.name}</dd>
        <dt className="text-ink-faint">{strings.songInfo.format}</dt>
        <dd className="text-ink">{describeFormat(summary.format, summary.formatVersion)}</dd>
        <dt className="text-ink-faint">{strings.songInfo.size}</dt>
        <dd className="text-ink">{formatBytes(summary.byteLength)}</dd>
      </dl>

      <h3 className="mt-6 mb-2 text-[12px] font-semibold tracking-[0.08em] text-ink-faint uppercase">
        {strings.songInfo.tracks}
      </h3>
      <ul className="divide-y divide-line rounded-[10px] border border-line">
        {summary.tracks.map(track => (
          <li key={track.index} className="flex items-start gap-3 px-3 py-2">
            <span
              className="mt-1.5 inline-block size-2.5 shrink-0 rounded-full"
              style={{ background: track.color }}
              aria-hidden
            />
            <div className="min-w-0">
              <p className="text-[14px] text-ink">
                {track.name.trim().length > 0 ? track.name : track.shortName}
              </p>
              {track.staves.map(staff => (
                <p key={staff.index} className="text-[12px] text-ink-muted">
                  {staff.isPercussion
                    ? strings.songInfo.percussion
                    : staff.tuning.length > 0
                      ? `${strings.songInfo.tuning}: ${staff.tuningName.trim().length > 0 ? `${staff.tuningName} · ` : ''}${staff.tuning
                          .slice()
                          .reverse()
                          .map(noteName)
                          .join(' ')}`
                      : null}
                  {staff.capo > 0 ? ` · ${strings.songInfo.capo(staff.capo)}` : null}
                </p>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
