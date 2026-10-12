/**
 * Engine worker entry: owns every document and render session (ADR-0004). Forwards protocol
 * requests to the EngineHost and answers with structured-cloneable results.
 */
import {
  EngineHost,
  serializeError,
  type EngineMethod,
  type EngineRequestMessage,
  type EngineResponseMessage,
} from '@opentabz/core';

interface WorkerScope {
  postMessage(message: EngineResponseMessage): void;
  addEventListener(type: 'message', listener: (event: MessageEvent<unknown>) => void): void;
}

const scope = self as unknown as WorkerScope;
const host = new EngineHost();

function isRequest(data: unknown): data is EngineRequestMessage {
  return typeof data === 'object' && data !== null && (data as { kind?: unknown }).kind === 'request';
}

function dispatch(message: EngineRequestMessage): unknown {
  const method: EngineMethod = message.method;
  switch (method) {
    case 'init':
      return host.init(message.args as EngineRequestMessage<'init'>['args']);
    case 'open':
      return host.open(message.args as EngineRequestMessage<'open'>['args']);
    case 'closeDocument':
      return host.closeDocument(message.args as EngineRequestMessage<'closeDocument'>['args']);
    case 'layoutView':
      return host.layoutView(message.args as EngineRequestMessage<'layoutView'>['args']);
    case 'paint':
      return host.paint(message.args as EngineRequestMessage<'paint'>['args']);
    case 'closeView':
      return host.closeView(message.args as EngineRequestMessage<'closeView'>['args']);
    case 'edit':
      return host.edit(message.args as EngineRequestMessage<'edit'>['args']);
    case 'undo':
      return host.undo(message.args as EngineRequestMessage<'undo'>['args']);
    case 'redo':
      return host.redo(message.args as EngineRequestMessage<'redo'>['args']);
    case 'trackProperties':
      return host.trackProperties(message.args as EngineRequestMessage<'trackProperties'>['args']);
    case 'barProperties':
      return host.barProperties(message.args as EngineRequestMessage<'barProperties'>['args']);
    case 'trackBeats':
      return host.trackBeats(message.args as EngineRequestMessage<'trackBeats'>['args']);
    case 'saveDocument':
      return host.saveDocument(message.args as EngineRequestMessage<'saveDocument'>['args']);
    case 'blankDocument':
      return host.blankDocument(message.args as EngineRequestMessage<'blankDocument'>['args']);
    case 'connectSynth':
      return host.connectSynth(message.args as EngineRequestMessage<'connectSynth'>['args']);
    case 'preparePlayback':
      return host.preparePlayback(message.args as EngineRequestMessage<'preparePlayback'>['args']);
    case 'previewBeats':
      return host.previewBeats(message.args as EngineRequestMessage<'previewBeats'>['args']);
    case 'trackNotes':
      return host.trackNotes(message.args as EngineRequestMessage<'trackNotes'>['args']);
    case 'trackChords':
      return host.trackChords(message.args as EngineRequestMessage<'trackChords'>['args']);
    case 'trackLyrics':
      return host.trackLyrics(message.args as EngineRequestMessage<'trackLyrics'>['args']);
    case 'trackDrums':
      return host.trackDrums(message.args as EngineRequestMessage<'trackDrums'>['args']);
    case 'scoreOverview':
      return host.scoreOverview(message.args as EngineRequestMessage<'scoreOverview'>['args']);
    case 'unfoldDocument':
      return host.unfoldDocument(message.args as EngineRequestMessage<'unfoldDocument'>['args']);
    case 'registerMusicFont':
      return host.registerMusicFont(message.args as EngineRequestMessage<'registerMusicFont'>['args']);
    case 'exportAudioSong':
      return host.exportAudioSong(message.args as EngineRequestMessage<'exportAudioSong'>['args']);
    case 'exportMidi':
      return host.exportMidi(message.args as EngineRequestMessage<'exportMidi'>['args']);
  }
}

scope.addEventListener('message', event => {
  const data = event.data;
  if (!isRequest(data)) return;
  try {
    scope.postMessage({ kind: 'response', id: data.id, ok: true, result: dispatch(data) });
  } catch (error) {
    scope.postMessage({ kind: 'response', id: data.id, ok: false, error: serializeError(error) });
  }
});
