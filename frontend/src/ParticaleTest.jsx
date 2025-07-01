import React, { useCallback } from 'react';
import Particles from '@tsparticles/react';
import { loadFull } from 'tsparticles';
import { useTheme } from '@mui/material';

const ParticleTest = () => {
  const theme = useTheme();
  const particlesInit = useCallback(async (engine) => {
    await loadFull(engine);
  }, []);

  // Use theme colors
  const bgColor = theme.palette.background.default;
  const particleColors = [theme.palette.primary.main, theme.palette.secondary.main, theme.palette.text.secondary];
  const lineColor = theme.palette.text.secondary;

  const particlesOptions = {
    fullScreen: { enable: true, zIndex: -1 },
    background: {
      color: bgColor,
    },
    particles: {
      number: {
        value: 80,
        density: { enable: true, value_area: 800 },
      },
      color: { value: particleColors },
      shape: { type: 'circle' },
      opacity: {
        value: 0.5,
        random: true,
      },
      size: {
        value: 3,
        random: true,
      },
      line_linked: {
        enable: true,
        distance: 150,
        color: lineColor,
        opacity: 0.4,
        width: 1,
      },
      move: {
        enable: true,
        speed: 1,
        direction: 'none',
        out_mode: 'out',
      },
    },
    interactivity: {
      events: {
        onhover: { enable: true, mode: 'grab' },
        onclick: { enable: true, mode: 'push' },
        resize: true,
      },
      modes: {
        grab: { distance: 140, line_linked: { opacity: 1 } },
        push: { particles_nb: 4 },
      },
    },
    retina_detect: true,
  };

  return (
    <Particles
      id="tsparticles"
      init={particlesInit}
      options={particlesOptions}
      style={{ position: 'absolute', top: 0, left: 0 }}
    />
  );
};

export default ParticleTest;
