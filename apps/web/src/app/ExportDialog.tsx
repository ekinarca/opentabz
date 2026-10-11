import { Button, Dialog, SegmentedControl, Switch } from '@opentabz/ui';
import { Download } from 'lucide-react';
import { useState } from 'react';
import { getEngine } from '../engine/instance.ts';
import { silencedTracks } from '../state/audible.ts';
import { useDocuments } from '../state/documents.ts';
import { interpretations } from '../state/player.ts';
import { useUi } from '../state/ui.ts';
import { strings } from '../strings.ts';
import { download, fileName } from './download.ts';
import { Field } from './MetronomeSettingsForm.tsx';

const s = strings.exportDialog;
const CHANNELS = ['two', 'one'] as const;
type Channels = (typeof CHANNELS)[number];

/** Saves the active score as a file for other programs: a Standard MIDI File. */
export function ExportDialog() {
  const open = useUi(state => state.panel === 'export');
  const setPanelOpen = useUi(state => state.setPanelOpen);
  const doc = useDocuments(state => state.docs.find(candidate => candidate.key === state.activeKey) ?? null);
  const [leaveOutMuted, setLeaveOutMuted] = useState(true);
  const [channels, setChannels] = useState<Channels>('two');
  const [working, setWorking] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const exportMidi = async () => {
    if (doc === null) return;
    setWorking(true);
    setFailure(null);
    try {
      const { bytes } = await getEngine().call('exportMidi', {
        docId: doc.engineId,
        leaveOut: leaveOutMuted ? silencedTracks(doc.mix) : [],
        channelsPerTrack: channels === 'one' ? 1 : 2,
        interpretations: interpretations(doc),
      });
      download(
        bytes,
        fileName(doc.summary.title || doc.source.name.replace(/\.[^.]*$/, ''), 'mid'),
        'audio/midi',
      );
    } catch (error) {
      setFailure(s.failed(error instanceof Error ? error.message : String(error)));
    } finally {
      setWorking(false);
    }
  };

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
      <section className="flex flex-col gap-4" aria-labelledby="export-midi">
        <div>
          <h3 id="export-midi" className="text-[15px] font-semibold text-ink">
            {s.midi}
          </h3>
          <p className="mt-0.5 text-[12px] text-ink-muted">{s.midiHint}</p>
        </div>
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
            void exportMidi();
          }}
        >
          {working ? s.working : s.exportMidi}
        </Button>
      </section>
    </Dialog>
  );
}
