/**
 * The voice tool (EDIT-102): a voice's contents moved, copied or swapped with another's, in the
 * bars selected (else the caret's) or the whole track, as Guitar Pro's voice tool does it.
 */
import { MAX_VOICES } from '@opentabz/core/shared';
import { Button, Dialog, SegmentedControl } from '@opentabz/ui';
import { useId, useState } from 'react';
import { create } from 'zustand';
import { editingOf, voiceContents, type VoiceScope } from '../state/editing.ts';
import { strings } from '../strings.ts';
import { Field, SELECT_CLASS } from './MetronomeSettingsForm.tsx';

const s = strings.voicesDialog;
const VOICES = Array.from({ length: MAX_VOICES }, (_, index) => index);
type Mode = 'move' | 'copy' | 'swap';

export const useVoicesDialog = create<{
  readonly open: { readonly key: string; readonly from: number } | null;
}>(() => ({ open: null }));

/** Opens the voice tool, from the caret's voice; false when nothing is being edited. */
export function openVoicesDialog(key: string): boolean {
  const { on, caret } = editingOf(key);
  if (!on || caret === null) return false;
  useVoicesDialog.setState({ open: { key, from: caret.voice } });
  return true;
}

function VoicesForm({ open }: { readonly open: { readonly key: string; readonly from: number } }) {
  const id = useId();
  const [from, setFrom] = useState(open.from);
  const [to, setTo] = useState(open.from === 0 ? 1 : 0);
  const [mode, setMode] = useState<Mode>('move');
  const [scope, setScope] = useState<VoiceScope>('bars');
  const close = () => {
    useVoicesDialog.setState({ open: null });
  };
  const voiceSelect = (label: string, value: number, onChange: (voice: number) => void, suffix: string) => (
    <Field label={label} htmlFor={`${id}-${suffix}`}>
      <select
        id={`${id}-${suffix}`}
        value={value}
        onChange={event => {
          onChange(Number(event.target.value));
        }}
        className={`${SELECT_CLASS} w-full`}
      >
        {VOICES.map(voice => (
          <option key={voice} value={voice}>
            {strings.editing.voice(voice + 1)}
          </option>
        ))}
      </select>
    </Field>
  );
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={event => {
        event.preventDefault();
        voiceContents(open.key, from, to, mode, scope);
        close();
      }}
    >
      <SegmentedControl<Mode>
        label={s.mode}
        value={mode}
        onValueChange={setMode}
        segments={[
          { value: 'move', label: s.modes.move },
          { value: 'copy', label: s.modes.copy },
          { value: 'swap', label: s.modes.swap },
        ]}
      />
      <div className="grid grid-cols-2 gap-3">
        {voiceSelect(s.from, from, setFrom, 'from')}
        {voiceSelect(s.to, to, setTo, 'to')}
      </div>
      <Field label={s.scope}>
        <SegmentedControl<VoiceScope>
          label={s.scope}
          value={scope}
          onValueChange={setScope}
          segments={[
            { value: 'bars', label: s.scopes.bars },
            { value: 'track', label: s.scopes.track },
          ]}
        />
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={close}>
          {s.cancel}
        </Button>
        <Button variant="primary" type="submit" disabled={from === to}>
          {s.apply}
        </Button>
      </div>
    </form>
  );
}

export function VoicesDialog() {
  const open = useVoicesDialog(state => state.open);
  return (
    <Dialog
      open={open !== null}
      onOpenChange={next => {
        if (!next) useVoicesDialog.setState({ open: null });
      }}
      title={s.title}
      description={s.description}
      closeLabel={s.cancel}
    >
      {open !== null && <VoicesForm key={open.key} open={open} />}
    </Dialog>
  );
}
