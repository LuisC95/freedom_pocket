export function assertServerRuntime(moduleName: string): void {
  if (typeof window !== 'undefined') {
    throw new Error(`${moduleName} is server-only`)
  }
}
