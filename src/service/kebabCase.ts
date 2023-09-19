export function kebabCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .replace(/\s+/g, "-")
    .toLocaleLowerCase();
}
