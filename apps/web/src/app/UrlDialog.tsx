import { Button, Dialog } from '@opentabz/ui';
import { useId, useState } from 'react';
import { parseHttpUrl } from '../features/open/intake.ts';
import { strings } from '../strings.ts';
import { openUrl } from './open-actions.ts';

export function UrlDialog({
  open,
  onOpenChange,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}) {
  const [value, setValue] = useState('');
  const [invalid, setInvalid] = useState(false);
  const inputId = useId();
  const errorId = useId();

  const submit = () => {
    const url = parseHttpUrl(value);
    if (url === null) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setValue('');
    onOpenChange(false);
    openUrl(url);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (!next) setInvalid(false);
        onOpenChange(next);
      }}
      title={strings.urlDialog.title}
      description={strings.urlDialog.description}
      closeLabel={strings.urlDialog.cancel}
      width="sm"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => {
              onOpenChange(false);
            }}
          >
            {strings.urlDialog.cancel}
          </Button>
          <Button variant="primary" type="submit" form={`${inputId}-form`}>
            {strings.urlDialog.submit}
          </Button>
        </>
      }
    >
      <form
        id={`${inputId}-form`}
        onSubmit={event => {
          event.preventDefault();
          submit();
        }}
      >
        <label htmlFor={inputId} className="mb-1.5 block text-[13px] font-medium text-ink">
          {strings.urlDialog.label}
        </label>
        <input
          id={inputId}
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          value={value}
          placeholder={strings.urlDialog.placeholder}
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : undefined}
          onChange={event => {
            setValue(event.target.value);
          }}
          className="h-10 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 font-mono text-[13px] text-ink placeholder:text-ink-faint focus:border-accent"
        />
        {invalid && (
          <p id={errorId} className="mt-2 text-[13px] text-danger">
            {strings.urlDialog.invalid}
          </p>
        )}
      </form>
    </Dialog>
  );
}
