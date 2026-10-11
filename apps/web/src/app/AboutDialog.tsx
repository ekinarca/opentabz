import { Button, Dialog, LogoMark } from '@opentabz/ui';
import { strings } from '../strings.ts';

const SOURCE_URL = 'https://github.com/ekinarca/opentabz';
const NOTICES_URL = `${SOURCE_URL}/blob/main/THIRD_PARTY_NOTICES.md`;
const ALPHATAB_URL = 'https://github.com/CoderLine/alphaTab';

export function AboutDialog({
  open,
  onOpenChange,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={strings.about.title}
      description={strings.about.description}
      closeLabel={strings.about.close}
      footer={
        <Button
          variant="primary"
          onClick={() => {
            onOpenChange(false);
          }}
        >
          {strings.about.close}
        </Button>
      }
    >
      <div className="flex flex-col gap-4 text-[14px] leading-relaxed text-ink-muted">
        <div className="flex items-center gap-3">
          <LogoMark size={40} />
          <p className="text-ink">{strings.about.license}</p>
        </div>
        <p>{strings.about.privacy}</p>
        <div>
          <h3 className="mb-1 text-[12px] font-semibold tracking-[0.08em] text-ink-faint uppercase">
            {strings.about.engine}
          </h3>
          <p>{strings.about.engineCredit}</p>
          <p className="mt-2">{strings.about.font}</p>
        </div>
        <p className="text-[13px]">{strings.about.trademark}</p>
        <p className="text-[13px] font-medium text-ink">{strings.about.maker}</p>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
          <li>
            <a
              className="text-accent underline-offset-2 hover:underline"
              href={SOURCE_URL}
              target="_blank"
              rel="noreferrer"
            >
              {strings.about.source}
            </a>
          </li>
          <li>
            <a
              className="text-accent underline-offset-2 hover:underline"
              href={NOTICES_URL}
              target="_blank"
              rel="noreferrer"
            >
              {strings.about.notices}
            </a>
          </li>
          <li>
            <a
              className="text-accent underline-offset-2 hover:underline"
              href={ALPHATAB_URL}
              target="_blank"
              rel="noreferrer"
            >
              alphaTab
            </a>
          </li>
        </ul>
      </div>
    </Dialog>
  );
}
