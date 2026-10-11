import { cx } from '../cx.ts';

/**
 * The OpenTabz mark: six tablature strings with an open-string "0" sitting on them.
 * Decorative by default; pass `title` to make it an image with an accessible name.
 */
export function LogoMark({
  size = 28,
  title,
  className,
}: {
  readonly size?: number;
  readonly title?: string;
  readonly className?: string;
}) {
  const labelled = title !== undefined;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={cx('shrink-0', className)}
      role={labelled ? 'img' : undefined}
      aria-hidden={labelled ? undefined : true}
    >
      {labelled && <title>{title}</title>}
      <rect width="32" height="32" rx="8" fill="var(--ot-accent)" />
      {[7, 10.4, 13.8, 17.2, 20.6, 24].map(y => (
        <line
          key={y}
          x1="5"
          x2="27"
          y1={y}
          y2={y}
          stroke="var(--ot-on-accent)"
          strokeOpacity="0.55"
          strokeWidth="1.1"
        />
      ))}
      <ellipse
        cx="17.5"
        cy="15.5"
        rx="6.2"
        ry="7.6"
        fill="var(--ot-accent)"
        stroke="var(--ot-on-accent)"
        strokeWidth="2.6"
      />
    </svg>
  );
}

export function Wordmark({ className }: { readonly className?: string }) {
  return (
    <span className={cx('font-display text-[22px] leading-none tracking-[-0.01em]', className)}>
      Open<span className="text-accent">Tabz</span>
    </span>
  );
}
