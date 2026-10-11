import { Dialog, SegmentedControl, Slider, Switch } from '@opentabz/ui';
import { usePractice } from '../state/practice.ts';
import { useUi } from '../state/ui.ts';
import { strings } from '../strings.ts';
import { Field, MetronomeSettingsForm } from './MetronomeSettingsForm.tsx';

const s = strings.practice;

/** Count-in: on or off, one or two bars, before every loop pass, its own volume. */
function CountInSettings() {
  const countIn = usePractice(state => state.countIn);
  const bars = usePractice(state => state.countInBars);
  const everyLoop = usePractice(state => state.countInEveryLoop);
  const volume = usePractice(state => state.countInVolume);
  const set = usePractice(state => state.set);
  return (
    <section className="flex flex-col gap-4">
      <Switch
        label={s.countIn}
        hint={s.countInHint}
        checked={countIn}
        onCheckedChange={checked => {
          set({ countIn: checked });
        }}
      />
      <Field label={s.countInBars}>
        <SegmentedControl
          label={s.countInBars}
          value={String(bars)}
          segments={([1, 2] as const).map(count => ({
            value: String(count),
            label: s.countInBarsValue(count),
          }))}
          onValueChange={value => {
            set({ countInBars: value === '2' ? 2 : 1 });
          }}
        />
      </Field>
      <Switch
        label={s.countInEveryLoop}
        hint={s.countInEveryLoopHint}
        checked={everyLoop}
        onCheckedChange={checked => {
          set({ countInEveryLoop: checked });
        }}
      />
      <Field label={s.countInVolume} value={s.percent(volume)}>
        <Slider
          label={s.countInVolume}
          valueText={s.percent(volume)}
          value={volume}
          min={0}
          max={1}
          step={0.01}
          onValueChange={value => {
            set({ countInVolume: value });
          }}
        />
      </Field>
    </section>
  );
}

/** The song's metronome and count-in, in one dialog (the transport has their on/off toggles). */
export function PracticeDialog() {
  const open = useUi(state => state.panel === 'practice');
  const setPanelOpen = useUi(state => state.setPanelOpen);
  const metronome = usePractice(state => state.metronome);
  const set = usePractice(state => state.set);
  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        setPanelOpen('practice', next);
      }}
      title={s.title}
      description={s.description}
      closeLabel={s.close}
    >
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-4">
          <Switch
            label={s.metronome}
            hint={s.metronomeHint}
            checked={metronome}
            onCheckedChange={checked => {
              set({ metronome: checked });
            }}
          />
          <MetronomeSettingsForm />
        </section>
        <div className="h-px bg-line" aria-hidden />
        <CountInSettings />
      </div>
    </Dialog>
  );
}
