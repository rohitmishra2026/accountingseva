// Tiny classnames helper — joins truthy class strings. Avoids pulling in a dep.
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
