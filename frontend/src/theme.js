// Centralized theme color tokens for dark and light modes

const palette = {
  light: {
    primary: '#6200ea',
    secondary: '#7c4dff',
    background: {
      default: '#f5f5f5',
      paper: 'rgba(255,255,255,0.7)',
    },
    text: {
      primary: '#121212',
      secondary: 'rgba(0,0,0,0.6)',
    },
    accent: '#8515fc',
    border: 'rgba(0,0,0,0.1)',
    logo: '/public/dark-logo.svg', // Example, update as needed
  },
  dark: {
    primary: '#8515fc',
    secondary: '#8b5cf6',
    background: {
      default: '#1a1a1a',
      paper: 'rgba(30,30,30,0.5)',
    },
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255,255,255,0.7)',
    },
    accent: '#8b5cf6',
    border: 'rgba(255,255,255,0.2)',
    logo: '/public/light-logo.svg', // Example, update as needed
  },
};

export function getPalette(mode = 'dark') {
  return palette[mode] || palette.dark;
}

export default palette; 