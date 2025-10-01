import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#2563eb' },
    secondary: { main: '#7c3aed' },
    background: { default: '#ffffff' },
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily: [
      'Inter',
      'ui-sans-serif',
      'system-ui',
      'Segoe UI',
      'Roboto',
      'Noto Sans',
      'Helvetica Neue',
      'Arial',
      'sans-serif',
    ].join(','),
  },
})


