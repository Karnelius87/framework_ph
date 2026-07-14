export function encodeJson(value: unknown) {
  return JSON.stringify(value ?? null);
}

export function decodeJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== "string") return value as T;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
