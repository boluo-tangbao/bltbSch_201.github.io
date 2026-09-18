export function assetUrl(path: string) {
  return `${import.meta.env.BASE_URL}${path.split('/').map(encodeURIComponent).join('/')}`
}
