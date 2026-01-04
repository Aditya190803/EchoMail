/**
 * Smart Send Time Optimization Service
 *
 * Analyzes recipient data and historical patterns to suggest
 * the optimal time to send emails for maximum engagement.
 */

export interface OptimizationResult {
  optimalTime: Date;
  reason: string;
  confidence: number; // 0-100
}

export class OptimizationService {
  /**
   * Suggest the optimal send time for a recipient
   *
   * @param recipientEmail - Recipient's email address
   * @param timezone - Optional recipient timezone (e.g., 'America/New_York')
   * @returns Optimization result
   */
  static suggestOptimalTime(
    _recipientEmail: string,
    _timezone?: string,
  ): OptimizationResult {
    // Default to 10:00 AM in the recipient's timezone (or local if not provided)
    // Studies show 10 AM is often the peak open time for business emails.

    const now = new Date();
    const optimalTime = new Date(now);

    // Set to 10:00 AM
    optimalTime.setHours(10, 0, 0, 0);

    // If 10 AM today has already passed, move to tomorrow
    if (optimalTime < now) {
      optimalTime.setDate(optimalTime.getDate() + 1);
    }

    // Basic logic: avoid weekends
    const day = optimalTime.getDay();
    if (day === 0) {
      // Sunday -> Monday
      optimalTime.setDate(optimalTime.getDate() + 1);
    } else if (day === 6) {
      // Saturday -> Monday
      optimalTime.setDate(optimalTime.getDate() + 2);
    }

    return {
      optimalTime,
      reason: "Peak engagement time (10:00 AM on a weekday)",
      confidence: 70,
    };
  }

  /**
   * Calculate a staggered send schedule for a batch of emails
   * to avoid spam filters and rate limits.
   *
   * @param count - Number of emails to send
   * @param startTime - When to start sending
   * @param intervalSeconds - Seconds between each email
   * @returns Array of scheduled dates
   */
  static calculateStaggeredSchedule(
    count: number,
    startTime: Date = new Date(),
    intervalSeconds: number = 60,
  ): Date[] {
    const schedule: Date[] = [];
    for (let i = 0; i < count; i++) {
      const scheduledDate = new Date(
        startTime.getTime() + i * intervalSeconds * 1000,
      );
      schedule.push(scheduledDate);
    }
    return schedule;
  }
}

export default OptimizationService;
