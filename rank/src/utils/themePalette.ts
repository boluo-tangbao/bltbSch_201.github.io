export type Theme = 'day' | 'night'

export const themePalettes = {
  day: { ink: '#292932', paper: '#fffaf6', accent: '#f37482', header: '#ffe2e8', headerText: '#292932', surface: '#fffdf8', text: '#292932', muted: '#79626b', line: '#e5c5cc', soft: '#fff0f4', accentText: '#9d304a' },
  night: { ink: '#171b1c', paper: '#252e2b', accent: '#d5f34a', header: '#202925', headerText: '#f0f0e9', surface: '#303b35', text: '#e4eadb', muted: '#bdc9b5', line: '#718263', soft: '#414f38', accentText: '#83cfff' },
} as const
