import { Button, Dialog, SegmentedControl, Switch } from '@opentabz/ui';
import { Download, Printer } from 'lucide-react';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { AudioExportCancelled, exportWav } from '../audio/audio-export.ts';
import { getEngine } from '../engine/instance.ts';
import {
  exportPageFiles,
  PAGE_FORMATS,
  pageRange,
  PagesCancelled,
  PNG_RESOLUTIONS,
  printSheets,
  type PageFormat,
  type PngResolution,
} from '../export/page-files.ts';
import { layoutPages, scoreTitle, type PagedScore } from '../export/pages.ts';
import { clearPrint, openPrintDialog, preparePrint, userJustActed } from '../export/print.ts';
import { silencedTracks } from '../state/audible.ts';
import { useDocuments, type OpenDocument } from '../state/documents.ts';
import { interpretations, usePlayer } from '../state/player.ts';
import { usePractice } from '../state/practice.ts';
import { useUi } from '../state/ui.ts';
import { strings } from '../strings.ts';
import { download, fileBase, fileName } from './download.ts';
import { Field, NumberField } from './MetronomeSettingsForm.tsx';

const s = strings.exportDialog;
const CHANNELS = ['two', 'one'] as const;
type Channels = (typeof CHANNELS)[number];
const PAGE_CHOICES = ['all', 'range'] as const;
type PageChoice = (typeof PAGE_CHOICES)[number];

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

/** A progress bar with its label and a Cancel button. */
function Progress({
  fraction,
  label,
  text,
  onCancel,
}: {
  readonly fraction: number;
  readonly label: string;
  readonly text: string;
  readonly onCancel: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(fraction * 100)}
        className="h-2 flex-1 overflow-hidden rounded-full bg-sunken"
      >
        <div className="h-full bg-accent transition-[width]" style={{ width: `${fraction * 100}%` }} />
      </div>
      <span className="w-36 text-right text-[12px] text-ink-muted tabular-nums">{text}</span>
      <Button onClick={onCancel}>{s.cancel}</Button>
    </div>
  );
}

/**
 * The score's pages as images (PNG, SVG) or printed: all of them or a range, PNG at a chosen
 * resolution, either with a transparent background.
 */
function PagesExport({ doc }: { readonly doc: OpenDocument }) {
  const [format, setFormat] = useState<PageFormat>('pdf');
  const [choice, setChoice] = useState<PageChoice>('all');
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState<number | null>(null);
  const [dpi, setDpi] = useState<PngResolution>(150);
  const [transparent, setTransparent] = useState(false);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [printReady, setPrintReady] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const paged = useRef<Promise<PagedScore> | null>(null);
  const abort = useRef<AbortController | null>(null);

  // The pages are laid out once, when first needed, and released with the dialog.
  useEffect(
    () => () => {
      abort.current?.abort();
      void paged.current?.then(score => {
        score.close();
      });
      paged.current = null;
      clearPrint();
    },
    [doc.engineId, doc.view],
  );

  const pagedScore = () => {
    paged.current ??= layoutPages(doc).then(score => {
      setPageCount(score.pageCount);
      return score;
    });
    return paged.current;
  };

  const lastPage = to ?? pageCount ?? 1;
  const print = (closeAfter: boolean) => {
    setPrintReady(false);
    if (closeAfter) {
      window.addEventListener(
        'afterprint',
        () => {
          useUi.getState().setPanelOpen('export', false);
        },
        { once: true },
      );
    }
    openPrintDialog();
  };

  const run = async (action: 'files' | 'print', closeAfter = false) => {
    const controller = new AbortController();
    abort.current?.abort();
    abort.current = controller;
    setProgress(0);
    setFailure(null);
    setPrintReady(false);
    try {
      const score = await pagedScore();
      const pages =
        choice === 'all'
          ? Array.from({ length: score.pageCount }, (_, index) => index)
          : pageRange(from, to ?? score.pageCount, score.pageCount);
      if (action === 'files') {
        const file = await exportPageFiles(
          score,
          fileBase(title(doc)),
          { format, pages, dpi, transparent },
          {
            title: scoreTitle(doc),
            author: doc.summary.artist,
            subject: doc.summary.subtitle,
            creator: s.pdfCreator,
            producer: s.pdfProducer,
            created: new Date(),
          },
          setProgress,
          controller.signal,
        );
        download(file.bytes, file.name, file.type);
      } else {
        preparePrint(await printSheets(score, pages, setProgress, controller.signal), score.paper);
        // The print dialog opens at once while the click still counts as the user's; later, a
        // button opens it.
        if (userJustActed()) print(closeAfter);
        else setPrintReady(true);
      }
    } catch (error) {
      if (!(error instanceof PagesCancelled)) setFailure(failureOf(error));
    } finally {
      if (abort.current === controller) abort.current = null;
      setProgress(null);
    }
  };

  // The Print command (⌘P, the printer button) opens this dialog to print, and closes it after.
  const onPrintRequest = useEffectEvent(() => {
    if (useUi.getState().takePrintRequest()) void run('print', true);
  });
  useEffect(() => {
    // The request that opened the dialog, then any made while it is open.
    queueMicrotask(() => {
      onPrintRequest();
    });
    return useUi.subscribe(state => {
      if (state.printRequested) onPrintRequest();
    });
  }, []);

  const formatName = s.formats[format];
  return (
    <Section id="export-pages" title={s.pages} hint={s.pagesHint}>
      <Field label={s.pageChoice} {...(pageCount === null ? {} : { hint: s.pageCount(pageCount) })}>
        <SegmentedControl
          label={s.pageChoice}
          value={choice}
          segments={PAGE_CHOICES.map(value => ({ value, label: s.pageChoices[value] }))}
          onValueChange={value => {
            setChoice(value);
            if (value === 'range') void pagedScore().catch(() => undefined);
          }}
        />
      </Field>
      {choice === 'range' &&
        (pageCount === null ? (
          <p className="text-[12px] text-ink-muted">{s.countingPages}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <NumberField label={s.fromPage} value={from} min={1} max={pageCount} onCommit={setFrom} />
            <NumberField label={s.toPage} value={lastPage} min={1} max={pageCount} onCommit={setTo} />
          </div>
        ))}
      <Field label={s.format} hint={s.formatHints[format]}>
        <SegmentedControl
          label={s.format}
          value={format}
          segments={PAGE_FORMATS.map(value => ({ value, label: s.formats[value] }))}
          onValueChange={setFormat}
        />
      </Field>
      {format === 'png' && (
        <Field label={s.resolution} hint={s.resolutionHints[dpi]}>
          <SegmentedControl
            label={s.resolution}
            value={String(dpi)}
            segments={PNG_RESOLUTIONS.map(value => ({ value: String(value), label: s.dpi(value) }))}
            onValueChange={value => {
              const chosen = PNG_RESOLUTIONS.find(resolution => String(resolution) === value);
              if (chosen !== undefined) setDpi(chosen);
            }}
          />
        </Field>
      )}
      {format !== 'pdf' && (
        <Switch label={s.transparent} checked={transparent} onCheckedChange={setTransparent} />
      )}
      {failure !== null && (
        <p role="alert" className="text-[13px] text-danger">
          {failure}
        </p>
      )}
      {progress === null ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              icon={<Download size={16} aria-hidden />}
              onClick={() => {
                void run('files');
              }}
            >
              {s.exportPages(formatName)}
            </Button>
            <Button
              icon={<Printer size={16} aria-hidden />}
              onClick={() => {
                void run('print');
              }}
            >
              {s.print}
            </Button>
          </div>
          {printReady && (
            <div className="flex items-center gap-3">
              <span className="text-[12px] text-ink-muted">{s.printReady}</span>
              <Button
                variant="primary"
                onClick={() => {
                  print(false);
                }}
              >
                {s.printNow}
              </Button>
            </div>
          )}
          {format !== 'pdf' && (pageCount ?? 2) > 1 && (choice === 'all' || from !== lastPage) && (
            <p className="text-[12px] text-ink-faint">{s.severalFiles}</p>
          )}
        </div>
      ) : (
        <Progress
          fraction={progress}
          label={s.preparingLabel}
          text={s.preparing(Math.round(progress * 100))}
          onCancel={() => {
            abort.current?.abort();
          }}
        />
      )}
    </Section>
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
        <Progress
          fraction={progress}
          label={s.progress}
          text={s.rendering(Math.round(progress * 100))}
          onCancel={() => {
            abort.current?.abort();
          }}
        />
      )}
    </Section>
  );
}

/** Saves the active score as files for other programs (its pages, MIDI, audio) or prints it. */
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
          <PagesExport doc={doc} />
          <div className="border-t border-line" />
          <MidiExport doc={doc} />
          <div className="border-t border-line" />
          <AudioExport doc={doc} />
        </div>
      )}
    </Dialog>
  );
}
