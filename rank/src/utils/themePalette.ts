export type Theme = 'day' | 'night'

export const themePalettes = {
  day: { ink: '#292932', paper: '#fffaf6', accent: '#f37482', header: '#ffe2e8', headerText: '#292932', surface: '#fffdf8', text: '#292932', muted: '#79626b', line: '#e5c5cc', soft: '#fff0f4', accentText: '#9d304a' },
  night: { ink: '#171b1c', paper: '#171e1b', accent: '#d5f34a', header: '#101514', headerText: '#f0f0e9', surface: '#252e28', text: '#e4eadb', muted: '#b5c2aa', line: '#52634b', soft: '#35432d', accentText: '#d5f34a' },
} as const
