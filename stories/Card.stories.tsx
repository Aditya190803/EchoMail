import { Mail, Users, Calendar, CheckCircle } from "lucide-react";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";

import type { Meta, StoryObj } from "@storybook/react";

/**
 * Cards are flexible containers for displaying content and actions on a single topic.
 * They're commonly used for campaign summaries, contact lists, and feature showcases.
 */
const meta: Meta<typeof Card> = {
  title: "UI/Card",
  component: Card,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

/**
 * A basic card with all sections.
 */
export const Default: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card content area for displaying information.</p>
      </CardContent>
      <CardFooter>
        <Button>Action</Button>
      </CardFooter>
    </Card>
  ),
};

/**
 * Campaign summary card showing email stats.
 */
export const CampaignCard: Story = {
  render: () => (
    <Card className="w-[400px]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Newsletter Campaign
          </CardTitle>
          <Badge variant="secondary">Completed</Badge>
        </div>
        <CardDescription>Sent on December 1, 2025</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">1,234</p>
            <p className="text-sm text-muted-foreground">Sent</p>
          </div>
          <div>
            <p className="text-2xl font-bold">892</p>
            <p className="text-sm text-muted-foreground">Opened</p>
          </div>
          <div>
            <p className="text-2xl font-bold">156</p>
            <p className="text-sm text-muted-foreground">Clicked</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">View Details</Button>
        <Button>Duplicate</Button>
      </CardFooter>
    </Card>
  ),
};

/**
 * Contact group card.
 */
export const ContactGroupCard: Story = {
  render: () => (
    <Card className="w-[300px]">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-blue-500" />
          <CardTitle className="text-lg">VIP Customers</CardTitle>
        </div>
        <CardDescription className="flex items-center gap-1">
          <Users className="h-4 w-4" />
          48 contacts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          High-value customers for premium offers and early access.
        </p>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full">
          Send Campaign
        </Button>
      </CardFooter>
    </Card>
  ),
};

/**
 * Template card for email templates.
 */
export const TemplateCard: Story = {
  render: () => (
    <Card className="w-[280px] cursor-pointer hover:border-primary transition-colors">
      <CardHeader>
        <CardTitle className="text-base">Welcome Email</CardTitle>
        <CardDescription>Onboarding template</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-24 rounded-md bg-muted flex items-center justify-center">
          <Mail className="h-8 w-8 text-muted-foreground" />
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1">
          Preview
        </Button>
        <Button size="sm" className="flex-1">
          Use
        </Button>
      </CardFooter>
    </Card>
  ),
};

/**
 * Feature card for landing pages.
 */
export const FeatureCard: Story = {
  render: () => (
    <Card className="w-[300px]">
      <CardHeader>
        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
          <Calendar className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Schedule Campaigns</CardTitle>
        <CardDescription>Plan your campaigns ahead of time</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Set specific send times
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Timezone support
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Recurring campaigns
          </li>
        </ul>
      </CardContent>
    </Card>
  ),
};

/**
 * Minimal card without header.
 */
export const Minimal: Story = {
  render: () => (
    <Card className="w-[300px] p-6">
      <p className="text-center text-muted-foreground">
        Simple card with just content
      </p>
    </Card>
  ),
};
