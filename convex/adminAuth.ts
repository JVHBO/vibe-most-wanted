export function requireInternalAdminKey(adminKey: string | undefined): void {
  const expected = process.env.VMW_INTERNAL_SECRET;

  if (!expected) {
    throw new Error("VMW_INTERNAL_SECRET not configured");
  }

  if (!adminKey || adminKey !== expected) {
    throw new Error("Unauthorized");
  }
}
