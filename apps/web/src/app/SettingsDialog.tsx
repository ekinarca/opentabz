import { STAFF_DISPLAYS } from '@opentabz/core/shared';
import { Dialog, SegmentedControl, Switch } from '@opentabz/ui';
import { useEffect, useId, useState } from 'react';
import { getAudioEngine } from '../audio/audio-engine.ts';
import { AUDIO_LATENCIES, usePreferences } from '../state/preferences.ts';
import { useUi } from '../state/ui.ts';
import { strings } from '../strings.ts';
import { loadStylesheets, setDefaultStylesheet } from '../state/stylesheets.ts';
import { Field, SELECT_CLASS } from './MetronomeSettingsForm.tsx';
import { choiceOf, StylesheetOptions, valueOf } from './StylesheetChoices.tsx';

const s = strings.settings;

/** The output's delay and the audio it skipped, read again while the dialog is open. */
function OutputStats() {
  const [stats, setStats] = useState(() => getAudioEngine().stats);
  useEffect(() => {
    const timer = window.setInterval(() => {
      setStats(getAudioEngine().stats);
    }, 500);
    return () => {
      window.clearInterval(timer);
    };
  }, []);
  return (
    <p role="status" className="text-[12px] text-ink-muted tabular-nums">
      {s.output(stats.latencyMs, stats.missedMs)}
    </p>
  );
}

/**
 * Settings that are not about one score: how much the audio output buffers (with what it does
 * now), what scores opened from now on start with, the instrument views and the keyboard.
 */
export function SettingsDialog() {
  const open = useUi(state => state.panel === 'settings');
  const setPanelOpen = useUi(state => state.setPanelOpen);
  const preferences = usePreferences();
  return (
    <Dialog
      open={open}
      onOpenChange={value => {
        setPanelOpen('settings', value);
      }}
      title={s.title}
      description={s.description}
      closeLabel={s.close}
      width="sm"
    >
      <div className="flex flex-col gap-5">
        <section className="flex flex-col gap-3" aria-labelledby="settings-sound">
          <h3
            id="settings-sound"
            className="text-[12px] font-semibold tracking-[0.08em] text-ink-faint uppercase"
          >
            {s.sound}
          </h3>
          <Field label={s.latency} hint={`${s.latencyHints[preferences.audioLatency]} ${s.latencyApplies}`}>
            <SegmentedControl
              label={s.latency}
              value={preferences.audioLatency}
              segments={AUDIO_LATENCIES.map(latency => ({ value: latency, label: s.latencies[latency] }))}
              onValueChange={audioLatency => {
                preferences.set({ audioLatency });
              }}
            />
          </Field>
          {open && <OutputStats />}
        </section>
        <NotationSettings />
        <section className="flex flex-col gap-3" aria-labelledby="settings-views">
          <h3
            id="settings-views"
            className="text-[12px] font-semibold tracking-[0.08em] text-ink-faint uppercase"
          >
            {s.views}
          </h3>
          <Switch
            label={s.leftHanded}
            checked={preferences.leftHanded}
            onCheckedChange={leftHanded => {
              preferences.set({ leftHanded });
            }}
          />
          <Switch
            label={s.invertedTab}
            hint={s.invertedTabHint}
            checked={preferences.invertedTab}
            onCheckedChange={invertedTab => {
              preferences.set({ invertedTab });
            }}
          />
        </section>
        <section className="flex flex-col gap-3" aria-labelledby="settings-keyboard">
          <h3
            id="settings-keyboard"
            className="text-[12px] font-semibold tracking-[0.08em] text-ink-faint uppercase"
          >
            {s.keyboard}
          </h3>
          <Switch
            label={strings.shortcuts.singleKeys}
            checked={preferences.singleKeyShortcuts}
            onCheckedChange={singleKeyShortcuts => {
              preferences.set({ singleKeyShortcuts });
            }}
          />
        </section>
      </div>
    </Dialog>
  );
}

/**
 * Notation preferences (PLAT-032): the staves, concert pitch and stylesheet that scores opened
 * from now on start with.
 */
function NotationSettings() {
  const preferences = usePreferences();
  const [stylesheets, setStylesheets] = useState(loadStylesheets);
  const stylesheetId = useId();
  return (
    <section className="flex flex-col gap-3" aria-labelledby="settings-notation">
      <h3
        id="settings-notation"
        className="text-[12px] font-semibold tracking-[0.08em] text-ink-faint uppercase"
      >
        {s.notation}
      </h3>
      <Field label={s.newStaves}>
        <SegmentedControl
          label={s.newStaves}
          value={preferences.staffDisplay}
          segments={STAFF_DISPLAYS.map(value => ({ value, label: strings.staffDisplays[value] }))}
          onValueChange={staffDisplay => {
            preferences.set({ staffDisplay });
          }}
        />
      </Field>
      <Switch
        label={s.newConcertPitch}
        hint={s.newConcertPitchHint}
        checked={preferences.concertPitch}
        onCheckedChange={concertPitch => {
          preferences.set({ concertPitch });
        }}
      />
      <Field label={s.newStylesheet} htmlFor={stylesheetId}>
        <select
          id={stylesheetId}
          value={valueOf(stylesheets.default)}
          onChange={event => {
            setDefaultStylesheet(choiceOf(event.target.value));
            setStylesheets(loadStylesheets());
          }}
          className={`${SELECT_CLASS} w-full`}
        >
          <option value="file">{strings.stylesheet.choices.asInFile}</option>
          <StylesheetOptions saved={stylesheets.saved} />
        </select>
      </Field>
    </section>
  );
}
