import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import i18n from '@/i18n/index.js';
import { ThemeProvider } from '@/context/ThemeContext.jsx';
import Landing from './Landing.jsx';

/** Build-time only (vite.config.js prerenderLandingPlugin): the landing page as English HTML. */
export async function renderLanding() {
  await i18n.changeLanguage('en');
  return renderToString(
    <ThemeProvider>
      <StaticRouter location="/">
        <Landing />
      </StaticRouter>
    </ThemeProvider>,
  );
}
