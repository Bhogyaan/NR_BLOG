import React, { useState } from 'react';
import { Box, useTheme } from '@mui/material';

const Logo = ({ size = 40, ...props }) => {
  const [imgError, setImgError] = useState(false);
  const theme = useTheme();

  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: theme.palette.background.paper,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        fontWeight: 'bold',
        fontSize: size * 0.5,
        color: theme.palette.primary.main,
        ...props.sx,
      }}
      {...props}
    >
      {!imgError ? (
        <img
          src={'/logo.png'}
          alt="NR Blog Logo"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => setImgError(true)}
        />
      ) : (
        'NR'
      )}
    </Box>
  );
};

export default Logo; 