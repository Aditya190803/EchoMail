import React, { useState, useEffect } from "react";

import { Progress } from "../components/ui/progress";

import type { Meta, StoryObj } from "@storybook/react";

/**
 * The Progress component displays a progress bar to show task completion status.
 * Useful for file uploads, email sending progress, and loading states.
 */
const meta: Meta<typeof Progress> = {
  title: "UI/Progress",
  component: Progress,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  argTypes: {
    value: {
      control: { type: "range", min: 0, max: 100, step: 1 },
      description: "The current progress value (0-100)",
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: "400px" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Progress>;

/**
 * Default progress bar at 0%.
 */
export const Default: Story = {
  args: {
    value: 0,
  },
};

/**
 * Progress bar at 25% completion.
 */
export const Quarter: Story = {
  args: {
    value: 25,
  },
};

/**
 * Progress bar at 50% completion.
 */
export const Half: Story = {
  args: {
    value: 50,
  },
};

/**
 * Progress bar at 75% completion.
 */
export const ThreeQuarters: Story = {
  args: {
    value: 75,
  },
};

/**
 * Progress bar at 100% completion.
 */
export const Complete: Story = {
  args: {
    value: 100,
  },
};

/**
 * Animated progress bar simulating an upload.
 */
export const Animated: Story = {
  render: function AnimatedProgress() {
    const [value, setValue] = useState(0);

    useEffect(() => {
      const interval = setInterval(() => {
        setValue((prev) => (prev >= 100 ? 0 : prev + 5));
      }, 200);
      return () => clearInterval(interval);
    }, []);

    return <Progress value={value} />;
  },
};
