import { useEffect, useState } from 'react';
import Demo from './pages/Demo';
import Explainer from './pages/Explainer';

function useHashRoute(): string {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

export default function App() {
  const route = useHashRoute();
  const isExplainer = route.startsWith('#/explainer');
  const section = isExplainer ? route.replace('#/explainer', '').replace('/', '') : null;

  useEffect(() => {
    if (section) {
      setTimeout(() => document.getElementById(section)?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [section]);
  const link = (active: boolean) => (active ? 'text-accent' : 'text-ink/50 hover:text-accent');
  return (
    <div className='flex min-h-screen flex-col'>
      <header className='mx-auto flex w-full max-w-3xl items-baseline justify-between px-5 pt-6'>
        <a href='#/' className='font-mono text-xs text-ink/55'>llm-watermark</a>
        <nav className='flex gap-5 text-xs'>
          <a href='#/' className={link(!isExplainer)}>demo</a>
          <a href='#/explainer' className={link(isExplainer)}>explainer</a>
        </nav>
      </header>
      <main className='w-full flex-1 px-5 py-10'>{isExplainer ? <Explainer /> : <Demo />}</main>
      <footer className='mx-auto w-full max-w-3xl border-t border-ink/10 px-5 py-5 text-[11px] leading-5 text-ink/45'>
        Language model built from{' '}
        <a className='underline decoration-ink/25 underline-offset-2 hover:text-accent' href='https://huggingface.co/datasets/roneneldan/TinyStories'>
          roneneldan/TinyStories
        </a>{' '}
        (CDLA-Sharing-1.0) · Watermark scheme: Aaronson (2022) · Everything runs in this page — nothing is sent anywhere.
      </footer>
    </div>
  );
}
