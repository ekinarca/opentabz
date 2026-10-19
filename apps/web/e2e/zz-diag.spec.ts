// Temporary: how each engine treats synthetic paste events and the clipboard API.
import { expect, openHome, test } from './support.ts';

test('diag paste', async ({ page, browserName }) => {
  await openHome(page);
  const report = await page.evaluate(async () => {
    const out: Record<string, unknown> = {};
    const data = new DataTransfer();
    data.setData('text/plain', 'hello');
    const event = new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true });
    out['clipboardDataNull'] = event.clipboardData === null;
    out['sameObject'] = event.clipboardData === data;
    out['getData'] = event.clipboardData?.getData('text/plain');
    out['types'] = event.clipboardData ? [...event.clipboardData.types] : null;
    let inHandler: unknown = 'not called';
    const listener = (e: Event) => {
      inHandler = (e as ClipboardEvent).clipboardData?.getData('text/plain') ?? 'null data';
    };
    document.addEventListener('paste', listener);
    document.dispatchEvent(event);
    document.removeEventListener('paste', listener);
    out['inHandler'] = inHandler;
    try {
      await navigator.clipboard.writeText('from clipboard');
      out['writeText'] = 'ok';
    } catch (error) {
      out['writeText'] = String(error);
    }
    const context = new AudioContext();
    await context.resume().catch(() => undefined);
    await new Promise(resolve => setTimeout(resolve, 500));
    out['audio'] = { state: context.state, time: context.currentTime };
    return out;
  });
  console.log(`DIAG ${browserName} ${JSON.stringify(report)}`);
  expect(report).toBeTruthy();
});
