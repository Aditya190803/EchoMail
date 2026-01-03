/**
 * Drip Campaign System
 *
 * Automated email sequences triggered by events or schedules.
 * Supports time-based delays, conditions, and branching logic.
 */

import { logger } from "./logger";

/**
 * Drip campaign definition
 */
export interface DripCampaign {
  id: string;
  name: string;
  description?: string;
  trigger: DripTrigger;
  steps: DripStep[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  settings: DripSettings;
  stats: DripStats;
}

/**
 * Campaign trigger types
 */
export type DripTrigger =
  | { type: "signup"; source?: string }
  | { type: "tag_added"; tagId: string }
  | { type: "purchase"; productId?: string }
  | { type: "form_submission"; formId: string }
  | { type: "date_based"; dateField: string } // e.g., birthday, anniversary
  | { type: "manual" }
  | { type: "segment_entry"; segmentId: string };

/**
 * Individual step in a drip sequence
 */
export interface DripStep {
  id: string;
  order: number;
  name: string;
  type: DripStepType;
  delay: DripDelay;
  conditions?: DripCondition[];
  templateId?: string;
  subject?: string;
  content?: string;
  isActive: boolean;
  stats: StepStats;
}

/**
 * Step types
 */
export type DripStepType =
  | "email"
  | "wait"
  | "condition"
  | "tag_add"
  | "tag_remove"
  | "update_field"
  | "notify_team"
  | "webhook";

/**
 * Delay configuration
 */
export interface DripDelay {
  value: number;
  unit: "minutes" | "hours" | "days" | "weeks";
  sendAt?: string; // Specific time, e.g., "09:00"
  timezone?: string;
  businessDaysOnly?: boolean;
}

/**
 * Condition for branching
 */
export interface DripCondition {
  field: string;
  operator:
    | "equals"
    | "not_equals"
    | "contains"
    | "greater_than"
    | "less_than"
    | "is_set"
    | "is_not_set";
  value?: string | number | boolean;
  action: "continue" | "skip" | "stop" | "goto";
  gotoStepId?: string;
}

/**
 * Campaign settings
 */
export interface DripSettings {
  sendWindow?: {
    startHour: number;
    endHour: number;
    timezone: string;
  };
  limitPerDay?: number;
  excludeWeekends?: boolean;
  stopOnUnsubscribe: boolean;
  stopOnBounce: boolean;
  stopOnReply?: boolean;
  allowReentry: boolean;
  reentryDelay?: number; // Days before contact can re-enter
}

/**
 * Campaign statistics
 */
export interface DripStats {
  totalEnrolled: number;
  active: number;
  completed: number;
  stopped: number;
  totalEmailsSent: number;
  totalOpens: number;
  totalClicks: number;
  totalUnsubscribes: number;
}

/**
 * Step statistics
 */
export interface StepStats {
  sent: number;
  opens: number;
  clicks: number;
  bounces: number;
  unsubscribes: number;
}

/**
 * Contact enrollment record
 */
export interface DripEnrollment {
  id: string;
  campaignId: string;
  contactId: string;
  contactEmail: string;
  status: "active" | "paused" | "completed" | "stopped" | "failed";
  currentStepId: string | null;
  nextStepScheduledAt: Date | null;
  enrolledAt: Date;
  completedAt: Date | null;
  stoppedReason?: string;
  stepHistory: StepExecution[];
}

/**
 * Step execution record
 */
export interface StepExecution {
  stepId: string;
  status: "pending" | "sent" | "skipped" | "failed";
  scheduledAt: Date;
  executedAt?: Date;
  error?: string;
  emailId?: string;
}

/**
 * In-memory storage (replace with database in production)
 */
const campaigns: Map<string, DripCampaign> = new Map();
const enrollments: Map<string, DripEnrollment> = new Map();
const scheduledSteps: Map<string, NodeJS.Timeout> = new Map();

/**
 * Create a new drip campaign
 */
export function createDripCampaign(
  config: Omit<DripCampaign, "id" | "createdAt" | "updatedAt" | "stats">,
): DripCampaign {
  const campaign: DripCampaign = {
    ...config,
    id: generateId("drip"),
    createdAt: new Date(),
    updatedAt: new Date(),
    stats: {
      totalEnrolled: 0,
      active: 0,
      completed: 0,
      stopped: 0,
      totalEmailsSent: 0,
      totalOpens: 0,
      totalClicks: 0,
      totalUnsubscribes: 0,
    },
  };

  campaigns.set(campaign.id, campaign);
  logger.info("Drip campaign created", {
    id: campaign.id,
    name: campaign.name,
  });

  return campaign;
}

/**
 * Enroll a contact in a drip campaign
 */
export function enrollContact(
  campaignId: string,
  contact: { id: string; email: string; data?: Record<string, unknown> },
): DripEnrollment | null {
  const campaign = campaigns.get(campaignId);
  if (!campaign || !campaign.isActive) {
    logger.warn("Cannot enroll: campaign not found or inactive", {
      campaignId,
    });
    return null;
  }

  // Check if already enrolled
  const existingEnrollment = findEnrollment(campaignId, contact.id);
  if (existingEnrollment) {
    if (existingEnrollment.status === "active") {
      logger.debug("Contact already enrolled", {
        campaignId,
        contactId: contact.id,
      });
      return existingEnrollment;
    }

    // Check reentry policy
    if (!campaign.settings.allowReentry) {
      logger.debug("Reentry not allowed", {
        campaignId,
        contactId: contact.id,
      });
      return null;
    }

    if (campaign.settings.reentryDelay && existingEnrollment.completedAt) {
      const daysSinceCompletion =
        (Date.now() - existingEnrollment.completedAt.getTime()) /
        (1000 * 60 * 60 * 24);
      if (daysSinceCompletion < campaign.settings.reentryDelay) {
        logger.debug("Reentry delay not met", {
          campaignId,
          contactId: contact.id,
        });
        return null;
      }
    }
  }

  // Get first step
  const firstStep = campaign.steps.find((s) => s.order === 1 && s.isActive);
  if (!firstStep) {
    logger.warn("No active first step", { campaignId });
    return null;
  }

  // Calculate first step execution time
  const nextStepTime = calculateNextStepTime(firstStep.delay);

  const enrollment: DripEnrollment = {
    id: generateId("enroll"),
    campaignId,
    contactId: contact.id,
    contactEmail: contact.email,
    status: "active",
    currentStepId: firstStep.id,
    nextStepScheduledAt: nextStepTime,
    enrolledAt: new Date(),
    completedAt: null,
    stepHistory: [],
  };

  enrollments.set(enrollment.id, enrollment);

  // Update campaign stats
  campaign.stats.totalEnrolled++;
  campaign.stats.active++;

  // Schedule first step
  scheduleStepExecution(enrollment, firstStep);

  logger.info("Contact enrolled in drip campaign", {
    campaignId,
    contactId: contact.id,
    nextStep: firstStep.name,
    scheduledAt: nextStepTime,
  });

  return enrollment;
}

/**
 * Execute a scheduled step
 */
async function _executeStep(
  enrollment: DripEnrollment,
  step: DripStep,
  sendEmail: (params: {
    to: string;
    subject: string;
    content: string;
    templateId?: string;
  }) => Promise<{ success: boolean; messageId?: string; error?: string }>,
): Promise<void> {
  const campaign = campaigns.get(enrollment.campaignId);
  if (!campaign) {
    return;
  }

  // Check conditions
  if (step.conditions && step.conditions.length > 0) {
    // In real implementation, evaluate conditions against contact data
    const shouldSkip = false; // Placeholder
    if (shouldSkip) {
      recordStepExecution(enrollment, step.id, "skipped");
      advanceToNextStep(enrollment, campaign);
      return;
    }
  }

  try {
    switch (step.type) {
      case "email":
        const result = await sendEmail({
          to: enrollment.contactEmail,
          subject: step.subject || "",
          content: step.content || "",
          templateId: step.templateId,
        });

        if (result.success) {
          recordStepExecution(enrollment, step.id, "sent", result.messageId);
          campaign.stats.totalEmailsSent++;
          step.stats.sent++;
        } else {
          recordStepExecution(
            enrollment,
            step.id,
            "failed",
            undefined,
            result.error,
          );
        }
        break;

      case "wait":
        // Just advance after delay
        recordStepExecution(enrollment, step.id, "sent");
        break;

      case "tag_add":
      case "tag_remove":
      case "update_field":
        // In real implementation, update contact
        recordStepExecution(enrollment, step.id, "sent");
        break;

      case "notify_team":
        // Send notification to team
        logger.info("Team notification", {
          enrollmentId: enrollment.id,
          contact: enrollment.contactEmail,
        });
        recordStepExecution(enrollment, step.id, "sent");
        break;

      case "webhook":
        // Call external webhook
        recordStepExecution(enrollment, step.id, "sent");
        break;
    }

    // Advance to next step
    advanceToNextStep(enrollment, campaign);
  } catch (error) {
    recordStepExecution(
      enrollment,
      step.id,
      "failed",
      undefined,
      String(error),
    );
    logger.error("Step execution failed", {
      enrollmentId: enrollment.id,
      stepId: step.id,
      error,
    });
  }
}

/**
 * Advance enrollment to next step
 */
function advanceToNextStep(
  enrollment: DripEnrollment,
  campaign: DripCampaign,
): void {
  const currentStepIndex = campaign.steps.findIndex(
    (s) => s.id === enrollment.currentStepId,
  );

  // Find next active step
  let nextStep: DripStep | undefined;
  for (let i = currentStepIndex + 1; i < campaign.steps.length; i++) {
    if (campaign.steps[i].isActive) {
      nextStep = campaign.steps[i];
      break;
    }
  }

  if (!nextStep) {
    // Campaign completed
    enrollment.status = "completed";
    enrollment.completedAt = new Date();
    enrollment.currentStepId = null;
    enrollment.nextStepScheduledAt = null;

    campaign.stats.active--;
    campaign.stats.completed++;

    logger.info("Contact completed drip campaign", {
      campaignId: campaign.id,
      contactId: enrollment.contactId,
    });
    return;
  }

  // Schedule next step
  enrollment.currentStepId = nextStep.id;
  enrollment.nextStepScheduledAt = calculateNextStepTime(nextStep.delay);

  scheduleStepExecution(enrollment, nextStep);
}

/**
 * Schedule step execution
 */
function scheduleStepExecution(
  enrollment: DripEnrollment,
  step: DripStep,
): void {
  const delay = calculateDelayMs(step.delay);

  // Clear any existing timeout
  const existingTimeout = scheduledSteps.get(`${enrollment.id}_${step.id}`);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  // For demo purposes, using setTimeout
  // In production, use a job queue like BullMQ or database-backed scheduler
  const timeout = setTimeout(() => {
    // In real implementation, fetch contact data and execute
    // executeStep(enrollment, step, sendEmailFn);
    logger.info("Step due for execution", {
      enrollmentId: enrollment.id,
      stepId: step.id,
      stepName: step.name,
    });
  }, delay);

  scheduledSteps.set(`${enrollment.id}_${step.id}`, timeout);
}

/**
 * Stop a contact's enrollment
 */
export function stopEnrollment(enrollmentId: string, reason: string): boolean {
  const enrollment = enrollments.get(enrollmentId);
  if (!enrollment || enrollment.status !== "active") {
    return false;
  }

  enrollment.status = "stopped";
  enrollment.stoppedReason = reason;
  enrollment.nextStepScheduledAt = null;

  // Clear scheduled timeout
  const timeoutKey = `${enrollment.id}_${enrollment.currentStepId}`;
  const timeout = scheduledSteps.get(timeoutKey);
  if (timeout) {
    clearTimeout(timeout);
    scheduledSteps.delete(timeoutKey);
  }

  // Update campaign stats
  const campaign = campaigns.get(enrollment.campaignId);
  if (campaign) {
    campaign.stats.active--;
    campaign.stats.stopped++;
  }

  logger.info("Enrollment stopped", {
    enrollmentId,
    reason,
  });

  return true;
}

/**
 * Pause an enrollment
 */
export function pauseEnrollment(enrollmentId: string): boolean {
  const enrollment = enrollments.get(enrollmentId);
  if (!enrollment || enrollment.status !== "active") {
    return false;
  }

  enrollment.status = "paused";

  // Clear scheduled timeout but keep the scheduled time
  const timeoutKey = `${enrollment.id}_${enrollment.currentStepId}`;
  const timeout = scheduledSteps.get(timeoutKey);
  if (timeout) {
    clearTimeout(timeout);
    scheduledSteps.delete(timeoutKey);
  }

  return true;
}

/**
 * Resume a paused enrollment
 */
export function resumeEnrollment(enrollmentId: string): boolean {
  const enrollment = enrollments.get(enrollmentId);
  if (!enrollment || enrollment.status !== "paused") {
    return false;
  }

  enrollment.status = "active";

  // Reschedule current step
  const campaign = campaigns.get(enrollment.campaignId);
  if (campaign && enrollment.currentStepId) {
    const step = campaign.steps.find((s) => s.id === enrollment.currentStepId);
    if (step) {
      scheduleStepExecution(enrollment, step);
    }
  }

  return true;
}

/**
 * Get campaign by ID
 */
export function getDripCampaign(id: string): DripCampaign | undefined {
  return campaigns.get(id);
}

/**
 * Get all campaigns
 */
export function listDripCampaigns(): DripCampaign[] {
  return Array.from(campaigns.values());
}

/**
 * Get enrollments for a campaign
 */
export function getCampaignEnrollments(campaignId: string): DripEnrollment[] {
  return Array.from(enrollments.values()).filter(
    (e) => e.campaignId === campaignId,
  );
}

/**
 * Get contact's enrollments
 */
export function getContactEnrollments(contactId: string): DripEnrollment[] {
  return Array.from(enrollments.values()).filter(
    (e) => e.contactId === contactId,
  );
}

/**
 * Find enrollment
 */
function findEnrollment(
  campaignId: string,
  contactId: string,
): DripEnrollment | undefined {
  return Array.from(enrollments.values()).find(
    (e) => e.campaignId === campaignId && e.contactId === contactId,
  );
}

/**
 * Record step execution
 */
function recordStepExecution(
  enrollment: DripEnrollment,
  stepId: string,
  status: StepExecution["status"],
  emailId?: string,
  error?: string,
): void {
  enrollment.stepHistory.push({
    stepId,
    status,
    scheduledAt: enrollment.nextStepScheduledAt || new Date(),
    executedAt: new Date(),
    emailId,
    error,
  });
}

/**
 * Calculate delay in milliseconds
 */
function calculateDelayMs(delay: DripDelay): number {
  const multipliers = {
    minutes: 60 * 1000,
    hours: 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
    weeks: 7 * 24 * 60 * 60 * 1000,
  };

  return delay.value * multipliers[delay.unit];
}

/**
 * Calculate next step execution time
 */
function calculateNextStepTime(delay: DripDelay): Date {
  const delayMs = calculateDelayMs(delay);
  const nextTime = new Date(Date.now() + delayMs);

  // If specific send time is set, adjust
  if (delay.sendAt) {
    const [hours, minutes] = delay.sendAt.split(":").map(Number);
    nextTime.setHours(hours, minutes, 0, 0);

    // If time has passed for today, move to next day
    if (nextTime.getTime() < Date.now()) {
      nextTime.setDate(nextTime.getDate() + 1);
    }
  }

  // Skip weekends if configured
  if (delay.businessDaysOnly) {
    while (nextTime.getDay() === 0 || nextTime.getDay() === 6) {
      nextTime.setDate(nextTime.getDate() + 1);
    }
  }

  return nextTime;
}

/**
 * Generate unique ID
 */
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Update a drip campaign
 */
export function updateDripCampaign(
  id: string,
  updates: Partial<Omit<DripCampaign, "id" | "createdAt" | "stats">>,
): DripCampaign | null {
  const campaign = campaigns.get(id);
  if (!campaign) {
    return null;
  }

  Object.assign(campaign, updates, { updatedAt: new Date() });

  return campaign;
}

/**
 * Delete a drip campaign
 */
export function deleteDripCampaign(id: string): boolean {
  const campaign = campaigns.get(id);
  if (!campaign) {
    return false;
  }

  // Stop all active enrollments
  const activeEnrollments = getCampaignEnrollments(id).filter(
    (e) => e.status === "active",
  );

  for (const enrollment of activeEnrollments) {
    stopEnrollment(enrollment.id, "Campaign deleted");
  }

  campaigns.delete(id);

  logger.info("Drip campaign deleted", { id, name: campaign.name });

  return true;
}

/**
 * Create welcome series template
 */
export function createWelcomeSeries(): DripCampaign {
  return createDripCampaign({
    name: "Welcome Series",
    description: "Automated welcome emails for new subscribers",
    trigger: { type: "signup" },
    isActive: false,
    settings: {
      stopOnUnsubscribe: true,
      stopOnBounce: true,
      allowReentry: false,
    },
    steps: [
      {
        id: "step_welcome_1",
        order: 1,
        name: "Welcome Email",
        type: "email",
        delay: { value: 0, unit: "minutes" },
        subject: "Welcome to {{company_name}}!",
        isActive: true,
        stats: { sent: 0, opens: 0, clicks: 0, bounces: 0, unsubscribes: 0 },
      },
      {
        id: "step_welcome_2",
        order: 2,
        name: "Getting Started",
        type: "email",
        delay: { value: 2, unit: "days" },
        subject: "Getting started with {{company_name}}",
        isActive: true,
        stats: { sent: 0, opens: 0, clicks: 0, bounces: 0, unsubscribes: 0 },
      },
      {
        id: "step_welcome_3",
        order: 3,
        name: "Tips & Best Practices",
        type: "email",
        delay: { value: 5, unit: "days" },
        subject: "Tips to get the most out of {{company_name}}",
        isActive: true,
        stats: { sent: 0, opens: 0, clicks: 0, bounces: 0, unsubscribes: 0 },
      },
    ],
  });
}
