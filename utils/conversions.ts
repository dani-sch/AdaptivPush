/**
 * Convert kilograms to pounds
 */
export function kgToLb(kg: number): number {
  return kg * 2.20462;
}

/**
 * Convert pounds to kilograms
 */
export function lbToKg(lb: number): number {
  return lb / 2.20462;
}

/**
 * Parse date from mm/dd/yyyy format to YYYY-MM-DD (ISO format)
 * Returns null if invalid
 */
export function parseDateInput(input: string): string | null {
  const match = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const [, month, day, year] = match;
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  const y = parseInt(year, 10);

  // Basic validation
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900) return null;

  // Pad with zeros
  const monthStr = m.toString().padStart(2, '0');
  const dayStr = d.toString().padStart(2, '0');

  return `${y}-${monthStr}-${dayStr}`;
}

/**
 * Validate age is at least minimum years old
 */
export function isOldEnough(dateOfBirth: string, minAge: number = 13): boolean {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  const age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    return age - 1 >= minAge;
  }
  
  return age >= minAge;
}
