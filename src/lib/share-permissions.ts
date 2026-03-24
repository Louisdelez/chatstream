const LEVELS: Record<string, number> = { view: 0, format: 1, pin: 2, full: 3 };

export function hasPermission(granted: string, required: string): boolean {
  return (LEVELS[granted] ?? 0) >= (LEVELS[required] ?? 999);
}
