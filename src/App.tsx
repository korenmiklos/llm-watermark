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
  const link = (active: boolean) => (active ? 'text-accent' : 'text-grey hover:text-accent');
  return (
    <div className='flex min-h-screen flex-col'>
      <header className='mx-auto flex w-full max-w-3xl items-center justify-between px-5 pt-6'>
        <a href='#/' className='flex items-center gap-3'>
          <img src='/assets/mark.svg' alt='' width={34} height={40} />
          <span className='text-[20px] font-bold leading-none text-navy'>
            watermark<span className='text-accent'>.how</span>
          </span>
        </a>
        <nav className='flex gap-5 font-mono text-xs'>
          <a href='#/' className={link(!isExplainer)}>demo</a>
          <a href='#/explainer' className={link(isExplainer)}>explainer</a>
        </nav>
      </header>
      <main className='w-full flex-1 px-5 py-10'>{isExplainer ? <Explainer /> : <Demo />}</main>
      <footer className='mx-auto w-full max-w-3xl border-t border-line px-5 py-5'>
        <p className='flex items-center gap-1.5 font-mono text-xs text-ink'>
          <img src='/assets/mark-9x.svg' alt='' width={14} height={16} />
          by The{' '}
          <a href='https://the9x.ac' className='text-accent hover:underline'>9x</a>{' '}
          Academic
        </p>
        <p className='mt-2 text-[11px] leading-5 text-grey'>
          Language model built from{' '}
          <a className='underline decoration-line underline-offset-2 hover:text-accent' href='https://huggingface.co/datasets/roneneldan/TinyStories'>
            roneneldan/TinyStories
          </a>{' '}
          (CDLA-Sharing-1.0) · Watermark scheme: Aaronson (2022) · Everything runs in this page — nothing is sent anywhere
        </p>
        <p className='mt-1 text-[11px] leading-5 text-grey'>
          Of course, this is AI-generated: code by Claude Fable 5; text by GPT-5.6 Terra.
        </p>
      </footer>
    </div>
  );
}
