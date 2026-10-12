import { Button, Toast } from '@opentabz/ui';
import { useState } from 'react';
import { usePreferences } from '../state/preferences.ts';
import { strings } from '../strings.ts';
import { useUpdate } from './pwa.ts';

const s = strings.update;

/**
 * A new version of the app is installed and waits (PLAT-045): it is taken only when asked, so that
 * a score open is never cut short; the scores open now open again after the reload.
 */
export function UpdateNotice() {
  const ready = useUpdate(state => state.ready);
  const apply = useUpdate(state => state.apply);
  const remember = usePreferences(state => state.rememberRecent);
  const [later, setLater] = useState(false);
  return (
    <Toast
      open={ready && !later}
      onOpenChange={open => {
        if (!open) setLater(true);
      }}
      title={s.title}
      description={remember ? s.reopens : s.plain}
      duration={Number.POSITIVE_INFINITY}
      closeLabel={s.later}
      action={
        <Button size="sm" onClick={apply}>
          {s.reload}
        </Button>
      }
    />
  );
}
