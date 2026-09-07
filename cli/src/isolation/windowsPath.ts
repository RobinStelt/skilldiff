/**
 * `cmd.exe`'s `mklink` treats a forward slash anywhere in its arguments as
 * a switch prefix, not a path separator — `mklink /J link C:\...\foo/bar`
 * fails with "Ungültige Option" (invalid option), even though every other
 * Windows API this codebase touches (Node's fs/path, `--skill-source`
 * itself) accepts forward slashes just fine. Real bug, found running an
 * actual comparison with a forward-slash `--skill-source` (gating.ts's
 * `createJunction`) — shared here so linkCapability.ts's junction probe
 * stays defended against the same class of bug even though its own inputs
 * (all `path.join`-built) don't currently trigger it.
 */
export function toWindowsPath(value: string): string {
  return value.replace(/\//g, "\\");
}
