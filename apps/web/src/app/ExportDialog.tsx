import { Button, Dialog, SegmentedControl, Switch } from '@opentabz/ui';
import { Download } from 'lucide-react';
import { useRef, useState } from 'react';
import { AudioExportCancelled, exportWav } from '../audio/audio-export.ts';
import { getEngine } from '../engine/instance.ts';
import { silencedTracks } from '../state/audible.ts';
import { useDocuments, type OpenDocument } from '../state/documents.ts';
import { interpretations, usePlayer } from '../state/player.ts';
import { usePractice } from '../state/practice.ts';
import { useUi } from '../state/ui.ts';
import { strings } from '../strings.ts';
import { download, fileName } from './download.ts';
import { Field } from './MetronomeSettingsForm.tsx';

const s = strings.exportDialog;
const CHANNELS = ['two', 'one'] as const;
type Channels = (typeof CHANNELS)[number];

function title(doc: OpenDocument): string {
  return doc.summary.title || doc.source.name.replace(/\.[^.]*$/, '');
}

function failureOf(error: unknown): string {
  return s.failed(error instanceof Error ? error.message : String(error));
}

function Section({
  id,
  title: heading,
  hint,
  children,
}: {
  readonly id: string;
  readonly title: string;
  readonly hint: string;
  readonly children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4" aria-labelledby={id}>
      <div>
        <h3 id={id} className="text-[15px] font-semibold text-ink">
          {heading}
        </h3>
        <p className="mt-0.5 text-[12px] text-ink-muted">{hint}</p>
      </div>
      {children}
    </section>
  );
}

function MidiExport({ doc }: { readonly doc: OpenDocument }) {
  const [leaveOutMuted, setLeaveOutMuted] = useState(true);
  const [channels, setChannels] = useState<Channels>('two');
  const [working, setWorking] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const run = async () => {
    setWorking(true);
    setFailure(null);
    try {
      const { bytes } = await getEngine().call('exportMidi', {
        docId: doc.engineId,
        leaveOut: leaveOutMuted ? silencedTracks(doc.mix) : [],
        channelsPerTrack: channels === 'one' ? 1 : 2,
        interpretations: interpretations(doc),
      });
      download(bytes, fileName(title(doc), 'mid'), 'audio/midi');
    } catch (error) {
      setFailure(failureOf(error));
    } finally {
      setWorking(false);
    }
  };

  return (
    <Section id="export-midi" title={s.midi} hint={s.midiHint}>
      <Switch label={s.leaveOutMuted} checked={leaveOutMuted} onCheckedChange={setLeaveOutMuted} />
      <Field label={s.channels} hint={s.channelHints[channels]}>
        <SegmentedControl
          label={s.channels}
          value={channels}
          segments={CHANNELS.map(value => ({ value, label: s.channelOptions[value] }))}
          onValueChange={setChannels}
        />
      </Field>
      {failure !== null && (
        <p role="alert" className="text-[13px] text-danger">
          {failure}
        </p>
      )}
      <Button
        variant="primary"
        icon={<Download size={16} aria-hidden />}
        disabled={working}
        onClick={() => {
          void run();
        }}
      >
        {working ? s.working : s.exportMidi}
      </Button>
    </Section>
  );
}

function AudioExport({ doc }: { readonly doc: OpenDocument }) {
  const selection = usePlayer(state => (state.docKey === doc.key ? state.selection : null));
  const speed = usePlayer(state => state.speed);
  const practice = usePractice();
  const [selectionOnly, setSelectionOnly] = useState(true);
  const [atSpeed, setAtSpeed] = useState(true);
  const [metronome, setMetronome] = useState(practice.metronome);
  const [countIn, setCountIn] = useState(practice.countIn);
  const [progress, setProgress] = useState<number | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const percent = Math.round(speed * 100);

  const run = async () => {
    const controller = new AbortController();
    abort.current = controller;
    setProgress(0);
    setFailure(null);
    try {
      const wav = await exportWav(
        doc,
        practice,
        {
          range: selectionOnly ? selection : null,
          speed: atSpeed ? speed : 1,
          metronome,
          countIn,
        },
        setProgress,
        controller.signal,
      );
      download(wav, fileName(title(doc), 'wav'), 'audio/wav');
    } catch (error) {
      if (!(error instanceof AudioExportCancelled)) setFailure(failureOf(error));
    } finally {
      abort.current = null;
      setProgress(null);
    }
  };

  return (
    <Section id="export-audio" title={s.audio} hint={s.audioHint}>
      {selection === null ? (
        <p className="text-[12px] text-ink-muted">{s.noSelection}</p>
      ) : (
        <Switch label={s.selectionOnly} checked={selectionOnly} onCheckedChange={setSelectionOnly} />
      )}
      {speed !== 1 && (
        <Switch label={s.practiceSpeed(percent)} checked={atSpeed} onCheckedChange={setAtSpeed} />
      )}
      <Switch label={s.metronome} checked={metronome} onCheckedChange={setMetronome} />
      <Switch label={s.countIn} checked={countIn} onCheckedChange={setCountIn} />
      {failure !== null && (
        <p role="alert" className="text-[13px] text-danger">
          {failure}
        </p>
      )}
      {progress === null ? (
        <Button
          variant="primary"
          icon={<Download size={16} aria-hidden />}
          onClick={() => {
            void run();
          }}
        >
          {s.exportWav}
        </Button>
      ) : (
        <div className="flex items-center gap-3">
          <div
            role="progressbar"
            aria-label={s.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            className="h-2 flex-1 overflow-hidden rounded-full bg-sunken"
          >
            <div className="h-full bg-accent transition-[width]" style={{ width: `${progress * 100}%` }} />
          </div>
          <span className="w-28 text-right text-[12px] text-ink-muted tabular-nums">
            {s.rendering(Math.round(progress * 100))}
          </span>
          <Button
            onClick={() => {
              abort.current?.abort();
            }}
          >
            {s.cancel}
          </Button>
        </div>
      )}
    </Section>
  );
}

/** Saves the active score as a file for other programs: a MIDI file or the audio as WAV. */
export function ExportDialog() {
  const open = useUi(state => state.panel === 'export');
  const setPanelOpen = useUi(state => state.setPanelOpen);
  const doc = useDocuments(state => state.docs.find(candidate => candidate.key === state.activeKey) ?? null);

  return (
    <Dialog
      open={open && doc !== null}
      onOpenChange={value => {
        setPanelOpen('export', value);
      }}
      title={s.title}
      description={s.description}
      closeLabel={s.close}
      width="sm"
    >
      {doc !== null && (
        <div className="flex flex-col gap-6">
          <MidiExport doc={doc} />
          <div className="border-t border-line" />
          <AudioExport doc={doc} />
        </div>
      )}
    </Dialog>
  );
}
