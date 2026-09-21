import { useEffect } from 'react';
import { useStore } from '../store/useStore';

export function Gyroscope() {
  const enableGyro = useStore((s) => s.enableGyro);

  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile) return;

    const prompt = document.getElementById('gyroPrompt');
    if (!prompt) return;

    const timer = setTimeout(() => {
      if (typeof DeviceOrientationEvent !== 'undefined' &&
          typeof DeviceOrientationEvent.requestPermission === 'function') {
        prompt.hidden = false;
      } else {
        enableGyro();
      }
    }, 3000);

    const handleEnable = async () => {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission === 'granted') enableGyro();
      } catch (e) {
        console.log('Gyro permission denied');
      }
      prompt.hidden = true;
    };
    const handleSkip = () => { prompt.hidden = true; };

    document.getElementById('enableGyro')?.addEventListener('click', handleEnable);
    document.getElementById('skipGyro')?.addEventListener('click', handleSkip);

    return () => {
      clearTimeout(timer);
      document.getElementById('enableGyro')?.removeEventListener('click', handleEnable);
      document.getElementById('skipGyro')?.removeEventListener('click', handleSkip);
    };
  }, [enableGyro]);

  return null;
}
