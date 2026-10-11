import type { OpenError } from '@opentabz/core/shared';
import { Button, Dialog } from '@opentabz/ui';
import { AlertTriangle, Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { useDocuments } from '../state/documents.ts';
import { describeFormat, formatBytes, openErrorText, strings } from '../strings.ts';

export function technicalDetails(error: OpenError): string {
  const lines = [
    `file: ${error.fileName}`,
    `code: ${error.code}`,
    `${strings.errors.size}: ${formatBytes(error.byteLength)} (${error.byteLength} bytes)`,
  ];
  if (error.format !== null)
    lines.push(`${strings.errors.format}: ${describeFormat(error.format, error.formatVersion)}`);
  if (error.extensionMismatch) lines.push('extension does not match content');
  if (error.position !== null) lines.push(`${strings.errors.position}: ${error.position}`);
  lines.push(`detail: ${error.detail}`);
  return lines.join('\n');
}

function FailureItem({ error }: { readonly error: OpenError }) {
  const [copied, setCopied] = useState(false);
  const text = openErrorText(error);
  const details = technicalDetails(error);
  return (
    <li className="rounded-[12px] border border-line bg-surface p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle size={20} className="mt-0.5 shrink-0 text-danger" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-ink">{text.title}</p>
          <p className="mt-1 text-[14px] text-ink-muted">{text.explanation}</p>
          <details className="mt-3 text-[13px]">
            <summary className="cursor-pointer text-ink-muted select-none hover:text-ink">
              {strings.errors.technical}
            </summary>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-sunken p-3 font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-ink">
              {details}
            </pre>
            <Button
              size="sm"
              variant="ghost"
              className="mt-2"
              icon={copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
              onClick={() => {
                void navigator.clipboard.writeText(details).then(() => {
                  setCopied(true);
                });
              }}
            >
              {copied ? strings.errors.copied : strings.errors.copy}
            </Button>
          </details>
        </div>
      </div>
    </li>
  );
}

export function OpenErrorsDialog() {
  const failures = useDocuments(state => state.failures);
  const dismiss = useDocuments(state => state.dismissFailures);
  return (
    <Dialog
      open={failures.length > 0}
      onOpenChange={open => {
        if (!open) dismiss();
      }}
      title={strings.errors.dialogTitle(failures.length)}
      closeLabel={strings.errors.dismiss}
      footer={
        <Button variant="primary" onClick={dismiss}>
          {strings.errors.dismiss}
        </Button>
      }
    >
      <ul className="flex flex-col gap-3">
        {failures.map(failure => (
          <FailureItem key={failure.id} error={failure.error} />
        ))}
      </ul>
    </Dialog>
  );
}
