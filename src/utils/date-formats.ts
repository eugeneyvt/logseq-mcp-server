/**
 * Date format utilities for journal page handling
 */

/**
 * Common date formats used by Logseq journals
 */
// Note: This constant is defined but not currently used in the code
// It's kept for future reference and potential use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const JOURNAL_DATE_FORMATS = [
  // Logseq default formats
  'MMM do, yyyy',     // Aug 20th, 2025
  'yyyy-MM-dd',       // 2025-08-20
  'MM/dd/yyyy',       // 08/20/2025
  'dd/MM/yyyy',       // 20/08/2025
  'yyyy/MM/dd',       // 2025/08/20
  'MMMM do, yyyy',    // August 20th, 2025
  'dd-MM-yyyy',       // 20-08-2025
  'MM-dd-yyyy',       // 08-20-2025
] as const;

/**
 * Convert various date formats to the format used by Logseq journals
 */
export function normalizeJournalPageName(input: string): string[] {
  const date = parseDate(input);
  if (!date) {
    return [input]; // Return original if not a date
  }

  return generateJournalPageVariations(date);
}

/**
 * Parse a date string in various formats
 */
function parseDate(input: string): Date | null {
  // Try direct Date parsing first
  const directDate = new Date(input);
  if (!isNaN(directDate.getTime())) {
    return directDate;
  }

  // Try specific patterns
  const patterns = [
    // ISO format: 2025-08-20
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    // US format: 08/20/2025, 8/20/2025
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // EU format: 20/08/2025, 20/8/2025
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // With dashes: 08-20-2025, 20-08-2025
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      const [, part1, part2, part3] = match;
      
      // Try different interpretations
      const attempts = [
        new Date(parseInt(part3), parseInt(part1) - 1, parseInt(part2)), // MM/dd/yyyy
        new Date(parseInt(part3), parseInt(part2) - 1, parseInt(part1)), // dd/MM/yyyy
        new Date(parseInt(part1), parseInt(part2) - 1, parseInt(part3)), // yyyy/MM/dd
      ];

      for (const attempt of attempts) {
        if (!isNaN(attempt.getTime())) {
          return attempt;
        }
      }
    }
  }

  return null;
}

/**
 * Generate all possible journal page name variations for a date
 */
function generateJournalPageVariations(date: Date): string[] {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-based
  const day = date.getDate();

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const monthNamesLong = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper function to get ordinal suffix
  const getOrdinal = (n: number): string => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const dayOrdinal = getOrdinal(day);
  const monthName = monthNames[month];
  const monthNameLong = monthNamesLong[month];
  const dayPad = day.toString().padStart(2, '0');
  const monthPad = (month + 1).toString().padStart(2, '0');

  return [
    // Logseq default format (most likely)
    `${monthName} ${dayOrdinal}, ${year}`,
    
    // Other common formats
    `${monthNameLong} ${dayOrdinal}, ${year}`,
    `${year}-${monthPad}-${dayPad}`,
    `${monthPad}/${dayPad}/${year}`,
    `${dayPad}/${monthPad}/${year}`,
    `${year}/${monthPad}/${dayPad}`,
    `${dayPad}-${monthPad}-${year}`,
    `${monthPad}-${dayPad}-${year}`,
    
    // Variations without ordinals
    `${monthName} ${day}, ${year}`,
    `${monthNameLong} ${day}, ${year}`,
    
    // Short formats
    `${monthPad}/${day}/${year}`,
    `${day}/${monthPad}/${year}`,
    `${monthPad}-${day}-${year}`,
    `${day}-${monthPad}-${year}`,
  ];
}

/**
 * Find the actual journal page name from a list of candidates
 */
export async function findJournalPage(
  candidates: string[],
  searchFn: (name: string) => Promise<boolean>
): Promise<string | null> {
  for (const candidate of candidates) {
    try {
      const exists = await searchFn(candidate);
      if (exists) {
        return candidate;
      }
    } catch (error) {
      // Continue to next candidate
    }
  }
  return null;
}

/**
 * Get today's date in various journal formats
 */
export function getTodayJournalVariations(): string[] {
  return generateJournalPageVariations(new Date());
}

/**
 * Check if a string looks like a date
 */
export function looksLikeDate(input: string): boolean {
  return /\d{4}|\d{1,2}[/-]\d{1,2}|\w{3,9}\s+\d{1,2}/.test(input);
}