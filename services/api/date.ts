export const toIso = (value: Date): string => value.toISOString();

export const fromIso = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const fromIsoOrNow = (value: string | null | undefined): Date => fromIso(value) ?? new Date();
