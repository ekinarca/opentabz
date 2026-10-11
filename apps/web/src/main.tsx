import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App.tsx';
import { getEngine } from './engine/instance.ts';
import { installScoreTheme, loadMusicFont } from './score-view/score-theme.ts';
import './styles/app.css';

installScoreTheme();

const root = document.getElementById('root');
if (root === null) throw new Error('OpenTabz: #root element is missing from index.html.');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Warm up right after the first paint, so a file dropped a moment later renders immediately:
// start the engine worker (JIT warm-up runs inside it) and fetch the music font.
requestAnimationFrame(() => {
  setTimeout(() => {
    void getEngine().ready.catch(() => undefined);
    void loadMusicFont();
  }, 0);
});
