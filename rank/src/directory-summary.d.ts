declare module 'virtual:directory-summary' {
  const directories: Record<string, import('./types').ShopDirectory>
  export default directories
}
