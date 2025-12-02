import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "../components/ui/badge";
import { CheckCircle, Clock, XCircle, AlertCircle, Send } from "lucide-react";

/**
 * Badges are small status descriptors for UI elements.
 * They're used to indicate status, count, or category.
 */
const meta: Meta<typeof Badge> = {
  title: "UI/Badge",
  component: Badge,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "destructive", "outline"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

/**
 * Default badge style.
 */
export const Default: Story = {
  args: {
    children: "Badge",
    variant: "default",
  },
};

/**
 * Secondary badge for less prominent labels.
 */
export const Secondary: Story = {
  args: {
    children: "Secondary",
    variant: "secondary",
  },
};

/**
 * Destructive badge for errors or warnings.
 */
export const Destructive: Story = {
  args: {
    children: "Error",
    variant: "destructive",
  },
};

/**
 * Outline badge style.
 */
export const Outline: Story = {
  args: {
    children: "Outline",
    variant: "outline",
  },
};

/**
 * Campaign status badges.
 */
export const CampaignStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge
        variant="secondary"
        className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      >
        <Clock className="mr-1 h-3 w-3" />
        Draft
      </Badge>
      <Badge
        variant="secondary"
        className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      >
        <Send className="mr-1 h-3 w-3" />
        Sending
      </Badge>
      <Badge
        variant="secondary"
        className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      >
        <CheckCircle className="mr-1 h-3 w-3" />
        Completed
      </Badge>
      <Badge variant="destructive">
        <XCircle className="mr-1 h-3 w-3" />
        Failed
      </Badge>
      <Badge
        variant="secondary"
        className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
      >
        <AlertCircle className="mr-1 h-3 w-3" />
        Paused
      </Badge>
    </div>
  ),
};

/**
 * Count badges for notifications.
 */
export const Counts: Story = {
  render: () => (
    <div className="flex gap-4">
      <Badge variant="default">3</Badge>
      <Badge variant="secondary">12</Badge>
      <Badge variant="destructive">99+</Badge>
    </div>
  ),
};

/**
 * Category badges for templates.
 */
export const Categories: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="outline">Newsletter</Badge>
      <Badge variant="outline">Onboarding</Badge>
      <Badge variant="outline">Promotional</Badge>
      <Badge variant="outline">Transactional</Badge>
      <Badge variant="outline">Event</Badge>
    </div>
  ),
};

/**
 * Feature tags.
 */
export const FeatureTags: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
        New
      </Badge>
      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
        Beta
      </Badge>
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        Popular
      </Badge>
      <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
        Premium
      </Badge>
    </div>
  ),
};

/**
 * Email recipient badges.
 */
export const RecipientBadges: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2 max-w-md">
      <Badge variant="secondary" className="flex items-center gap-1 pr-1">
        john@example.com
        <button className="ml-1 rounded-full hover:bg-muted p-0.5">
          <XCircle className="h-3 w-3" />
        </button>
      </Badge>
      <Badge variant="secondary" className="flex items-center gap-1 pr-1">
        jane@company.com
        <button className="ml-1 rounded-full hover:bg-muted p-0.5">
          <XCircle className="h-3 w-3" />
        </button>
      </Badge>
      <Badge variant="secondary" className="flex items-center gap-1 pr-1">
        team@startup.io
        <button className="ml-1 rounded-full hover:bg-muted p-0.5">
          <XCircle className="h-3 w-3" />
        </button>
      </Badge>
    </div>
  ),
};
