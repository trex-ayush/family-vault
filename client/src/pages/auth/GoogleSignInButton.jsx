import { useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { env } from '@/config/env.js';
import ThemeContext from '@/context/ThemeContext.jsx';
import { Skeleton } from '@/components/ui/Skeleton.jsx';

/**
 * GoogleSignInButton — Google's own "Continue with Google" button from Google Identity Services
 * (GIS), sized and themed to sit with our form. Page-specific (Login, Signup, AcceptInvite), so
 * it lives in pages/auth/.
 *
 * Why Google's rendered button and not a hand-drawn one: our server signs people in with the
 * ID token (`credential`) that GIS hands to `callback`. GIS only produces that token from its own
 * button (or One Tap, which Google may silently suppress), so a custom `<button>` can't start the
 * same flow reliably — and hiding Google's button under ours is fragile and against Google's
 * guidelines. Google's button already follows Google's branding rules (multicolour "G", the
 * approved wording, light and dark variants), so we keep it and fit it in:
 *  - `theme` follows the app: `outline` (white, grey border) in light, `filled_black` in dark;
 *  - `locale` follows the app language, so Hindi readers get Google's Hindi wording;
 *  - `size: large` (40px — our button height from `lg`), `shape: rectangular`, logo on the left;
 *  - width tracks the container (GIS takes pixels only, 200–400px), centred in a row as tall as
 *    our buttons, so the page doesn't jump.
 * While Google's script loads, a plain skeleton block holds the space, until Google's button has
 * really drawn. What's inside that button is Google's: it may then say "Continue as <name>".
 *
 * - Loads `https://accounts.google.com/gsi/client` lazily, once, only when this mounts.
 * - Renders **nothing** when `VITE_GOOGLE_CLIENT_ID` is unset, or when Google's script can't load
 *   (offline, blocked) — email and password sign-in still works.
 * - `enableOneTap` also calls `google.accounts.id.prompt()` (Login only).
 *
 * Props: onCredential(credential: string), enableOneTap? (default false), text? (GIS text
 * variant: 'continue_with' default, or 'signin_with')
 *
 * @example
 * <GoogleSignInButton onCredential={handleGoogleCredential} enableOneTap />
 */
let gisScriptPromise = null;
function loadGoogleIdentityScript() {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gisScriptPromise) return gisScriptPromise;
  gisScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-google-identity-services]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentityServices = 'true';
    script.onload = () => resolve();
    script.onerror = () => {
      gisScriptPromise = null;
      reject(new Error('Failed to load Google Identity Services'));
    };
    document.head.appendChild(script);
  });
  return gisScriptPromise;
}

/** Pixel width GIS accepts (200–400), from the row's measured width. */
const buttonWidth = (el) => Math.min(400, Math.max(200, Math.floor(el?.offsetWidth || 300)));

export default function GoogleSignInButton({ onCredential, enableOneTap = false, text = 'continue_with' }) {
  const { t, i18n } = useTranslation('auth');
  const isDark = useContext(ThemeContext)?.isDark ?? false;
  const locale = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];
  const rowRef = useRef(null);
  const containerRef = useRef(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'failed'
  const [drawn, setDrawn] = useState(false);
  const [width, setWidth] = useState(null);
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;

  useEffect(() => {
    if (!env.googleClientId) return undefined;
    let cancelled = false;
    loadGoogleIdentityScript()
      .then(() => !cancelled && setStatus('ready'))
      .catch(() => !cancelled && setStatus('failed'));
    return () => {
      cancelled = true;
    };
  }, []);

  // Initialise once per page (and show One Tap on Login) — not again on a theme/language change.
  useEffect(() => {
    if (status !== 'ready' || !env.googleClientId) return;
    const { google } = window;
    google.accounts.id.initialize({
      client_id: env.googleClientId,
      callback: (response) => onCredentialRef.current?.(response.credential),
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    if (enableOneTap) google.accounts.id.prompt();
  }, [status, enableOneTap]);

  // Track the row's width (GIS only takes a pixel width).
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return undefined;
    setWidth(buttonWidth(row));
    const ro = new ResizeObserver(() => setWidth(buttonWidth(row)));
    ro.observe(row);
    return () => ro.disconnect();
  }, [status]);

  // Draw (and redraw on width, theme or language change) Google's button.
  useEffect(() => {
    const el = containerRef.current;
    if (status !== 'ready' || !env.googleClientId || !el || !width) return undefined;
    el.innerHTML = '';
    window.google.accounts.id.renderButton(el, {
      type: 'standard',
      theme: isDark ? 'filled_black' : 'outline',
      size: 'large',
      shape: 'rectangular',
      logo_alignment: 'left',
      text,
      width,
      locale,
    });
    // Keep the placeholder up until Google's button really has a size: its iframe arrives empty
    // and 0px wide first, so showing it any sooner blinks.
    setDrawn(false);
    const started = Date.now();
    let settle = null;
    const watch = setInterval(() => {
      const hasSize = el.querySelector('iframe')?.getBoundingClientRect().width > 0;
      if (hasSize || Date.now() - started > 3000) {
        clearInterval(watch);
        settle = setTimeout(() => setDrawn(true), hasSize ? 150 : 0);
      }
    }, 50);
    return () => {
      clearInterval(watch);
      clearTimeout(settle);
    };
  }, [status, width, isDark, text, locale]);

  if (!env.googleClientId || status === 'failed') return null;

  const label = text === 'signin_with' ? t('google.signInWith', 'Sign in with Google') : t('google.continueWith', 'Continue with Google');

  return (
    <div ref={rowRef} className="relative flex min-h-11 w-full items-center justify-center lg:min-h-10">
      {!drawn && (
        // A plain block the same size: a copy of Google's button would visibly change when the
        // real one, with its own look, replaces it.
        <div role="status" aria-label={label} style={{ width: width || '100%', maxWidth: 400 }} className="absolute inset-y-0 my-auto h-10">
          <Skeleton className="h-10 w-full" />
        </div>
      )}
      <div ref={containerRef} className={`flex h-10 justify-center transition-opacity duration-200 ${drawn ? 'opacity-100' : 'opacity-0'}`} style={{ colorScheme: 'normal' }} />
    </div>
  );
}

/** "or" divider between the Google button and the email/password form. */
export function AuthDivider({ label }) {
  const { t } = useTranslation('auth');
  const text = label ?? t('google.or', 'or');
  return (
    <div className="my-5 flex items-center gap-3" role="separator" aria-label={text}>
      <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
      <span className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{text}</span>
      <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
    </div>
  );
}
