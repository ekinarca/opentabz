/**
 * Synth worker entry (ADR-0015): runs alphaTab's synthesizer and writes audio into the shared
 * ring buffer that the AudioWorklet plays. MIDI arrives directly from the engine worker.
 */
import {
  RingWriter,
  SynthHost,
  type SynthCommand,
  type SynthDelivery,
  type SynthEvent,
} from '@opentabz/audio';

interface WorkerScope {
  postMessage(message: SynthEvent): void;
  addEventListener(type: 'message', listener: (event: MessageEvent<SynthCommand>) => void): void;
}

const scope = self as unknown as WorkerScope;
const host = new SynthHost(event => {
  scope.postMessage(event);
});

scope.addEventListener('message', event => {
  const command = event.data;
  if (command.type === 'init') {
    host.init(command.sampleRate, new RingWriter(command.ring));
    command.workletPort.onmessage = () => {
      host.progress();
    };
    command.enginePort.onmessage = (message: MessageEvent<SynthDelivery>) => {
      host.receive(message.data);
    };
    return;
  }
  host.handle(command);
});
