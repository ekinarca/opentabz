import {
  BRACKET_MODES,
  CHORD_SPELLINGS,
  sameScoreStyle,
  STYLE_SCALE,
  STYLE_SPACING,
  TEXT_ORIENTATIONS,
  TRACK_NAME_PLACES,
  TRACK_NAME_TEXTS,
  type ScoreStyle,
} from '@opentabz/core/shared';
import { Button, Dialog, SegmentedControl, Slider, Switch } from '@opentabz/ui';
import type { ReactNode } from 'react';
import { useDocuments, type OpenDocument } from '../state/documents.ts';
import { useUi } from '../state/ui.ts';
import { strings } from '../strings.ts';
import { HeaderFooterSection } from './HeaderFooterSection.tsx';
import { TextFontsSection } from './TextFontsSection.tsx';
import { Field } from './MetronomeSettingsForm.tsx';

const s = strings.stylesheet;

function Section({
  title,
  children,
  wide = false,
}: {
  readonly title: string;
  readonly children: ReactNode;
  readonly wide?: boolean;
}) {
  return (
    <section aria-label={title} className={`flex flex-col gap-3 ${wide ? 'md:col-span-2' : ''}`}>
      <h3 className="text-[12px] font-semibold tracking-[0.06em] text-ink-faint uppercase">{title}</h3>
      {children}
    </section>
  );
}

/**
 * Guitar Pro's stylesheet for one score (REND-218): its size and rhythmic spacing, brackets,
 * barlines and separators, track names, dynamics, the tuning legend and chord diagrams. It starts
 * as the file asks (REND-219), applies as it is changed, and is remembered for the file.
 */
export function StylesheetDialog({ doc }: { readonly doc: OpenDocument }) {
  const open = useUi(state => state.panel === 'stylesheet');
  const setPanelOpen = useUi(state => state.setPanelOpen);
  const updateView = useDocuments(state => state.updateView);
  const { style } = doc.view;
  const set = (patch: Partial<ScoreStyle>) => {
    updateView(doc.key, { style: { ...style, ...patch } });
  };
  const asInFile = sameScoreStyle(style, doc.summary.style);

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        setPanelOpen('stylesheet', next);
      }}
      title={s.title}
      description={s.description}
      closeLabel={s.close}
      width="lg"
      footer={
        <Button
          variant="secondary"
          disabled={asInFile}
          onClick={() => {
            updateView(doc.key, { style: doc.summary.style });
          }}
        >
          {s.reset}
        </Button>
      }
    >
      <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
        <Section title={s.sections.page}>
          <Field label={s.scale} value={s.scaleValue(style.scale)}>
            <Slider
              label={s.scale}
              valueText={s.scaleValue(style.scale)}
              value={style.scale}
              min={STYLE_SCALE.min}
              max={STYLE_SCALE.max}
              step={0.05}
              onValueChange={scale => {
                set({ scale: Math.round(scale * 100) / 100 });
              }}
            />
          </Field>
          <Switch
            label={s.keepTextSize}
            hint={s.keepTextSizeHint}
            checked={style.keepTextSize}
            onCheckedChange={keepTextSize => {
              set({ keepTextSize });
            }}
          />
          <Field label={s.spacing} value={s.spacingValue(style.spacing)} hint={s.spacingHint}>
            <Slider
              label={s.spacing}
              valueText={s.spacingValue(style.spacing)}
              value={style.spacing}
              min={STYLE_SPACING.min}
              max={STYLE_SPACING.max}
              step={0.1}
              onValueChange={spacing => {
                set({ spacing: Math.round(spacing * 10) / 10 });
              }}
            />
          </Field>
        </Section>

        <Section title={s.sections.systems}>
          <Field label={s.brackets}>
            <SegmentedControl
              label={s.brackets}
              value={style.brackets}
              segments={BRACKET_MODES.map(value => ({ value, label: s.bracketModes[value] }))}
              onValueChange={brackets => {
                set({ brackets });
              }}
            />
          </Field>
          <Switch
            label={s.singleStaffBrackets}
            checked={style.singleStaffBrackets}
            onCheckedChange={singleStaffBrackets => {
              set({ singleStaffBrackets });
            }}
          />
          <Switch
            label={s.extendBarLines}
            checked={style.extendBarLines}
            onCheckedChange={extendBarLines => {
              set({ extendBarLines });
            }}
          />
          <Switch
            label={s.systemSeparator}
            checked={style.systemSeparator}
            onCheckedChange={systemSeparator => {
              set({ systemSeparator });
            }}
          />
          <Switch
            label={s.multiBarRests}
            checked={style.multiBarRests}
            onCheckedChange={multiBarRests => {
              set({ multiBarRests });
            }}
          />
          <Switch
            label={s.hideEmptyStaves}
            checked={style.hideEmptyStaves}
            onCheckedChange={hideEmptyStaves => {
              set({ hideEmptyStaves });
            }}
          />
          {style.hideEmptyStaves && (
            <Switch
              className="pl-4"
              label={s.hideEmptyStavesInFirstSystem}
              checked={style.hideEmptyStavesInFirstSystem}
              onCheckedChange={hideEmptyStavesInFirstSystem => {
                set({ hideEmptyStavesInFirstSystem });
              }}
            />
          )}
        </Section>

        <Section title={s.sections.names}>
          <Field label={s.oneTrack}>
            <SegmentedControl
              label={s.oneTrack}
              value={style.singleTrackNames}
              segments={TRACK_NAME_PLACES.map(value => ({ value, label: s.places[value] }))}
              onValueChange={singleTrackNames => {
                set({ singleTrackNames });
              }}
            />
          </Field>
          <Field label={s.severalTracks}>
            <SegmentedControl
              label={s.severalTracks}
              value={style.multiTrackNames}
              segments={TRACK_NAME_PLACES.map(value => ({ value, label: s.places[value] }))}
              onValueChange={multiTrackNames => {
                set({ multiTrackNames });
              }}
            />
          </Field>
          <Field label={s.firstSystem}>
            <div className="flex flex-wrap gap-2">
              <SegmentedControl
                label={`${s.firstSystem}: ${s.texts.full} / ${s.texts.short}`}
                value={style.firstSystemNames}
                segments={TRACK_NAME_TEXTS.map(value => ({ value, label: s.texts[value] }))}
                onValueChange={firstSystemNames => {
                  set({ firstSystemNames });
                }}
              />
              <SegmentedControl
                label={`${s.firstSystem}: ${s.orientations.horizontal} / ${s.orientations.vertical}`}
                value={style.firstSystemNamesOrientation}
                segments={TEXT_ORIENTATIONS.map(value => ({ value, label: s.orientations[value] }))}
                onValueChange={firstSystemNamesOrientation => {
                  set({ firstSystemNamesOrientation });
                }}
              />
            </div>
          </Field>
          <Field label={s.otherSystems}>
            <div className="flex flex-wrap gap-2">
              <SegmentedControl
                label={`${s.otherSystems}: ${s.texts.full} / ${s.texts.short}`}
                value={style.otherSystemNames}
                segments={TRACK_NAME_TEXTS.map(value => ({ value, label: s.texts[value] }))}
                onValueChange={otherSystemNames => {
                  set({ otherSystemNames });
                }}
              />
              <SegmentedControl
                label={`${s.otherSystems}: ${s.orientations.horizontal} / ${s.orientations.vertical}`}
                value={style.otherSystemNamesOrientation}
                segments={TEXT_ORIENTATIONS.map(value => ({ value, label: s.orientations[value] }))}
                onValueChange={otherSystemNamesOrientation => {
                  set({ otherSystemNamesOrientation });
                }}
              />
            </div>
          </Field>
        </Section>

        <Section title={s.sections.notation}>
          <Switch
            label={s.dynamics}
            checked={!style.hideDynamics}
            onCheckedChange={shown => {
              set({ hideDynamics: !shown });
            }}
          />
          <Switch
            label={s.tempoMarks}
            checked={style.tempoMarks}
            onCheckedChange={tempoMarks => {
              set({ tempoMarks });
            }}
          />
          <Switch
            label={s.lyrics}
            checked={style.lyrics}
            onCheckedChange={lyrics => {
              set({ lyrics });
            }}
          />
          <Switch
            label={s.tuning}
            checked={style.tuning}
            onCheckedChange={tuning => {
              set({ tuning });
            }}
          />
          <Switch
            label={s.chordDiagramsOnTop}
            checked={style.chordDiagramsOnTop}
            onCheckedChange={chordDiagramsOnTop => {
              set({ chordDiagramsOnTop });
            }}
          />
          <Switch
            label={s.chordDiagramsInScore}
            checked={style.chordDiagramsInScore}
            onCheckedChange={chordDiagramsInScore => {
              set({ chordDiagramsInScore });
            }}
          />
          <Field label={s.chordSpelling} hint={s.chordSpellingHints[style.chordSpelling]}>
            <SegmentedControl
              label={s.chordSpelling}
              value={style.chordSpelling}
              segments={CHORD_SPELLINGS.map(value => ({ value, label: s.chordSpellings[value] }))}
              onValueChange={chordSpelling => {
                set({ chordSpelling });
              }}
            />
          </Field>
        </Section>

        <Section title={s.sections.headerFooter} wide>
          <HeaderFooterSection style={style} set={set} />
        </Section>

        <Section title={s.sections.text} wide>
          <TextFontsSection style={style} set={set} />
        </Section>
      </div>
    </Dialog>
  );
}
