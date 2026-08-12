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
  const isExplainer = route === '#/explainer';
  const link = (active: boolean) =>
    `text-sm ${active ? 'text-accent font-semibold' : 'text-ink/70 hover:text-accent'}`;
  return (
    <div className='min-h-screen flex flex-col'>
      <header className='border-b border-ink/10 px-4 py-3 flex items-baseline gap-6'>
        <h1 className='font-heading text-lg font-semibold tracking-tight'>LLM watermarking</h1>
        <nav className='flex gap-4'>
          <a href='#/' className={link(!isExplainer)}>demo</a>
          <a href='#/explainer' className={link(isExplainer)}>explainer</a>
        </nav>
      </header>
      <main className='flex-1 w-full max-w-6xl mx-auto px-4 py-6'>
        {isExplainer ? <Explainer /> : <Demo />}
      </main>
      <footer className='border-t border-ink/10 px-4 py-3 text-xs text-ink/60'>
        Trigram model built from{' '}
        <a className='text-accent underline' href='https://huggingface.co/datasets/roneneldan/TinyStories'>
          roneneldan/TinyStories
        </a>{' '}
        (CDLA-Sharing-1.0). Watermark scheme: Aaronson (2022).
      </footer>
    </div>
  );
}
