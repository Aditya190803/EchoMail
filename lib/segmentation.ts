/**
 * Contact Segmentation System
 *
 * Dynamic segments based on contact attributes, behavior, and engagement.
 * Supports complex conditions with AND/OR logic.
 */

/**
 * Segment definition
 */
export interface Segment {
  id: string;
  name: string;
  description?: string;
  type: "static" | "dynamic";
  conditions: SegmentConditionGroup;
  contactCount: number;
  createdAt: Date;
  updatedAt: Date;
  lastCalculatedAt?: Date;
}

/**
 * Condition group with AND/OR logic
 */
export interface SegmentConditionGroup {
  operator: "and" | "or";
  conditions: (SegmentCondition | SegmentConditionGroup)[];
}

/**
 * Individual condition
 */
export interface SegmentCondition {
  field: string;
  operator: ConditionOperator;
  value: ConditionValue;
}

/**
 * Condition operators
 */
export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "greater_than"
  | "less_than"
  | "greater_than_or_equals"
  | "less_than_or_equals"
  | "is_set"
  | "is_not_set"
  | "is_true"
  | "is_false"
  | "in_list"
  | "not_in_list"
  | "before"
  | "after"
  | "within_last"
  | "not_within_last";

/**
 * Condition value types
 */
export type ConditionValue =
  | string
  | number
  | boolean
  | string[]
  | { amount: number; unit: "days" | "weeks" | "months" | "years" };

/**
 * Contact with segmentation-relevant fields
 */
export interface SegmentableContact {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  tags?: string[];
  createdAt: Date;
  lastActivityAt?: Date;
  customFields?: Record<string, unknown>;
  // Engagement metrics
  emailsSent?: number;
  emailsOpened?: number;
  emailsClicked?: number;
  lastOpenedAt?: Date;
  lastClickedAt?: Date;
  // Subscription
  subscribed: boolean;
  subscribedAt?: Date;
  unsubscribedAt?: Date;
}

/**
 * Predefined segment field definitions
 */
export const SEGMENT_FIELDS = {
  // Contact info
  email: { type: "string", label: "Email" },
  firstName: { type: "string", label: "First Name" },
  lastName: { type: "string", label: "Last Name" },
  company: { type: "string", label: "Company" },
  tags: { type: "array", label: "Tags" },

  // Dates
  createdAt: { type: "date", label: "Created Date" },
  lastActivityAt: { type: "date", label: "Last Activity" },
  subscribedAt: { type: "date", label: "Subscribed Date" },
  lastOpenedAt: { type: "date", label: "Last Opened Email" },
  lastClickedAt: { type: "date", label: "Last Clicked Link" },

  // Engagement
  emailsSent: { type: "number", label: "Emails Sent" },
  emailsOpened: { type: "number", label: "Emails Opened" },
  emailsClicked: { type: "number", label: "Links Clicked" },
  openRate: { type: "number", label: "Open Rate (%)" },
  clickRate: { type: "number", label: "Click Rate (%)" },

  // Subscription
  subscribed: { type: "boolean", label: "Is Subscribed" },
} as const;

/**
 * In-memory storage (replace with database)
 */
const segments: Map<string, Segment> = new Map();
const staticMemberships: Map<string, Set<string>> = new Map();

/**
 * Create a new segment
 */
export function createSegment(
  config: Omit<Segment, "id" | "createdAt" | "updatedAt" | "contactCount">,
): Segment {
  const segment: Segment = {
    ...config,
    id: generateSegmentId(),
    contactCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  segments.set(segment.id, segment);

  if (segment.type === "static") {
    staticMemberships.set(segment.id, new Set());
  }

  return segment;
}

/**
 * Evaluate if a contact matches segment conditions
 */
export function evaluateContact(
  contact: SegmentableContact,
  segment: Segment,
): boolean {
  if (segment.type === "static") {
    const members = staticMemberships.get(segment.id);
    return members?.has(contact.id) || false;
  }

  return evaluateConditionGroup(contact, segment.conditions);
}

/**
 * Evaluate a condition group
 */
function evaluateConditionGroup(
  contact: SegmentableContact,
  group: SegmentConditionGroup,
): boolean {
  if (group.operator === "and") {
    return group.conditions.every((condition) =>
      isConditionGroup(condition)
        ? evaluateConditionGroup(contact, condition)
        : evaluateCondition(contact, condition),
    );
  } else {
    return group.conditions.some((condition) =>
      isConditionGroup(condition)
        ? evaluateConditionGroup(contact, condition)
        : evaluateCondition(contact, condition),
    );
  }
}

/**
 * Type guard for condition group
 */
function isConditionGroup(
  condition: SegmentCondition | SegmentConditionGroup,
): condition is SegmentConditionGroup {
  return "operator" in condition && "conditions" in condition;
}

/**
 * Evaluate a single condition
 */
function evaluateCondition(
  contact: SegmentableContact,
  condition: SegmentCondition,
): boolean {
  const fieldValue = getFieldValue(contact, condition.field);
  const targetValue = condition.value;

  switch (condition.operator) {
    case "equals":
      return fieldValue === targetValue;

    case "not_equals":
      return fieldValue !== targetValue;

    case "contains":
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(targetValue as string);
      }
      return String(fieldValue)
        .toLowerCase()
        .includes(String(targetValue).toLowerCase());

    case "not_contains":
      if (Array.isArray(fieldValue)) {
        return !fieldValue.includes(targetValue as string);
      }
      return !String(fieldValue)
        .toLowerCase()
        .includes(String(targetValue).toLowerCase());

    case "starts_with":
      return String(fieldValue)
        .toLowerCase()
        .startsWith(String(targetValue).toLowerCase());

    case "ends_with":
      return String(fieldValue)
        .toLowerCase()
        .endsWith(String(targetValue).toLowerCase());

    case "greater_than":
      return Number(fieldValue) > Number(targetValue);

    case "less_than":
      return Number(fieldValue) < Number(targetValue);

    case "greater_than_or_equals":
      return Number(fieldValue) >= Number(targetValue);

    case "less_than_or_equals":
      return Number(fieldValue) <= Number(targetValue);

    case "is_set":
      return (
        fieldValue !== undefined && fieldValue !== null && fieldValue !== ""
      );

    case "is_not_set":
      return (
        fieldValue === undefined || fieldValue === null || fieldValue === ""
      );

    case "is_true":
      return fieldValue === true;

    case "is_false":
      return fieldValue === false;

    case "in_list":
      if (Array.isArray(targetValue)) {
        return targetValue.includes(fieldValue as string);
      }
      return false;

    case "not_in_list":
      if (Array.isArray(targetValue)) {
        return !targetValue.includes(fieldValue as string);
      }
      return true;

    case "before":
      return new Date(fieldValue as string) < new Date(targetValue as string);

    case "after":
      return new Date(fieldValue as string) > new Date(targetValue as string);

    case "within_last":
      if (typeof targetValue === "object" && "amount" in targetValue) {
        const date = new Date(fieldValue as string);
        const threshold = getDateThreshold(targetValue);
        return date >= threshold;
      }
      return false;

    case "not_within_last":
      if (typeof targetValue === "object" && "amount" in targetValue) {
        const date = new Date(fieldValue as string);
        const threshold = getDateThreshold(targetValue);
        return date < threshold;
      }
      return false;

    default:
      return false;
  }
}

/**
 * Get field value from contact
 */
function getFieldValue(contact: SegmentableContact, field: string): unknown {
  // Handle computed fields
  if (field === "openRate") {
    if (!contact.emailsSent || contact.emailsSent === 0) {
      return 0;
    }
    return ((contact.emailsOpened || 0) / contact.emailsSent) * 100;
  }

  if (field === "clickRate") {
    if (!contact.emailsSent || contact.emailsSent === 0) {
      return 0;
    }
    return ((contact.emailsClicked || 0) / contact.emailsSent) * 100;
  }

  // Handle nested custom fields
  if (field.startsWith("customFields.")) {
    const customField = field.replace("customFields.", "");
    return contact.customFields?.[customField];
  }

  // Direct field access
  return contact[field as keyof SegmentableContact];
}

/**
 * Calculate date threshold
 */
function getDateThreshold(value: {
  amount: number;
  unit: "days" | "weeks" | "months" | "years";
}): Date {
  const now = new Date();

  switch (value.unit) {
    case "days":
      now.setDate(now.getDate() - value.amount);
      break;
    case "weeks":
      now.setDate(now.getDate() - value.amount * 7);
      break;
    case "months":
      now.setMonth(now.getMonth() - value.amount);
      break;
    case "years":
      now.setFullYear(now.getFullYear() - value.amount);
      break;
  }

  return now;
}

/**
 * Get contacts matching a segment
 */
export function getSegmentContacts(
  segmentId: string,
  allContacts: SegmentableContact[],
): SegmentableContact[] {
  const segment = segments.get(segmentId);
  if (!segment) {
    return [];
  }

  return allContacts.filter((contact) => evaluateContact(contact, segment));
}

/**
 * Calculate segment size
 */
export function calculateSegmentSize(
  segmentId: string,
  allContacts: SegmentableContact[],
): number {
  const segment = segments.get(segmentId);
  if (!segment) {
    return 0;
  }

  const matchingContacts = getSegmentContacts(segmentId, allContacts);

  // Update cached count
  segment.contactCount = matchingContacts.length;
  segment.lastCalculatedAt = new Date();

  return matchingContacts.length;
}

/**
 * Add contact to static segment
 */
export function addToStaticSegment(
  segmentId: string,
  contactId: string,
): boolean {
  const segment = segments.get(segmentId);
  if (!segment || segment.type !== "static") {
    return false;
  }

  const members = staticMemberships.get(segmentId);
  if (!members) {
    return false;
  }

  members.add(contactId);
  segment.contactCount = members.size;

  return true;
}

/**
 * Remove contact from static segment
 */
export function removeFromStaticSegment(
  segmentId: string,
  contactId: string,
): boolean {
  const segment = segments.get(segmentId);
  if (!segment || segment.type !== "static") {
    return false;
  }

  const members = staticMemberships.get(segmentId);
  if (!members) {
    return false;
  }

  const removed = members.delete(contactId);
  segment.contactCount = members.size;

  return removed;
}

/**
 * Get all segments
 */
export function listSegments(): Segment[] {
  return Array.from(segments.values());
}

/**
 * Get segment by ID
 */
export function getSegment(id: string): Segment | undefined {
  return segments.get(id);
}

/**
 * Update a segment
 */
export function updateSegment(
  id: string,
  updates: Partial<Omit<Segment, "id" | "createdAt">>,
): Segment | null {
  const segment = segments.get(id);
  if (!segment) {
    return null;
  }

  Object.assign(segment, updates, { updatedAt: new Date() });

  return segment;
}

/**
 * Delete a segment
 */
export function deleteSegment(id: string): boolean {
  const segment = segments.get(id);
  if (!segment) {
    return false;
  }

  segments.delete(id);
  staticMemberships.delete(id);

  return true;
}

/**
 * Generate segment ID
 */
function generateSegmentId(): string {
  return `seg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Predefined segment templates
 */
export const SEGMENT_TEMPLATES = {
  engagedSubscribers: (): Omit<
    Segment,
    "id" | "createdAt" | "updatedAt" | "contactCount"
  > => ({
    name: "Engaged Subscribers",
    description: "Contacts who opened or clicked emails in the last 30 days",
    type: "dynamic",
    conditions: {
      operator: "and",
      conditions: [
        { field: "subscribed", operator: "is_true", value: true },
        {
          operator: "or",
          conditions: [
            {
              field: "lastOpenedAt",
              operator: "within_last",
              value: { amount: 30, unit: "days" },
            },
            {
              field: "lastClickedAt",
              operator: "within_last",
              value: { amount: 30, unit: "days" },
            },
          ],
        },
      ],
    },
  }),

  inactiveSubscribers: (): Omit<
    Segment,
    "id" | "createdAt" | "updatedAt" | "contactCount"
  > => ({
    name: "Inactive Subscribers",
    description: "Contacts who haven't engaged in the last 90 days",
    type: "dynamic",
    conditions: {
      operator: "and",
      conditions: [
        { field: "subscribed", operator: "is_true", value: true },
        {
          field: "lastOpenedAt",
          operator: "not_within_last",
          value: { amount: 90, unit: "days" },
        },
        {
          field: "lastClickedAt",
          operator: "not_within_last",
          value: { amount: 90, unit: "days" },
        },
      ],
    },
  }),

  newSubscribers: (): Omit<
    Segment,
    "id" | "createdAt" | "updatedAt" | "contactCount"
  > => ({
    name: "New Subscribers",
    description: "Contacts who subscribed in the last 7 days",
    type: "dynamic",
    conditions: {
      operator: "and",
      conditions: [
        { field: "subscribed", operator: "is_true", value: true },
        {
          field: "subscribedAt",
          operator: "within_last",
          value: { amount: 7, unit: "days" },
        },
      ],
    },
  }),

  highEngagement: (): Omit<
    Segment,
    "id" | "createdAt" | "updatedAt" | "contactCount"
  > => ({
    name: "High Engagement",
    description: "Contacts with open rate above 50%",
    type: "dynamic",
    conditions: {
      operator: "and",
      conditions: [
        { field: "subscribed", operator: "is_true", value: true },
        { field: "emailsSent", operator: "greater_than", value: 5 },
        { field: "openRate", operator: "greater_than", value: 50 },
      ],
    },
  }),

  atRisk: (): Omit<
    Segment,
    "id" | "createdAt" | "updatedAt" | "contactCount"
  > => ({
    name: "At Risk",
    description: "Engaged contacts showing declining activity",
    type: "dynamic",
    conditions: {
      operator: "and",
      conditions: [
        { field: "subscribed", operator: "is_true", value: true },
        { field: "emailsSent", operator: "greater_than", value: 10 },
        { field: "openRate", operator: "less_than", value: 20 },
        {
          field: "lastOpenedAt",
          operator: "within_last",
          value: { amount: 60, unit: "days" },
        },
      ],
    },
  }),
};

/**
 * Create segment from template
 */
export function createSegmentFromTemplate(
  templateName: keyof typeof SEGMENT_TEMPLATES,
): Segment {
  const template = SEGMENT_TEMPLATES[templateName];
  return createSegment(template());
}
