import {
  PAGE_LINES,
  TEXT_ALIGNS,
  TITLE_ELEMENTS,
  type PageLine,
  type ScoreStyle,
  type TextAlign,
  type TitleLine,
} from '@opentabz/core/shared';
import { SegmentedControl } from '@opentabz/ui';
import { AlignCenter, AlignLeft, AlignRight } from 'lucide-react';
import { useState } from 'react';
import { strings } from '../strings.ts';
import { SELECT_CLASS } from './MetronomeSettingsForm.tsx';

const s = strings.stylesheet.headerFooter;
const ALIGN_ICONS: Readonly<Record<TextAlign, typeof AlignLeft>> = {
  left: AlignLeft,
  center: AlignCenter,
  right: AlignRight,
};

/** A template typed in a field, taken when the field is left or Enter is pressed. */
function TemplateField({
  label,
  value,
  onCommit,
}: {
  readonly label: string;
  readonly value: string;
  readonly onCommit: (value: string) => void;
}) {
  const [text, setText] = useState<string | null>(null);
  const commit = () => {
    if (text !== null && text !== value) onCommit(text);
    setText(null);
  };
  return (
    <input
      type="text"
      aria-label={label}
      value={text ?? value}
      spellCheck={false}
      onChange={event => {
        setText(event.target.value);
      }}
      onBlur={commit}
      onKeyDown={event => {
        if (event.key === 'Enter') commit();
      }}
      className={`${SELECT_CLASS} h-8 w-full min-w-0 font-mono text-[12.5px]`}
    />
  );
}

function AlignControl({
  label,
  value,
  onChange,
}: {
  readonly label: string;
  readonly value: TextAlign;
  readonly onChange: (value: TextAlign) => void;
}) {
  return (
    <SegmentedControl
      label={label}
      value={value}
      segments={TEXT_ALIGNS.map(align => {
        const Icon = ALIGN_ICONS[align];
        return { value: align, label: s.aligns[align], icon: <Icon size={14} aria-hidden />, iconOnly: true };
      })}
      onValueChange={onChange}
    />
  );
}

/**
 * The title block's lines (shown or not, their text and alignment) and the pages' header and
 * footer, the first page's and the later ones' (REND-236, REND-237).
 */
export function HeaderFooterSection({
  style,
  set,
}: {
  readonly style: ScoreStyle;
  readonly set: (patch: Partial<ScoreStyle>) => void;
}) {
  const setTitleLine = (element: (typeof TITLE_ELEMENTS)[number], patch: Partial<TitleLine>) => {
    set({ titleBlock: { ...style.titleBlock, [element]: { ...style.titleBlock[element], ...patch } } });
  };
  const setPageLine = (line: (typeof PAGE_LINES)[number], patch: Partial<PageLine>) => {
    set({ pages: { ...style.pages, [line]: { ...style.pages[line], ...patch } } });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-[13px]">
          <caption className="mb-1 text-left text-[13px] font-medium text-ink">{s.titleBlock}</caption>
          <tbody>
            {TITLE_ELEMENTS.map(element => {
              const line = style.titleBlock[element];
              const name = s.elements[element];
              return (
                <tr key={element} className="border-b border-line/60 last:border-0">
                  <th scope="row" className="py-1.5 pr-2 text-left font-normal text-ink">
                    <label className="flex items-center gap-2 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={line.visible}
                        onChange={event => {
                          setTitleLine(element, { visible: event.target.checked });
                        }}
                        className="size-4 accent-[var(--ot-accent)]"
                      />
                      {name}
                    </label>
                  </th>
                  <td className="w-full py-1.5 pr-2">
                    <TemplateField
                      label={s.text(name)}
                      value={line.template}
                      onCommit={template => {
                        setTitleLine(element, { template });
                      }}
                    />
                  </td>
                  <td className="py-1.5">
                    <AlignControl
                      label={s.align(name)}
                      value={line.align}
                      onChange={align => {
                        setTitleLine(element, { align });
                      }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-[13px]">
          <caption className="mb-1 text-left text-[13px] font-medium text-ink">{s.pageLines}</caption>
          <tbody>
            {PAGE_LINES.map(id => {
              const line = style.pages[id];
              const name = s.lines[id];
              return (
                <tr key={id} className="border-b border-line/60 last:border-0">
                  <th scope="row" className="py-1.5 pr-2 text-left font-normal whitespace-nowrap text-ink">
                    {name}
                  </th>
                  <td className="w-full py-1.5 pr-2">
                    <TemplateField
                      label={s.text(name)}
                      value={line.template}
                      onCommit={template => {
                        setPageLine(id, { template });
                      }}
                    />
                  </td>
                  <td className="py-1.5">
                    <AlignControl
                      label={s.align(name)}
                      value={line.align}
                      onChange={align => {
                        setPageLine(id, { align });
                      }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[12px] text-ink-faint">{s.tokens}</p>
    </div>
  );
}
