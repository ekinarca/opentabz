import { Dialog, SegmentedControl } from '@opentabz/ui';
import { useId } from 'react';
import {
  MARGIN_MM,
  ORIENTATIONS,
  PAPER_IDS,
  PAPER_SIDE_MM,
  paperMillimetres,
  type Margins,
  type PageSetup,
} from '../score-view/pagination.ts';
import { useDocuments, type OpenDocument } from '../state/documents.ts';
import { usePreferences } from '../state/preferences.ts';
import { strings } from '../strings.ts';
import { Field, NumberField, SELECT_CLASS } from './MetronomeSettingsForm.tsx';

const s = strings.pageSetup;
const SIDES = ['top', 'right', 'bottom', 'left'] as const;

/** Sets a document's page up and keeps it for new scores (REND-012, REND-221, REND-222). */
export function usePageSetup(doc: OpenDocument): (patch: Partial<PageSetup>) => void {
  const updateView = useDocuments(state => state.updateView);
  const setPreferences = usePreferences(state => state.set);
  return patch => {
    const page = { ...doc.view.page, ...patch };
    updateView(doc.key, { page });
    setPreferences({ page });
  };
}

/**
 * The paper (twelve formats, or a size of one's own), which way up, and the margins around the
 * music, applied as they are typed.
 */
export function PageSetupDialog({
  doc,
  open,
  onOpenChange,
}: {
  readonly doc: OpenDocument;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}) {
  const setPage = usePageSetup(doc);
  const paperId = useId();
  const { page } = doc.view;
  const size = paperMillimetres(page);
  const rounded = { width: Math.round(size.width), height: Math.round(size.height) };
  const setMargin = (side: (typeof SIDES)[number], value: number) => {
    const margins: Margins = { ...page.margins, [side]: value };
    setPage({ margins });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={s.title}
      description={s.description}
      closeLabel={s.close}
      width="md"
    >
      <div className="flex flex-col gap-4">
        <Field label={s.paper} htmlFor={paperId}>
          <select
            id={paperId}
            value={page.paper}
            onChange={event => {
              const paper = PAPER_IDS.find(candidate => candidate === event.target.value);
              if (paper === undefined) return;
              // A paper of one's own starts from the size shown.
              setPage(paper === 'custom' ? { paper, custom: rounded } : { paper });
            }}
            className={`${SELECT_CLASS} w-full`}
          >
            {PAPER_IDS.map(paper => (
              <option key={paper} value={paper}>
                {paper === 'custom'
                  ? strings.papers.custom
                  : `${strings.papers[paper]} · ${s.size(
                      Math.round(paperMillimetres({ ...page, paper }).width),
                      Math.round(paperMillimetres({ ...page, paper }).height),
                    )}`}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          {/* Typing a size makes it a paper of one's own. */}
          <NumberField
            label={s.width}
            unit={s.millimetres}
            value={rounded.width}
            min={PAPER_SIDE_MM.min}
            max={PAPER_SIDE_MM.max}
            onCommit={width => {
              setPage({ paper: 'custom', custom: { ...rounded, width } });
            }}
          />
          <NumberField
            label={s.height}
            unit={s.millimetres}
            value={rounded.height}
            min={PAPER_SIDE_MM.min}
            max={PAPER_SIDE_MM.max}
            onCommit={height => {
              setPage({ paper: 'custom', custom: { ...rounded, height } });
            }}
          />
        </div>
        <Field label={s.orientation}>
          <SegmentedControl
            label={s.orientation}
            value={page.orientation}
            segments={ORIENTATIONS.map(value => ({ value, label: strings.orientations[value] }))}
            onValueChange={orientation => {
              setPage({ orientation });
            }}
          />
        </Field>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[13px] font-semibold text-ink">{s.margins}</legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SIDES.map(side => (
              <NumberField
                key={side}
                label={s[side]}
                unit={s.millimetres}
                value={page.margins[side]}
                min={MARGIN_MM.min}
                max={MARGIN_MM.max}
                onCommit={value => {
                  setMargin(side, value);
                }}
              />
            ))}
          </div>
        </fieldset>
      </div>
    </Dialog>
  );
}
