import { useDocuments } from '../state/documents.ts';
import { strings } from '../strings.ts';
import { DEMOS, demoSource } from './demos.ts';
import { pickFiles } from './open-actions.ts';
import { modKey } from './platform.ts';

/** String gauges, high E to low E, in CSS pixels. */
const GAUGES = [1, 1.25, 1.6, 2.1, 2.7, 3.4];

/**
 * Six strings across the whole page, passing behind the headline. They draw themselves in on
 * load and vibrate in the accent colour while a file is dragged over the window.
 */
function Strings({ active }: { readonly active: boolean }) {
  return (
    <div
      aria-hidden
      className="ot-strings pointer-events-none absolute top-1/2 left-1/2 flex w-screen -translate-x-1/2 -translate-y-1/2 flex-col justify-between"
      data-active={active ? 'true' : undefined}
    >
      {GAUGES.map((gauge, index) => (
        <span
          key={gauge}
          className="ot-string"
          style={{
            height: `${gauge}px`,
            animationDelay: `${index * 70}ms`,
            ['--ot-string-speed' as string]: `${120 + index * 26}ms`,
          }}
        />
      ))}
    </div>
  );
}

export function Home({
  dragging,
  onOpenUrl,
}: {
  readonly dragging: boolean;
  readonly onOpenUrl: () => void;
}) {
  const open = useDocuments(state => state.open);
  const pending = useDocuments(state => state.pending.length > 0);

  return (
    <main id="main" className="ot-home relative flex flex-1 flex-col overflow-hidden">
      <div aria-hidden className="ot-home-glow pointer-events-none absolute inset-0" />

      <section
        aria-labelledby="home-title"
        className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center"
      >
        <div className="relative">
          <Strings active={dragging} />
          <h1
            id="home-title"
            className="ot-home-title relative font-display text-[clamp(64px,13vw,184px)] leading-[0.86] tracking-[-0.03em] text-ink"
          >
            {dragging ? strings.home.release : strings.home.headline}
          </h1>
        </div>
        <p className="mt-[clamp(28px,5vh,56px)] max-w-[34ch] text-[clamp(15px,1.4vw,18px)] leading-relaxed text-ink-muted">
          {strings.home.lede}
        </p>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
          <button
            type="button"
            onClick={pickFiles}
            disabled={pending}
            className="ot-home-cta group inline-flex h-14 items-center gap-3 rounded-full bg-ink pr-6 pl-7 text-[16px] font-medium text-canvas transition-transform duration-200 hover:scale-[1.02] active:scale-[0.99] disabled:opacity-60"
          >
            {strings.home.openFile}
            <kbd className="rounded-full bg-canvas/15 px-2.5 py-1 font-sans text-[12px] font-medium text-canvas/80">
              {modKey()} O
            </kbd>
          </button>
          <button
            type="button"
            onClick={onOpenUrl}
            className="h-14 rounded-full px-5 text-[15px] font-medium text-ink-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
          >
            {strings.home.openUrl}
          </button>
        </div>
        <p className="mt-10 text-[13px] text-ink-faint">
          <span>{strings.home.demosHeading}</span>{' '}
          {DEMOS.map((demo, index) => (
            <span key={demo.id}>
              {index > 0 && <span aria-hidden> · </span>}
              <button
                type="button"
                onClick={() => {
                  void open([demoSource(demo)]);
                }}
                className="font-medium text-ink-muted underline decoration-line-strong underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
              >
                {strings.demos[demo.id].title}
              </button>
            </span>
          ))}
        </p>
      </section>

      <footer className="relative z-10 px-6 pb-5 text-center text-[11.5px] leading-relaxed text-ink-faint">
        <p>{strings.home.privacy}</p>
        <p>{strings.footer.trademark}</p>
      </footer>
    </main>
  );
}
