const HECTARES_PER_ACRE = 0.40468564224;

export function hectaresToAcres(hectares: number): number {
  return hectares / HECTARES_PER_ACRE;
}

export function acresToHectares(acres: number): number {
  return acres * HECTARES_PER_ACRE;
}

export function formatAcres(valueInHectares: number): string {
  if (!Number.isFinite(valueInHectares)) {
    return "—";
  }

  return `${hectaresToAcres(valueInHectares).toLocaleString(
    undefined,
    { maximumFractionDigits: 2 },
  )} acres`;
}
