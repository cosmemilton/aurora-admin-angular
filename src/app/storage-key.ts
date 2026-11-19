export function storageKey(key: string) {
  const basePath = new URL(document.baseURI).pathname.replace(/\/+$/, '')
  return basePath ? `${basePath}:${key}` : key
}
