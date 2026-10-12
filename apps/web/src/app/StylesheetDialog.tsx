import {
  BRACKET_MODES,
  CHORD_SPELLINGS,
  FINGERING_PLACES,
  LEFT_FINGER_LABELS,
  LYRICS_PLACES,
  RIGHT_FINGER_LABELS,
  STYLE_FINGERING_SIZE,
  TAB_FINGERING_PLACES,
  sameScoreStyle,
  STYLE_DIAGRAM_SIZE,
  STYLE_DIAGRAM_SPACING,
  STYLE_SCALE,
  STYLE_INDENT_MM,
  STYLE_CODA_GAP_MM,
  STYLE_LINE_THICKNESS,
  STYLE_SPACING,
  STYLE_SYSTEM_SPACING,
  TEXT_ORIENTATIONS,
  TRACK_NAME_PLACES,
  TRACK_NAME_TEXTS,
  TAB_RHYTHM_PLACES,
  TAB_RHYTHMS,
  TUNING_DETAILS,
  TUNING_LAYOUTS,
  TUNING_PLACES,
  type ScoreStyle,
} from '@opentabz/core/shared';
import { Button, Dialog, SegmentedControl, Slider, Switch } from '@opentabz/ui';
import { useId, type ReactNode } from 'react';
import { useDocuments, type OpenDocument } from '../state/documents.ts';
import { useUi } from '../state/ui.ts';
import { strings } from '../strings.ts';
import { HeaderFooterSection } from './HeaderFooterSection.tsx';
import { TechniqueLabelsSection } from './TechniqueLabelsSection.tsx';
import { MusicFontField } from './MusicFontField.tsx';
import { StylesheetChoices } from './StylesheetChoices.tsx';
import { TextFontsSection } from './TextFontsSection.tsx';
import { Field, SELECT_CLASS } from './MetronomeSettingsForm.tsx';

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
        <Section title={s.sections.choices} wide>
          <StylesheetChoices
            style={style}
            fileStyle={doc.summary.style}
            onApply={next => {
              updateView(doc.key, { style: next });
            }}
          />
        </Section>

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
          <Field label={s.lineThickness} value={s.lineThicknessValue(style.staffLineThickness)}>
            <Slider
              label={s.lineThickness}
              valueText={s.lineThicknessValue(style.staffLineThickness)}
              value={style.staffLineThickness}
              min={STYLE_LINE_THICKNESS.min}
              max={STYLE_LINE_THICKNESS.max}
              step={0.1}
              onValueChange={staffLineThickness => {
                set({ staffLineThickness: Math.round(staffLineThickness * 10) / 10 });
              }}
            />
          </Field>
          <Field label={s.systemSpacing} value={s.systemSpacingValue(style.systemSpacing)}>
            <Slider
              label={s.systemSpacing}
              valueText={s.systemSpacingValue(style.systemSpacing)}
              value={style.systemSpacing}
              min={STYLE_SYSTEM_SPACING.min}
              max={STYLE_SYSTEM_SPACING.max}
              step={0.1}
              onValueChange={systemSpacing => {
                set({ systemSpacing: Math.round(systemSpacing * 10) / 10 });
              }}
            />
          </Field>
          <Field label={s.firstSystemIndent} value={s.firstSystemIndentValue(style.firstSystemIndent)}>
            <Slider
              label={s.firstSystemIndent}
              valueText={s.firstSystemIndentValue(style.firstSystemIndent)}
              value={style.firstSystemIndent}
              min={STYLE_INDENT_MM.min}
              max={STYLE_INDENT_MM.max}
              step={1}
              onValueChange={firstSystemIndent => {
                set({ firstSystemIndent: Math.round(firstSystemIndent) });
              }}
            />
          </Field>
          <Switch
            label={s.detachedCoda}
            checked={style.detachedCoda}
            onCheckedChange={detachedCoda => {
              set({ detachedCoda });
            }}
          />
          <Field label={s.codaGap} value={s.codaGapValue(style.codaGap)}>
            <Slider
              label={s.codaGap}
              valueText={s.codaGapValue(style.codaGap)}
              value={style.codaGap}
              min={STYLE_CODA_GAP_MM.min}
              max={STYLE_CODA_GAP_MM.max}
              step={1}
              disabled={!style.detachedCoda}
              onValueChange={codaGap => {
                set({ codaGap: Math.round(codaGap) });
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
            label={s.clefOnEverySystem}
            checked={style.clefOnEverySystem}
            onCheckedChange={clefOnEverySystem => {
              set({ clefOnEverySystem });
            }}
          />
          <Switch
            label={s.timeSignatureOnEverySystem}
            checked={style.timeSignatureOnEverySystem}
            onCheckedChange={timeSignatureOnEverySystem => {
              set({ timeSignatureOnEverySystem });
            }}
          />
          <Switch
            label={s.timeSignatureAtSections}
            checked={style.timeSignatureAtSections}
            onCheckedChange={timeSignatureAtSections => {
              set({ timeSignatureAtSections });
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
          <MusicFontField
            value={style.musicFont}
            onChange={musicFont => {
              set({ musicFont });
            }}
          />
          <Switch
            label={s.dynamics}
            checked={!style.hideDynamics}
            onCheckedChange={shown => {
              set({ hideDynamics: !shown });
            }}
          />
          <Switch
            label={s.commonTime}
            checked={style.commonTime}
            onCheckedChange={commonTime => {
              set({ commonTime });
            }}
          />
          <Switch
            label={s.bentPitch}
            checked={style.bentPitch}
            onCheckedChange={bentPitch => {
              set({ bentPitch });
            }}
          />
          <Switch
            label={s.extraRests}
            checked={!style.hideExtraRests}
            onCheckedChange={shown => {
              set({ hideExtraRests: !shown });
            }}
          />
          <Switch
            label={s.tupletBrackets}
            checked={style.tupletBrackets}
            onCheckedChange={tupletBrackets => {
              set({ tupletBrackets });
            }}
          />
          <Switch
            label={s.arpeggioArrows}
            checked={style.arpeggioArrows}
            onCheckedChange={arpeggioArrows => {
              set({ arpeggioArrows });
            }}
          />
          <Switch
            label={s.trillNote}
            checked={style.trillNote}
            onCheckedChange={trillNote => {
              set({ trillNote });
            }}
          />
          <Switch
            label={s.slideLabel}
            checked={style.slideLabel}
            onCheckedChange={slideLabel => {
              set({ slideLabel });
            }}
          />
          <Switch
            label={s.hopoLetters}
            checked={style.hopoLetters}
            onCheckedChange={hopoLetters => {
              set({ hopoLetters });
            }}
          />
          <Switch
            label={s.tabSlursOnOuterNotes}
            hint={s.tabSlursOnOuterNotesHint}
            checked={style.tabSlursOnOuterNotes}
            onCheckedChange={tabSlursOnOuterNotes => {
              set({ tabSlursOnOuterNotes });
            }}
          />
          <Switch
            label={s.linesOverRests}
            hint={s.linesOverRestsHint}
            checked={style.linesOverRests}
            onCheckedChange={linesOverRests => {
              set({ linesOverRests });
            }}
          />
          <Switch
            label={s.flatBeams}
            checked={style.flatBeams}
            onCheckedChange={flatBeams => {
              set({ flatBeams });
            }}
          />
          <Switch
            label={s.flatDrumBeams}
            checked={style.flatDrumBeams}
            onCheckedChange={flatDrumBeams => {
              set({ flatDrumBeams });
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
            label={s.tempoDecimals}
            checked={style.tempoDecimals}
            disabled={!style.tempoMarks}
            onCheckedChange={tempoDecimals => {
              set({ tempoDecimals });
            }}
          />
          <Switch
            label={s.lyrics}
            checked={style.lyrics}
            onCheckedChange={lyrics => {
              set({ lyrics });
            }}
          />
          {style.lyrics && (
            <Field label={s.lyricsPlace}>
              <SegmentedControl
                label={s.lyricsPlace}
                value={style.lyricsPlace}
                segments={LYRICS_PLACES.map(value => ({ value, label: s.lyricsPlaces[value] }))}
                onValueChange={lyricsPlace => {
                  set({ lyricsPlace });
                }}
              />
            </Field>
          )}
          <Switch
            label={s.tuning}
            checked={style.tuning}
            onCheckedChange={tuning => {
              set({ tuning });
            }}
          />
          {style.tuning && <TuningFields style={style} set={set} />}
          <Switch
            label={s.capoAndTuningInNotation}
            hint={s.capoAndTuningInNotationHint}
            checked={style.capoAndTuningInNotation}
            onCheckedChange={capoAndTuningInNotation => {
              set({ capoAndTuningInNotation });
            }}
          />
          <Switch
            label={s.chordDiagramsOnTop}
            checked={style.chordDiagramsOnTop}
            onCheckedChange={chordDiagramsOnTop => {
              set({ chordDiagramsOnTop });
            }}
          />
          {style.chordDiagramsOnTop && (
            <>
              <FactorField
                label={s.diagramsOnTopSize}
                value={style.chordDiagramsOnTopSize}
                range={STYLE_DIAGRAM_SIZE}
                onChange={chordDiagramsOnTopSize => {
                  set({ chordDiagramsOnTopSize });
                }}
              />
              <FactorField
                label={s.diagramsOnTopSpacing}
                value={style.chordDiagramsOnTopSpacing}
                range={STYLE_DIAGRAM_SPACING}
                onChange={chordDiagramsOnTopSpacing => {
                  set({ chordDiagramsOnTopSpacing });
                }}
              />
            </>
          )}
          <Switch
            label={s.chordDiagramsInScore}
            checked={style.chordDiagramsInScore}
            onCheckedChange={chordDiagramsInScore => {
              set({ chordDiagramsInScore });
            }}
          />
          {style.chordDiagramsInScore && (
            <>
              <FactorField
                label={s.diagramsInScoreSize}
                value={style.chordDiagramsInScoreSize}
                range={STYLE_DIAGRAM_SIZE}
                onChange={chordDiagramsInScoreSize => {
                  set({ chordDiagramsInScoreSize });
                }}
              />
              <FactorField
                label={s.diagramsInScoreSpacing}
                hint={s.diagramsInScoreSpacingHint}
                value={style.chordDiagramsInScoreSpacing}
                range={STYLE_DIAGRAM_SPACING}
                onChange={chordDiagramsInScoreSpacing => {
                  set({ chordDiagramsInScoreSpacing });
                }}
              />
            </>
          )}
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

        <Section title={s.sections.tablature}>
          <Switch
            label={s.tiedTabNotes}
            hint={s.tiedTabNotesHint}
            checked={style.tiedTabNotes}
            onCheckedChange={tiedTabNotes => {
              set({ tiedTabNotes });
            }}
          />
          <TabRhythmFields style={style} set={set} />
          <Switch
            label={s.slashStaffLines}
            checked={style.slashStaffLines}
            onCheckedChange={slashStaffLines => {
              set({ slashStaffLines });
            }}
          />
          <Switch
            label={s.slashBarLines}
            checked={style.slashBarLines}
            onCheckedChange={slashBarLines => {
              set({ slashBarLines });
            }}
          />
          <Switch
            label={s.slashSingleNoteFrets}
            checked={style.slashSingleNoteFrets}
            onCheckedChange={slashSingleNoteFrets => {
              set({ slashSingleNoteFrets });
            }}
          />
          <Switch
            label={s.harmonicTouch}
            hint={s.harmonicTouchHint}
            checked={style.harmonicTouch}
            onCheckedChange={harmonicTouch => {
              set({ harmonicTouch });
            }}
          />
          <Switch
            label={s.octaveHarmonicDot}
            hint={s.octaveHarmonicDotHint}
            checked={style.octaveHarmonicDot}
            onCheckedChange={octaveHarmonicDot => {
              set({ octaveHarmonicDot });
            }}
          />
          <Switch
            label={s.dashQuarterRests}
            checked={style.dashQuarterRests}
            onCheckedChange={dashQuarterRests => {
              set({ dashQuarterRests });
            }}
          />
          <Switch
            label={s.voiceColors}
            hint={s.voiceColorsHint}
            checked={style.voiceColors}
            onCheckedChange={voiceColors => {
              set({ voiceColors });
            }}
          />
        </Section>

        <Section title={s.sections.headerFooter} wide>
          <HeaderFooterSection style={style} set={set} />
        </Section>

        <Section title={s.sections.text} wide>
          <TextFontsSection style={style} set={set} />
        </Section>

        <Section title={s.sections.fingering}>
          <FingeringFields style={style} set={set} />
        </Section>

        <Section title={s.sections.techniqueLabels} wide>
          <TechniqueLabelsSection style={style} set={set} />
        </Section>
      </div>
    </Dialog>
  );
}

/** A factor set in tenths with a slider, such as the size of the chord diagrams (REND-227). */
function FactorField({
  label,
  hint,
  value,
  range,
  onChange,
}: {
  readonly label: string;
  readonly hint?: string;
  readonly value: number;
  readonly range: { readonly min: number; readonly max: number };
  readonly onChange: (value: number) => void;
}) {
  return (
    <Field label={label} value={s.diagramFactorValue(value)} {...(hint === undefined ? {} : { hint })}>
      <Slider
        label={label}
        valueText={s.diagramFactorValue(value)}
        value={value}
        min={range.min}
        max={range.max}
        step={0.1}
        onValueChange={next => {
          onChange(Math.round(next * 10) / 10);
        }}
      />
    </Field>
  );
}

/**
 * How the tuning is written (REND-225): above the music or before each track's tablature; the
 * legend above the music saying as much as asked, its strings in columns or on a line, framed.
 */
function TuningFields({
  style,
  set,
}: {
  readonly style: ScoreStyle;
  readonly set: (patch: Partial<ScoreStyle>) => void;
}) {
  const detailId = useId();
  return (
    <>
      <Field label={s.tuningPlace}>
        <SegmentedControl
          label={s.tuningPlace}
          value={style.tuningPlace}
          segments={TUNING_PLACES.map(value => ({ value, label: s.tuningPlaces[value] }))}
          onValueChange={tuningPlace => {
            set({ tuningPlace });
          }}
        />
      </Field>
      {style.tuningPlace === 'top' && (
        <>
          <Field label={s.tuningDetail} htmlFor={detailId}>
            <select
              id={detailId}
              value={style.tuningDetail}
              onChange={event => {
                const tuningDetail = TUNING_DETAILS.find(value => value === event.target.value);
                if (tuningDetail !== undefined) set({ tuningDetail });
              }}
              className={SELECT_CLASS}
            >
              {TUNING_DETAILS.map(value => (
                <option key={value} value={value}>
                  {s.tuningDetails[value]}
                </option>
              ))}
            </select>
          </Field>
          <Field label={s.tuningLayout}>
            <SegmentedControl
              label={s.tuningLayout}
              value={style.tuningLayout}
              segments={TUNING_LAYOUTS.map(value => ({ value, label: s.tuningLayouts[value] }))}
              onValueChange={tuningLayout => {
                set({ tuningLayout });
              }}
            />
          </Field>
          <Switch
            label={s.tuningFrame}
            checked={style.tuningFrame}
            onCheckedChange={tuningFrame => {
              set({ tuningFrame });
            }}
          />
        </>
      )}
    </>
  );
}

/**
 * The rhythm in the tablature (REND-244): without a staff above it, always or never; its stems
 * from the frets or outside; each voice's rhythm below, above or nowhere.
 */
function TabRhythmFields({
  style,
  set,
}: {
  readonly style: ScoreStyle;
  readonly set: (patch: Partial<ScoreStyle>) => void;
}) {
  const id = useId();
  return (
    <>
      <Field label={s.tabRhythm}>
        <SegmentedControl
          label={s.tabRhythm}
          value={style.tabRhythm}
          segments={TAB_RHYTHMS.map(value => ({ value, label: s.tabRhythms[value] }))}
          onValueChange={tabRhythm => {
            set({ tabRhythm });
          }}
        />
      </Field>
      {style.tabRhythm !== 'never' && (
        <>
          <Switch
            label={s.tabStemsInside}
            hint={s.tabStemsInsideHint}
            checked={style.tabStemsInside}
            onCheckedChange={tabStemsInside => {
              set({ tabStemsInside });
            }}
          />
          <Switch
            label={s.tabBeamsOverRests}
            hint={s.tabBeamsOverRestsHint}
            checked={style.tabBeamsOverRests}
            onCheckedChange={tabBeamsOverRests => {
              set({ tabBeamsOverRests });
            }}
          />
          <Switch
            label={s.tabCircleLongNotes}
            checked={style.tabCircleLongNotes}
            onCheckedChange={tabCircleLongNotes => {
              set({ tabCircleLongNotes });
            }}
          />
          <Field label={s.tabRhythmVoices}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {style.tabRhythmVoices.map((place, voice) => (
                <label
                  key={voice}
                  className="flex flex-col gap-1 text-[12px] text-ink-muted"
                  htmlFor={`${id}-${voice}`}
                >
                  {s.tabRhythmVoice(voice + 1)}
                  <select
                    id={`${id}-${voice}`}
                    value={place}
                    onChange={event => {
                      const chosen = TAB_RHYTHM_PLACES.find(value => value === event.target.value);
                      if (chosen === undefined) return;
                      set({
                        tabRhythmVoices: style.tabRhythmVoices.map((other, index) =>
                          index === voice ? chosen : other,
                        ),
                      });
                    }}
                    className={SELECT_CLASS}
                  >
                    {TAB_RHYTHM_PLACES.map(value => (
                      <option key={value} value={value}>
                        {s.tabRhythmPlaces[value]}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </Field>
        </>
      )}
    </>
  );
}

/**
 * Fingering (REND-252): the left and right hands' labels, where it goes on the staff and in the
 * tablature, and its size.
 */
function FingeringFields({
  style,
  set,
}: {
  readonly style: ScoreStyle;
  readonly set: (patch: Partial<ScoreStyle>) => void;
}) {
  return (
    <>
      <Field label={s.leftHandFingerLabels}>
        <SegmentedControl
          label={s.leftHandFingerLabels}
          value={style.leftHandFingerLabels}
          segments={LEFT_FINGER_LABELS.map(value => ({ value, label: s.leftHandFingerLabelSets[value] }))}
          onValueChange={leftHandFingerLabels => {
            set({ leftHandFingerLabels });
          }}
        />
      </Field>
      <Field label={s.rightHandFingerLabels}>
        <SegmentedControl
          label={s.rightHandFingerLabels}
          value={style.rightHandFingerLabels}
          segments={RIGHT_FINGER_LABELS.map(value => ({ value, label: s.rightHandFingerLabelSets[value] }))}
          onValueChange={rightHandFingerLabels => {
            set({ rightHandFingerLabels });
          }}
        />
      </Field>
      <Field label={s.fingeringPosition}>
        <SegmentedControl
          label={s.fingeringPosition}
          value={style.fingeringPosition}
          segments={FINGERING_PLACES.map(value => ({ value, label: s.fingeringPositions[value] }))}
          onValueChange={fingeringPosition => {
            set({ fingeringPosition });
          }}
        />
      </Field>
      <Field label={s.tabFingeringPosition}>
        <SegmentedControl
          label={s.tabFingeringPosition}
          value={style.tabFingeringPosition}
          segments={TAB_FINGERING_PLACES.map(value => ({ value, label: s.tabFingeringPositions[value] }))}
          onValueChange={tabFingeringPosition => {
            set({ tabFingeringPosition });
          }}
        />
      </Field>
      <FactorField
        label={s.fingeringSize}
        value={style.fingeringSize}
        range={STYLE_FINGERING_SIZE}
        onChange={fingeringSize => {
          set({ fingeringSize });
        }}
      />
    </>
  );
}
