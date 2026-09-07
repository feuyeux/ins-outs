export function read<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(`river:${key}`);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}
export function save(key: string, value: unknown) {
  try {
    localStorage.setItem(`river:${key}`, JSON.stringify(value));
  } catch {
    /* Private browsing may restrict storage. */
  }
}
