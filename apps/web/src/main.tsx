import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App.tsx';
import { registerServiceWorker } from './app/pwa.ts';
import { getEngine } from './engine/instance.ts';
import { printRoot } from './export/print.ts';
import { installScoreFonts } from './score-view/score-fonts.ts';
import { installScoreTheme, loadMusicFont } from './score-view/score-theme.ts';
import './styles/app.css';

installScoreTheme();
installScoreFonts();
printRoot();

const root = document.getElementById('root');
if (root === null) throw new Error('OpenTabz: #root element is missing from index.html.');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

/**
 * Warm up as soon as the page has painted, so a file dropped a moment later renders at once: start
 * the engine worker (its JIT warm-up runs inside it) and fetch the music font. Waiting for the
 * first contentful paint keeps both off the critical path of the first frame on slow phones.
 */
function warmUp(): void {
  setTimeout(() => {
    void getEngine().ready.catch(() => undefined);
    void loadMusicFont();
    // The app kept for use without a network, once the page is up (PLAT-002).
    registerServiceWorker();
  }, 0);
}

if (PerformanceObserver.supportedEntryTypes.includes('paint')) {
  new PerformanceObserver((list, observer) => {
    if (list.getEntriesByName('first-contentful-paint').length === 0) return;
    observer.disconnect();
    warmUp();
  }).observe({ type: 'paint', buffered: true });
} else {
  requestAnimationFrame(warmUp);
}
