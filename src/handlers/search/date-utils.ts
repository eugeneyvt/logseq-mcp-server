/**
 * Parse date query strings into date filter objects
 */
export function parseDateQuery(dateQuery: string): { matches: (date: Date) => boolean } | null {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (dateQuery.toLowerCase()) {
    case 'today':
      return {
        matches: (date: Date) => {
          const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          return checkDate.getTime() === today.getTime();
        },
      };

    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        matches: (date: Date) => {
          const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          return checkDate.getTime() === yesterday.getTime();
        },
      };
    }

    case 'last-week':
    case 'last week': {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return {
        matches: (date: Date) => {
          const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          return checkDate >= weekAgo && checkDate <= today;
        },
      };
    }

    case 'last-month':
    case 'last month': {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return {
        matches: (date: Date) => {
          const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          return checkDate >= monthAgo && checkDate <= today;
        },
      };
    }

    default: {
      // Try to parse as specific date (YYYY-MM-DD format)
      const dateMatch = dateQuery.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (dateMatch) {
        const [, year, month, day] = dateMatch;
        const targetDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return {
          matches: (date: Date) => {
            const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            return checkDate.getTime() === targetDate.getTime();
          },
        };
      }

      return null;
    }
  }
}

/**
 * Parse Logseq journal date format (usually YYYYMMDD number)
 */
export function parseLogseqDate(journalDay: number | string): Date | null {
  try {
    const dayStr = String(journalDay);
    if (dayStr.length === 8) {
      const year = parseInt(dayStr.substring(0, 4));
      const month = parseInt(dayStr.substring(4, 6)) - 1; // Month is 0-indexed
      const day = parseInt(dayStr.substring(6, 8));
      const date = new Date(year, month, day);
      return isNaN(date.getTime()) ? null : date;
    }
  } catch (error) {
    return null;
  }
  return null;
}

/**
 * Check if a string looks like a date
 */
export function isDateLike(value: string): boolean {
  // Check for common date formats
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
    /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, // ISO datetime
  ];

  return datePatterns.some((pattern) => pattern.test(value));
}
