import { useEffect } from 'react';
import { useProgress } from '@react-three/drei';
import { useStore } from '../store/useStore';

export function Loader() {
  const { progress, active } = useProgress();
  const setLoaded = useStore((s) => s.setLoaded);
  const loaded = useStore((s) => s.loaded);

  useEffect(() => {
    const bar = document.getElementById('loaderProgress');
    const percent = document.getElementById('loaderPercent');
    const status = document.getElementById('loaderStatus');
    const loader = document.getElementById('loader');

    if (bar) bar.style.width = progress + '%';
    if (percent) percent.textContent = Math.round(progress) + '%';
    if (status) {
      if (progress < 30) status.textContent = 'Lighting the fires...';
      else if (progress < 60) status.textContent = 'Setting the tables...';
      else if (progress < 90) status.textContent = 'Pouring the wine...';
      else status.textContent = 'Almost ready...';
    }
  }, [progress]);

  useEffect(() => {
    if (loaded) return;
    const finish = () => {
      const loader = document.getElementById('loader');
      if (loader) loader.classList.add('done');
      setLoaded(true);
    };
    if (!active && progress >= 100) {
      const t = setTimeout(finish, 800);
      return () => clearTimeout(t);
    }
    // Fallback: nothing is loading (all assets inline) — finish shortly after mount
    const t = setTimeout(() => {
      if (!useStore.getState().loaded) finish();
    }, 2200);
    return () => clearTimeout(t);
  }, [progress, active, setLoaded, loaded]);

  return null;
}
