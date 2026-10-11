import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  ArrowUp,
  BadgeIndianRupee,
  Camera,
  Check,
  ChevronDown,
  GraduationCap,
  HandHeart,
  HeartPulse,
  HeartHandshake,
  KeyRound,
  Languages,
  Link2,
  MonitorSmartphone,
  Play,
  Volume2,
  VolumeX,
  Moon,
  RotateCcw,
  Search,
  ShieldCheck,
  Sun,
  Users,
  History,
  House,
  ImageDown,
  Landmark,
  LockKeyhole,
  LogOut,
  Plane,
  Timer,
} from 'lucide-react';
import Button from '@/components/ui/Button.jsx';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher.jsx';
import { useTheme } from '@/context/ThemeContext.jsx';
import { BrandMark } from '@/pages/auth/AuthLayout.jsx';
import { CARD_SURFACE, TEXT_BODY, TEXT_MUTED, TEXT_TITLE } from '@/components/ui/tokens.js';

/**
 * Landing — the public home page at `/` for visitors who aren't signed in (ProtectedRoute shows it
 * instead of sending them to /login; signed-in people get their Home as before).
 *
 * At build time `vite.config.js` (prerenderLanding) renders this page to plain HTML inside
 * index.html, so search engines and slow phones see the whole page before any JavaScript runs.
 * Keep it free of data fetching and browser-only code at module load for that reason.
 *
 * Every claim here matches a real feature (encrypted files and passwords, share links of
 * 12 hours / 1 day / 7 days, WhatsApp invites, Bin, Resize & compress, Activity). Nothing about
 * price.
 */

export const SEO_TITLE = "Family Vault — Keep your family's important documents safe in one place";
const APP_TITLE = 'Family Vault';

const WIDTH = 'mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8';
const SECTION = 'py-14 sm:py-20';
const H2 = `text-2xl font-bold tracking-tight sm:text-3xl ${TEXT_TITLE}`;
const LEAD = `mt-3 text-base sm:text-lg ${TEXT_MUTED}`;
/** The small coral label above a section title. */
function Kicker({ children, className = '' }) {
  return <p className={`mb-2 text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400 ${className}`}>{children}</p>;
}

/** Every other section sits on a white band, so neighbouring sections stand apart. */
const BAND = 'border-y border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900';

// Sections the header links to. `scroll-mt-20` keeps a section's title clear of the sticky header;
// the smooth glide itself is `html:has(#landing-page)` in index.css (off for reduced motion).
const ANCHOR = 'scroll-mt-20';
const SECTION_LINKS = [
  ['features', 'nav.features', 'Features'],
  ['safety', 'nav.safety', 'Safety'],
  ['how', 'nav.how', 'How it works'],
  ['faq', 'nav.faq', 'Questions'],
];

/** The questions, in order — also used for the FAQ structured data in index.html. */
export const FAQ_KEYS = ['free', 'safe', 'parents', 'hindi', 'devices', 'family', 'delete'];

/**
 * Light / dark switch: one icon button. Both icons are in the page and CSS picks one from the
 * `dark` class, so the pre-rendered copy shows the right icon before any JavaScript runs.
 */
function ThemeToggle() {
  const { t } = useTranslation('landing');
  const { isDark, toggleTheme } = useTheme();
  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={isDark ? t('nav.light', 'Switch to light mode') : t('nav.dark', 'Switch to dark mode')}>
      <Moon className="h-5 w-5 dark:hidden" aria-hidden="true" />
      <Sun className="hidden h-5 w-5 dark:block" aria-hidden="true" />
    </Button>
  );
}

function Header() {
  const { t } = useTranslation('landing');
  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200/80 bg-neutral-50/90 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-950/90">
      <nav aria-label={t('nav.main', 'Main menu')} className={`${WIDTH} flex h-16 items-center justify-between gap-2`}>
        <Link to="/" aria-label="Family Vault" className="rounded-xl">
          <BrandMark nameClassName="hidden sm:inline" />
        </Link>
        <ul className="hidden items-center gap-1 lg:flex">
          {SECTION_LINKS.map(([id, key, fallback]) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
              >
                {t(key, fallback)}
              </a>
            </li>
          ))}
        </ul>
        {/* Wrappers carry the show/hide: the controls set their own display. One action only:
            Get started (people who already have an account find "Log in" on the sign-up page
            and in the footer). */}
        <div className="flex items-center gap-1 sm:gap-2">
          <span className="sm:hidden">
            <LanguageSwitcher variant="compact" />
          </span>
          <span className="hidden sm:block">
            <LanguageSwitcher />
          </span>
          <ThemeToggle />
          <Button as={Link} to="/signup" className="ml-1 whitespace-nowrap">
            {t('nav.start', 'Get started')}
          </Button>
        </div>
      </nav>
    </header>
  );
}

/** Phone screenshot in a simple device frame. */
function PhoneShot({ src, alt, className = '', eager = false }) {
  return (
    <div
      className={`overflow-hidden rounded-[2rem] border-[6px] border-neutral-900 bg-neutral-900 shadow-2xl ring-1 ring-neutral-900/10 dark:border-neutral-700 ${className}`}
    >
      <img
        src={src}
        alt={alt}
        width={390}
        height={844}
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : undefined}
        decoding="async"
        className="block h-auto w-full"
      />
    </div>
  );
}

/** PC screenshot in a simple browser window frame. */
function PcShot({ name, alt, eager = false, className = '', sizes = '(min-width: 1024px) 560px, 100vw' }) {
  return (
    <div className={`overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-800 ${className}`}>
      <div aria-hidden="true" className="flex h-7 items-center gap-1.5 border-b border-neutral-200 bg-neutral-100 px-3 dark:border-neutral-700 dark:bg-neutral-900">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
      </div>
      <img
        src={`/assets/landing/${name}-1280.webp`}
        srcSet={`/assets/landing/${name}-800.webp 800w, /assets/landing/${name}-1280.webp 1280w`}
        sizes={sizes}
        alt={alt}
        width={1280}
        height={800}
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : undefined}
        decoding="async"
        className="block h-auto w-full"
      />
    </div>
  );
}

const VIDEO_DIR = '/assets/landing/video';

/** Which demo video suits this screen: upright on phones, wide (720p or full HD) elsewhere. */
function pickDemoVideo() {
  if (window.matchMedia('(max-width: 639.98px)').matches) return `${VIDEO_DIR}/demo-portrait-720.mp4`;
  if (window.matchMedia('(min-width: 1280px)').matches) return `${VIDEO_DIR}/demo-wide-1080.mp4`;
  return `${VIDEO_DIR}/demo-wide-720.mp4`;
}

/**
 * The demo video in the top section: an animated walk-through of the app (56 s, loops).
 *  - Phones get the upright version, bigger screens the wide one (the frame's shape follows).
 *  - A still of the first frame shows straight away (also in the pre-rendered page); the video is
 *    only chosen and loaded after the app starts, so the page itself opens fast.
 *  - It plays by itself, muted (browsers only allow that), and pauses while scrolled away. The
 *    speaker button turns the sound on.
 *  - With "reduce motion" or data saver on, nothing plays by itself: a play button shows instead.
 */
function HeroVideo() {
  const { t } = useTranslation('landing');
  const video = useRef(null);
  const [src, setSrc] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [autoplay, setAutoplay] = useState(true);

  useEffect(() => {
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const saveData = Boolean(navigator.connection?.saveData);
    setAutoplay(!calm && !saveData);
    setSrc(pickDemoVideo());
  }, []);

  // Play while on screen, pause while scrolled away (only when it is meant to play by itself, or
  // after the person pressed play).
  useEffect(() => {
    const el = video.current;
    if (!el || !src) return undefined;
    el.muted = true; // React does not set the `muted` attribute reliably; autoplay needs it
    if (!autoplay) return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) el.play().catch(() => {});
        else el.pause();
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [src, autoplay]);

  const toggleSound = () => {
    const el = video.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
    if (el.paused) el.play().catch(() => {});
  };

  const start = () => {
    const el = video.current;
    if (!el) return;
    setAutoplay(true);
    el.play().catch(() => {});
  };

  return (
    <div className="relative mx-auto aspect-[9/16] max-w-[22rem] overflow-hidden rounded-[1.75rem] bg-neutral-950 shadow-2xl ring-1 ring-neutral-900/10 sm:aspect-video sm:max-w-5xl sm:rounded-2xl dark:ring-white/10">
      {/* First frame, right away: upright on phones, wide elsewhere. */}
      <picture>
        <source media="(max-width: 639.98px)" srcSet={`${VIDEO_DIR}/poster-portrait.webp`} />
        <img
          src={`${VIDEO_DIR}/poster-wide.webp`}
          alt=""
          width={1280}
          height={720}
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </picture>
      {src && (
        <video
          ref={video}
          src={src}
          muted
          loop
          playsInline
          preload={autoplay ? 'auto' : 'metadata'}
          aria-label={t('video.label', 'A short video showing how a family uses Family Vault')}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${playing ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
      {src && !autoplay && !playing && (
        <button
          type="button"
          onClick={start}
          aria-label={t('video.play', 'Play the video')}
          className="absolute inset-0 flex items-center justify-center bg-neutral-950/20"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-500 text-white shadow-[0_10px_30px_-6px_rgb(255_90_95/0.7)]">
            <Play className="ml-1 h-7 w-7" fill="currentColor" aria-hidden="true" />
          </span>
        </button>
      )}
      {src && (playing || autoplay) && (
        <button
          type="button"
          onClick={toggleSound}
          aria-label={muted ? t('video.soundOn', 'Turn the sound on') : t('video.soundOff', 'Turn the sound off')}
          aria-pressed={!muted}
          className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-neutral-900/70 text-white ring-1 ring-white/20 backdrop-blur-sm transition-colors hover:bg-neutral-900/90 sm:bottom-4 sm:right-4"
        >
          {muted ? <VolumeX className="h-5 w-5" aria-hidden="true" /> : <Volume2 className="h-5 w-5" aria-hidden="true" />}
        </button>
      )}
    </div>
  );
}

function Hero() {
  const { t } = useTranslation('landing');
  const trust = [
    { icon: BadgeIndianRupee, title: t('hero.trustFree', '100% free'), text: t('hero.trustFreeText', 'No card, no hidden charges') },
    { icon: LockKeyhole, title: t('hero.trustEncrypted', 'AES-256 encrypted'), text: t('hero.trustEncryptedText', 'Files and passwords locked') },
    { icon: Languages, title: t('hero.trustLanguages', 'English and हिन्दी'), text: t('hero.trustLanguagesText', 'Switch with one tap') },
    { icon: MonitorSmartphone, title: t('hero.trustDevices', 'Any phone or PC'), text: t('hero.trustDevicesText', 'Nothing to install') },
  ];
  return (
    <section className="relative overflow-hidden">
      {/* A soft coral wash with a faint dot grid, fading out downwards. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[44rem] bg-linear-to-b from-primary-50 via-primary-50/40 to-transparent dark:from-primary-900/25 dark:via-primary-900/10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[36rem] bg-[radial-gradient(circle,rgb(255_90_95/0.18)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,#000,transparent)]"
      />

      <div className={`${WIDTH} relative pt-10 text-center sm:pt-16 lg:pt-20`}>
        <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-primary-700 shadow-soft-sm ring-1 ring-primary-100 dark:bg-neutral-900 dark:text-primary-300 dark:ring-primary-900/40">
          <HeartHandshake className="h-3.5 w-3.5" aria-hidden="true" />
          {t('hero.eyebrow', 'Free for every Indian family · English and हिन्दी')}
        </p>
        <h1 className={`mx-auto mt-6 max-w-4xl text-[2rem] font-extrabold leading-[1.15] tracking-tight sm:text-5xl lg:text-6xl lg:leading-[1.08] ${TEXT_TITLE}`}>
          {t('hero.titleStart', "All your family's important documents,")}{' '}
          <span className="bg-linear-to-r from-primary-500 to-primary-400 bg-clip-text text-transparent">
            {t('hero.titleAccent', 'safe in one place')}
          </span>
        </h1>
        <p className={`mx-auto mt-6 max-w-2xl text-base leading-relaxed sm:text-lg ${TEXT_BODY}`}>
          {t(
            'hero.text',
            'Keep Aadhaar, PAN, passports, bank papers and passwords in one private vault. Find anything in seconds, share it safely, and let the whole family use it — Mummy and Papa too.',
          )}
        </p>
        <div id="hero-cta" className="mt-8 flex flex-col items-center">
          <Button
            as={Link}
            to="/signup"
            weight="semibold"
            rounded="xl"
            rightIcon={<ArrowRight className="h-5 w-5" aria-hidden="true" />}
            className="min-h-13 w-full px-8! text-base! shadow-[0_10px_30px_-8px_rgb(255_90_95/0.6)] sm:w-auto lg:min-h-13"
          >
            {t('hero.start', "Get started — it's free")}
          </Button>
          <p className={`mt-3 text-sm ${TEXT_MUTED}`}>{t('hero.note', 'Takes a minute. No card needed.')}</p>
        </div>
      </div>

      {/* The demo video: what using the app looks like. */}
      <div className={`${WIDTH} relative mt-12 sm:mt-16`}>
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-10 top-10 bottom-0 rounded-[3rem] bg-primary-400/25 blur-3xl dark:bg-primary-500/15" />
        <HeroVideo />
      </div>

      <div className={`${WIDTH} relative pb-14 pt-12 sm:pb-20 sm:pt-16`}>
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {trust.map(({ icon: Icon, title, text }) => (
            <li key={title} data-spotlight className={`${CARD_SURFACE} flex flex-col items-center gap-2 p-4 text-center sm:flex-row sm:items-start sm:gap-3 sm:p-5 sm:text-left`}>
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className={`text-sm font-semibold ${TEXT_TITLE}`}>{title}</p>
                <p className={`mt-0.5 text-xs ${TEXT_MUTED}`}>{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Real moments when the papers are needed — what people actually search for, too. */
function Moments() {
  const { t } = useTranslation('landing');
  const moments = [
    { icon: Landmark, tone: 'bg-blue-50 text-blue-600 dark:bg-blue-400/15 dark:text-blue-400', title: t('moments.bankTitle', 'Bank and KYC'), text: t('moments.bankText', 'Aadhaar and PAN ready to show or send, without hunting through the cupboard.') },
    { icon: GraduationCap, tone: 'bg-violet-50 text-violet-600 dark:bg-violet-400/15 dark:text-violet-400', title: t('moments.schoolTitle', 'School and college admission'), text: t('moments.schoolText', 'Birth certificate, marksheets and photos for the forms — made smaller with Resize & compress.') },
    { icon: HeartPulse, tone: 'bg-red-50 text-red-600 dark:bg-red-400/15 dark:text-red-400', title: t('moments.hospitalTitle', 'Hospital visits'), text: t('moments.hospitalText', 'Health insurance card and reports in hand, even when someone else is at the hospital.') },
    { icon: Plane, tone: 'bg-sky-50 text-sky-600 dark:bg-sky-400/15 dark:text-sky-400', title: t('moments.travelTitle', 'Passport and travel'), text: t('moments.travelText', 'Passport, visa and tickets on your phone, and a copy you can share with family back home.') },
    { icon: HandHeart, tone: 'bg-primary-50 text-primary-600 dark:bg-primary-400/15 dark:text-primary-400', title: t('moments.farTitle', 'Helping parents from far away'), text: t('moments.farText', 'Mummy and Papa add a photo, you open it from another city. No more "send it on WhatsApp again".') },
    { icon: House, tone: 'bg-amber-50 text-amber-600 dark:bg-amber-400/15 dark:text-amber-400', title: t('moments.propertyTitle', 'Property and insurance'), text: t('moments.propertyText', 'Sale deeds, policies and renewal dates in one place, for the day the family needs them.') },
  ];
  return (
    <section className={SECTION}>
      <div data-reveal className={WIDTH}>
        <div className="mx-auto max-w-2xl text-center">
          <Kicker>{t('kicker.moments', 'Real life')}</Kicker>
          <h2 className={H2}>{t('moments.title', "When you'll need it")}</h2>
          <p className={LEAD}>{t('moments.text', "The papers are always asked for at the worst moment. Now they're always in your pocket.")}</p>
        </div>
        {/* Phones: a row to swipe through (the next card peeks in). Wider: a grid. */}
        <ul className="-mx-4 mt-10 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:mx-0 sm:mt-12 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3 [&::-webkit-scrollbar]:hidden">
          {moments.map(({ icon: Icon, tone, title, text }) => (
            <li key={title} data-spotlight className={`${CARD_SURFACE} flex w-[82%] flex-shrink-0 snap-center gap-4 p-5 sm:w-auto`}>
              <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${tone}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className={`text-base font-semibold ${TEXT_TITLE}`}>{title}</h3>
                <p className={`mt-1 text-sm leading-relaxed ${TEXT_BODY}`}>{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * "How we keep it safe" — only protections the app really has: AES-256-GCM for files and saved
 * passwords (server utils/crypto.js), bcrypt login passwords and rate-limited sign-in, the
 * one-hour idle sign-out (services/idleSession.js), a password change signing out every other
 * device, share links that expire, and Activity.
 */
function Safety() {
  const { t } = useTranslation('landing');
  const points = [
    { icon: LockKeyhole, title: t('safety.encryptTitle', 'Encrypted files and passwords'), text: t('safety.encryptText', 'Every file and saved password is locked with AES-256 encryption before it is stored.') },
    { icon: KeyRound, title: t('safety.loginTitle', 'Your login password stays secret'), text: t('safety.loginText', 'It is stored scrambled, never as you typed it. Too many wrong tries are blocked.') },
    { icon: Timer, title: t('safety.idleTitle', 'Signs out by itself'), text: t('safety.idleText', 'Left the app open? It signs you out after an hour without use.') },
    { icon: LogOut, title: t('safety.everywhereTitle', 'Lost a phone? You stay in control'), text: t('safety.everywhereText', 'Change your password and every other phone and computer is signed out.') },
    { icon: Link2, title: t('safety.linksTitle', 'Links that switch off'), text: t('safety.linksText', 'Shared links stop working by themselves. Passwords and notes are never shared.') },
    { icon: History, title: t('safety.activityTitle', 'See who did what'), text: t('safety.activityText', 'Activity shows who added, opened or shared each document.') },
  ];
  return (
    <section id="safety" className={`${ANCHOR} relative overflow-hidden bg-neutral-900 text-white ${SECTION} dark:border-y dark:border-neutral-800`}>
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary-500/15 blur-3xl" />
      <div data-reveal className={`${WIDTH} relative`}>
        <div className="mx-auto max-w-2xl text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500/15 text-primary-300 ring-1 ring-primary-400/30">
            <ShieldCheck className="h-7 w-7" aria-hidden="true" />
          </span>
          <Kicker className="mt-5 text-primary-300 dark:text-primary-300">{t('kicker.safety', 'Safety')}</Kicker>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('safety.title', 'How we keep it safe')}</h2>
          <p className="mt-3 text-base text-neutral-300 sm:text-lg">
            {t('safety.text', "Your documents are your family's most private papers. This is how Family Vault protects them.")}
          </p>
        </div>
        <ul className="mt-10 grid gap-3 sm:mt-12 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {points.map(({ icon: Icon, title, text }) => (
            <li key={title} data-spotlight className="flex gap-4 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
              <Icon className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary-300" aria-hidden="true" />
              <div>
                <h3 className="text-base font-semibold">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-neutral-300">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Smooth unless the person asked their phone or computer for less motion. */
const scrollBehavior = () => (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

/**
 * Back to top: shows after about one screen of scrolling. On phones it sits above the sticky
 * "Create your family vault" bar (StickyStart) so the two never overlap.
 */
function BackToTop() {
  const { t } = useTranslation('landing');
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > window.innerHeight);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div
      inert={!show}
      aria-hidden={!show}
      className={`fixed bottom-[calc(var(--safe-bottom,0px)+5.5rem)] right-4 z-30 transition-all duration-300 sm:bottom-6 sm:right-6 ${
        show ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
      }`}
    >
      <Button
        variant="secondary"
        size="icon"
        rounded="full"
        onClick={() => window.scrollTo({ top: 0, behavior: scrollBehavior() })}
        aria-label={t('nav.top', 'Back to top')}
        className="shadow-soft-md"
      >
        <ArrowUp className="h-5 w-5" aria-hidden="true" />
      </Button>
    </div>
  );
}

/**
 * Phones only: once the top "Create your family vault" button has scrolled away, the same button
 * stays at the bottom of the screen — and steps aside again when the big one at the end is in view.
 */
function StickyStart() {
  const { t } = useTranslation('landing');
  const [show, setShow] = useState(false);
  useEffect(() => {
    const hero = document.getElementById('hero-cta');
    const end = document.getElementById('final-cta');
    if (!hero || !end || !('IntersectionObserver' in window)) return undefined;
    const state = { heroGone: false, endInView: false };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.target === hero) state.heroGone = !e.isIntersecting && e.boundingClientRect.top < 0;
        if (e.target === end) state.endInView = e.isIntersecting;
      });
      setShow(state.heroGone && !state.endInView);
    });
    io.observe(hero);
    io.observe(end);
    return () => io.disconnect();
  }, []);
  return (
    <div
      inert={!show}
      aria-hidden={!show}
      className={`fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-white/95 px-4 pb-[calc(var(--safe-bottom,0px)+0.75rem)] pt-3 shadow-[0_-4px_20px_rgb(0_0_0/0.08)] backdrop-blur-md transition-transform duration-300 sm:hidden dark:border-neutral-800 dark:bg-neutral-900/95 ${
        show ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <Button as={Link} to="/signup" block rightIcon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}>
        {t('sticky.start', 'Create your family vault')}
      </Button>
    </div>
  );
}

function Why() {
  const { t } = useTranslation('landing');
  const points = [
    { icon: HeartHandshake, title: t('why.easyTitle', 'Easy for parents'), text: t('why.easyText', 'Big buttons, plain words and the whole app in Hindi. Add a document in three taps.') },
    { icon: ShieldCheck, title: t('why.privateTitle', 'Private and encrypted'), text: t('why.privateText', 'Files and passwords are stored encrypted. Only the people in your family can see them.') },
    { icon: Link2, title: t('why.shareTitle', 'Share without worry'), text: t('why.shareText', 'Send a document on WhatsApp with a link that switches off by itself. Passwords and notes are never shared.') },
    { icon: Users, title: t('why.familyTitle', 'The whole family together'), text: t('why.familyText', 'Invite family members and choose who can only look and who can add or change things.') },
    { icon: Camera, title: t('why.scanTitle', 'Scan with your camera'), text: t('why.scanText', 'Take a photo of a paper: the edges are cut neatly and the words are read, so you can search them later.') },
    { icon: Search, title: t('why.findTitle', 'Find anything fast'), text: t('why.findText', 'Search by name, note or the words inside a document. No more digging through WhatsApp chats.') },
  ];
  return (
    <section id="features" className={`${ANCHOR} ${BAND} ${SECTION}`}>
      <div data-reveal className={WIDTH}>
        <div className="mx-auto max-w-2xl text-center">
          <Kicker>{t('kicker.why', 'Why Family Vault')}</Kicker>
          <h2 className={H2}>{t('why.title', 'Made for the whole family')}</h2>
          <p className={LEAD}>{t('why.text', 'Simple enough for parents, safe enough for your most important papers.')}</p>
        </div>
        <ul className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {points.map(({ icon: Icon, title, text }) => (
            <li key={title} data-spotlight className="flex gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-5 sm:block sm:p-6 dark:border-neutral-700 dark:bg-neutral-800">
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className={`text-base font-semibold sm:mt-4 ${TEXT_TITLE}`}>{title}</h3>
                <p className={`mt-1 text-sm leading-relaxed sm:mt-2 ${TEXT_BODY}`}>{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** How long each picture stays before the carousel moves on (phones and tablets). */
const TOUR_INTERVAL_MS = 3500;

/**
 * "Take a look inside": four phone screenshots.
 *  - Phones and tablets: one picture at a time in the middle (the neighbours peek in, faded). It
 *    moves on by itself every few seconds, round and round; tapping a dot jumps to that picture
 *    and the timer starts again from there. No arrows and no sideways scrolling.
 *  - PC: all four side by side, nothing moves.
 */
function Tour() {
  const { t } = useTranslation('landing');
  const [active, setActive] = useState(0);
  const slides = [
    { src: 'home-phone', title: t('tour.homeTitle', 'Everything at a glance'), text: t('tour.homeText', "The family's folders and how much is saved, on one screen.") },
    { src: 'document-phone', title: t('tour.docTitle', 'Every document in one place'), text: t('tour.docText', 'Photos of every page, with notes like "Keep a copy for bank KYC".') },
    { src: 'password-phone', title: t('tour.passwordTitle', 'Passwords kept safe'), text: t('tour.passwordText', 'PINs stay hidden until you tap the eye. Copy with one tap.') },
    { src: 'home-phone-hi', title: t('tour.hindiTitle', 'Fully in Hindi'), text: t('tour.hindiText', 'Tap हिन्दी at the top and the whole app switches.') },
  ];
  const count = slides.length;

  // Next picture after a pause. Depends on `active`, so a tap on a dot restarts the wait.
  useEffect(() => {
    if (window.matchMedia?.('(min-width: 1024px)').matches) return undefined; // PC shows all four
    const timer = setTimeout(() => setActive((i) => (i + 1) % count), TOUR_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [active, count]);

  // Each slide is w-60 (15rem) with gap-5 (1.25rem): move the row so the active one is centred.
  const shift = `calc(50% - 7.5rem - ${active * 16.25}rem)`;

  return (
    <section id="tour" aria-roledescription="carousel" aria-labelledby="tour-title" className={`${ANCHOR} overflow-hidden ${BAND} ${SECTION}`}>
      <div data-reveal className={WIDTH}>
        <div className="mx-auto max-w-2xl text-center">
          <Kicker>{t('kicker.tour', 'A quick look')}</Kicker>
          <h2 id="tour-title" className={H2}>
            {t('tour.title', 'Take a look inside')}
          </h2>
          <p className={LEAD}>{t('tour.text', 'This is what your family sees on the phone.')}</p>
        </div>
        <div className="-mx-4 mt-10 overflow-hidden sm:-mx-6 sm:mt-12 lg:mx-0 lg:overflow-visible">
          <ul
            style={{ '--tour-shift': shift }}
            className="flex gap-5 pb-4 pt-2 transition-transform duration-700 ease-in-out motion-reduce:transition-none max-lg:[transform:translateX(var(--tour-shift))] lg:grid lg:grid-cols-4 lg:gap-8"
          >
            {slides.map(({ src, title, text }, i) => (
              <li
                key={src}
                aria-roledescription="slide"
                aria-label={`${i + 1} / ${count}`}
                className={`w-60 flex-shrink-0 text-center transition-[opacity,transform] duration-700 lg:w-auto ${
                  i === active ? '' : 'max-lg:scale-95 max-lg:opacity-40'
                }`}
              >
                <PhoneShot src={`/assets/landing/${src}.webp`} alt={title} className="mx-auto lg:max-w-[15rem]" />
                <h3 className={`mt-5 text-base font-semibold ${TEXT_TITLE}`}>{title}</h3>
                <p className={`mt-1 text-sm leading-relaxed ${TEXT_MUTED}`}>{text}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-2 flex items-center justify-center lg:hidden">
          {slides.map(({ src }, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              aria-label={t('tour.goTo', 'Show picture {{n}}', { n: i + 1 })}
              aria-current={i === active ? 'true' : undefined}
              className="flex h-11 w-7 items-center justify-center"
            >
              <span
                className={`block h-2 rounded-full transition-all duration-300 ${
                  i === active ? 'w-5 bg-primary-500' : 'w-2 bg-neutral-300 dark:bg-neutral-600'
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function ShareSection() {
  const { t } = useTranslation('landing');
  const points = [
    t('share.point1', 'The link switches off by itself after 12 hours, 1 day or 7 days'),
    t('share.point2', 'Switch it off yourself at any time'),
    t('share.point3', 'See when the link was opened'),
  ];
  return (
    <section className={SECTION}>
      <div data-reveal className={`${WIDTH} grid items-center gap-10 lg:grid-cols-2 lg:gap-14`}>
        <div>
          <Kicker>{t('kicker.share', 'Sharing')}</Kicker>
          <h2 className={H2}>{t('share.title', 'Need to send a document? Share it safely')}</h2>
          <p className={LEAD}>{t('share.text', 'The bank, school or a relative needs a copy? Create a link and send it on WhatsApp.')}</p>
          <ul className="mt-6 space-y-3">
            {points.map((text) => (
              <li key={text} className={`flex items-start gap-3 text-base ${TEXT_BODY}`}>
                <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
                  <Check className="h-4 w-4" aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        {/* From tablets up: on a phone the computer screenshot is too small to read. */}
        <PcShot name="share-pc" alt={t('share.shot', 'Sharing a car insurance document with a link that lasts 12 hours')} className="hidden sm:block" />
      </div>
    </section>
  );
}

function Steps() {
  const { t } = useTranslation('landing');
  const steps = [
    { title: t('steps.oneTitle', 'Create your family'), text: t('steps.oneText', 'Sign up with Google or your email and give your family a name.') },
    { title: t('steps.twoTitle', 'Add your documents'), text: t('steps.twoText', 'Take a photo, pick from your gallery or add a PDF. Put it in a folder.') },
    { title: t('steps.threeTitle', 'Invite your family'), text: t('steps.threeText', 'Send an invite on WhatsApp so everyone has the papers when they need them.') },
  ];
  const extras = [
    { icon: RotateCcw, text: t('extra.bin', 'Deleted something by mistake? Bring it back from the Bin.') },
    { icon: ImageDown, text: t('extra.resize', 'Make a photo smaller for online forms with Resize & compress.') },
    { icon: History, text: t('extra.activity', 'See who added, opened or shared what in Activity.') },
  ];
  return (
    <section id="how" className={`${ANCHOR} ${BAND} ${SECTION}`}>
      <div data-reveal className={`${WIDTH} grid gap-10 lg:grid-cols-2 lg:items-end lg:gap-16`}>
        <div>
          <Kicker>{t('kicker.steps', 'Getting started')}</Kicker>
          <h2 className={H2}>{t('steps.title', 'Start in three easy steps')}</h2>
          <ol className="mt-8 space-y-6">
            {steps.map(({ title, text }, i) => (
              <li key={title} className="flex gap-4">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary-500 text-base font-bold text-white shadow-soft-sm">
                  {i + 1}
                </span>
                <div>
                  <h3 className={`text-base font-semibold ${TEXT_TITLE}`}>{title}</h3>
                  <p className={`mt-1 text-sm leading-relaxed ${TEXT_BODY}`}>{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-2xl border border-dashed border-neutral-300 p-5 sm:p-6 dark:border-neutral-700">
            <h3 className={`text-sm font-semibold ${TEXT_TITLE}`}>{t('extra.title', 'And a few more helpful things')}</h3>
            <ul className="mt-3 space-y-2.5">
              {extras.map(({ icon: Icon, text }) => (
                <li key={text} className={`flex items-start gap-2.5 text-sm ${TEXT_BODY}`}>
                  <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-500 dark:text-primary-400" aria-hidden="true" />
                  {text}
                </li>
              ))}
            </ul>
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const { t } = useTranslation('landing');
  return (
    <section id="faq" className={`${ANCHOR} ${SECTION}`}>
      <div data-reveal className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        <Kicker className="text-center">{t('kicker.faq', 'Questions')}</Kicker>
          <h2 className={`${H2} text-center`}>{t('faq.title', 'Common questions')}</h2>
        <div className="mt-10 divide-y divide-neutral-200 rounded-2xl border border-neutral-200 bg-white dark:divide-neutral-700 dark:border-neutral-700 dark:bg-neutral-900">
          {FAQ_KEYS.map((key) => (
            <details key={key} className="group px-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className={`flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-base font-medium ${TEXT_TITLE}`}>
                {t(`faq.${key}Q`)}
                <ChevronDown className="h-5 w-5 flex-shrink-0 text-neutral-400 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className={`pb-5 text-sm leading-relaxed ${TEXT_BODY}`}>{t(`faq.${key}A`)}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  const { t } = useTranslation('landing');
  return (
    <section className={SECTION}>
      <div data-reveal className={WIDTH}>
        <div id="final-cta" className="relative overflow-hidden rounded-3xl bg-primary-500 px-6 py-12 text-center text-white shadow-soft-md sm:px-12 sm:py-16">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/10" />
          <h2 className="relative text-2xl font-bold tracking-tight sm:text-3xl">{t('cta.title', "Keep your family's papers safe, starting today")}</h2>
          <p className="relative mx-auto mt-3 max-w-xl text-base text-white/90 sm:text-lg">
            {t('cta.text', 'It takes a minute to set up. Add your first document now.')}
          </p>
          <Button
            as={Link}
            to="/signup"
            variant="bare"
            rightIcon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
            weight="semibold"
            className="relative mt-8 w-full bg-white text-primary-600 shadow-soft-sm hover:bg-primary-50 sm:w-auto"
          >
            {t('cta.start', 'Create your family vault')}
          </Button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const { t } = useTranslation('landing');
  return (
    <footer className="border-t border-neutral-200 dark:border-neutral-800">
      <div className={`${WIDTH} flex flex-col items-center gap-4 pb-24 pt-8 text-center sm:flex-row sm:justify-between sm:py-8 sm:text-left`}>
        <div>
          <BrandMark />
          <p className={`mt-2 text-sm ${TEXT_MUTED}`}>{t('footer.tagline', "Your family's important papers, safe and always at hand.")}</p>
        </div>
        <div className={`flex flex-col items-center gap-2 text-sm sm:items-end ${TEXT_MUTED}`}>
          <div className="flex gap-4">
            <Link to="/login" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
              {t('footer.login', 'Log in')}
            </Link>
            <Link to="/signup" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
              {t('footer.signup', 'Create an account')}
            </Link>
          </div>
          <p>{t('footer.rights', '© {{year}} Family Vault', { year: new Date().getFullYear() })}</p>
        </div>
      </div>
    </footer>
  );
}

export default function Landing() {
  // The search title belongs to this page only; the app's other pages are just "Family Vault".
  // Sections below the first screen fade up gently as they scroll into view. Only those (nothing
  // already on screen ever blinks), only after the app has started (the pre-rendered page and
  // crawlers see everything), and never for people who asked their phone for less motion.
  useEffect(() => {
    if (!('IntersectionObserver' in window) || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const below = [...document.querySelectorAll('#landing-page [data-reveal]')].filter(
      (el) => el.getBoundingClientRect().top > window.innerHeight,
    );
    below.forEach((el) => el.classList.add('reveal-pending'));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.remove('reveal-pending');
          io.unobserve(e.target);
        });
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    below.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Cards marked `data-spotlight` get a soft coral glow right under the mouse (index.css). Only
  // with a mouse; nothing follows the pointer outside a card.
  useEffect(() => {
    if (!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return undefined;
    const root = document.getElementById('landing-page');
    if (!root) return undefined;
    const onMove = (e) => {
      const card = e.target.closest?.('[data-spotlight]');
      if (!card) return;
      const box = card.getBoundingClientRect();
      card.style.setProperty('--spot-x', `${e.clientX - box.left}px`);
      card.style.setProperty('--spot-y', `${e.clientY - box.top}px`);
    };
    root.addEventListener('pointermove', onMove, { passive: true });
    return () => root.removeEventListener('pointermove', onMove);
  }, []);

  useEffect(() => {
    document.title = SEO_TITLE;
    return () => {
      document.title = APP_TITLE;
    };
  }, []);

  return (
    <div id="landing-page" className="min-h-[100dvh] bg-neutral-50 dark:bg-neutral-950">
      <Header />
      <main>
        <Hero />
        <Why />
        <Moments />
        <Tour />
        <Safety />
        <ShareSection />
        <Steps />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
      <StickyStart />
      <BackToTop />
    </div>
  );
}
