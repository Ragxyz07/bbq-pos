import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register service worker immediately for 100% offline capability
registerSW({
  immediate: true,
  onNeedRefresh() {},
  onOfflineReady() {
    console.log('The BBQ Boxx POS is ready to work 100% offline.');
  },
});

createRoot(document.getElementById('root')!).render(<App />);
