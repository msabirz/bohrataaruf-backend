export function getDisplayName(alias: string, city?: string): string {
  const includeCity = process.env.NEXT_PUBLIC_ALIAS_INCLUDE_CITY === 'true';
  if (includeCity && city) {
    return `${alias}, ${city}`;
  }
  return alias;
}
