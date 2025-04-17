import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { Provider } from 'react-redux';
import { store } from './store';
import { oklch, rgb } from 'culori';


// Function to generate shades from --primary
function generateShades() {
  // Get the base color from CSS variable
  const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();

  // Convert to OKLCH
  let l, c, h;
  if (primary.startsWith('oklch')) {
    [l, c, h] = primary.match(/oklch\(([^)]+)\)/)[1].split(' ').map(Number);
  } else {
    const baseColor = oklch(rgb(primary));
    l = baseColor.l;
    c = baseColor.c;
    h = baseColor.h;
  }

  // Define shade steps (inspired by Tailwind/emerald progression)
  const shades = {
    50: Math.min(0.98, l + 0.283),  // Very light
    100: Math.min(0.95, l + 0.254),
    200: Math.min(0.90, l + 0.209),
    300: Math.min(0.85, l + 0.149),
    400: Math.min(0.77, l + 0.069),
    500: l,                         // Base color
    600: Math.max(0.60, l - 0.1),
    700: Math.max(0.50, l - 0.188),
    800: Math.max(0.43, l - 0.264),
    900: Math.max(0.38, l - 0.318),
    950: Math.max(0.26, l - 0.434), // Very dark
  };

  // Set CSS variables for each shade
  for (const [key, lightness] of Object.entries(shades)) {
    const color = `oklch(${lightness} ${c} ${h})`;
    document.documentElement.style.setProperty(`--primary-${key}`, color);
  }
}

// Generate shades on load
document.addEventListener('DOMContentLoaded', generateShades);

createRoot(document.getElementById('root')).render(

  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)
