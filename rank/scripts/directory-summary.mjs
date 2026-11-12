// Keep operational facts for search, comparison and saved trips. Evidence is
// loaded with the full directory in the detail panel, never duplicated here.
export function directorySummary(directories) {
  return Object.fromEntries(Object.entries(directories).map(([id, directory]) => [id, {
    ...directory,
    shops: directory.shops.map(({ sources, kindSources, ...shop }) => ({ ...shop, sources: [] })),
  }]))
}
