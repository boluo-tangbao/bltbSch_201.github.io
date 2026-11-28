declare module 'virtual:cover-previews' {
  const previews: Record<string, import('./utils/imageSources').Preview>
  export default previews
}
