import React from "react";

import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";

import type { Meta, StoryObj } from "@storybook/react";

/**
 * The Switch component is a toggle control for binary on/off states.
 * Commonly used for enabling/disabling features or settings.
 */
const meta: Meta<typeof Switch> = {
  title: "UI/Switch",
  component: Switch,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  argTypes: {
    checked: {
      control: "boolean",
      description: "Whether the switch is checked",
    },
    disabled: {
      control: "boolean",
      description: "Whether the switch is disabled",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Switch>;

/**
 * Default unchecked switch.
 */
export const Default: Story = {
  args: {
    checked: false,
  },
};

/**
 * Checked switch state.
 */
export const Checked: Story = {
  args: {
    checked: true,
  },
};

/**
 * Disabled switch that cannot be toggled.
 */
export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

/**
 * Disabled and checked switch.
 */
export const DisabledChecked: Story = {
  args: {
    disabled: true,
    checked: true,
  },
};

/**
 * Switch with a label for accessibility.
 */
export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Switch id="email-notifications" />
      <Label htmlFor="email-notifications">Email notifications</Label>
    </div>
  ),
};

/**
 * Multiple switches in a settings panel.
 */
export const SettingsPanel: Story = {
  render: () => (
    <div className="space-y-4 w-80">
      <div className="flex items-center justify-between">
        <Label htmlFor="tracking">Enable email tracking</Label>
        <Switch id="tracking" defaultChecked />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="notifications">Push notifications</Label>
        <Switch id="notifications" />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="auto-save">Auto-save drafts</Label>
        <Switch id="auto-save" defaultChecked />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="dark-mode">Dark mode</Label>
        <Switch id="dark-mode" />
      </div>
    </div>
  ),
};
