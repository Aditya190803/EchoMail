import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "../components/ui/button";
import { Mail, Send, Loader2, Plus, Trash2 } from "lucide-react";

/**
 * The Button component is a versatile interactive element used for triggering actions.
 * It supports multiple variants, sizes, and states.
 */
const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  argTypes: {
    variant: {
      control: "select",
      options: [
        "default",
        "destructive",
        "outline",
        "secondary",
        "ghost",
        "link",
      ],
      description: "The visual style of the button",
    },
    size: {
      control: "select",
      options: ["default", "sm", "lg", "icon"],
      description: "The size of the button",
    },
    disabled: {
      control: "boolean",
      description: "Whether the button is disabled",
    },
    asChild: {
      control: "boolean",
      description: "Whether to render as a child component",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

/**
 * The default button style used for primary actions.
 */
export const Default: Story = {
  args: {
    children: "Button",
    variant: "default",
  },
};

/**
 * Used for destructive actions like delete or remove.
 */
export const Destructive: Story = {
  args: {
    children: "Delete",
    variant: "destructive",
  },
};

/**
 * Outlined style for secondary actions.
 */
export const Outline: Story = {
  args: {
    children: "Outline",
    variant: "outline",
  },
};

/**
 * Secondary button for less prominent actions.
 */
export const Secondary: Story = {
  args: {
    children: "Secondary",
    variant: "secondary",
  },
};

/**
 * Ghost button for subtle actions.
 */
export const Ghost: Story = {
  args: {
    children: "Ghost",
    variant: "ghost",
  },
};

/**
 * Link-style button for navigation.
 */
export const Link: Story = {
  args: {
    children: "Link",
    variant: "link",
  },
};

/**
 * Button with an icon on the left.
 */
export const WithIcon: Story = {
  args: {
    children: (
      <>
        <Mail className="mr-2 h-4 w-4" />
        Compose Email
      </>
    ),
    variant: "default",
  },
};

/**
 * Button showing a loading state.
 */
export const Loading: Story = {
  args: {
    children: (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Sending...
      </>
    ),
    variant: "default",
    disabled: true,
  },
};

/**
 * Small button size.
 */
export const Small: Story = {
  args: {
    children: "Small",
    size: "sm",
  },
};

/**
 * Large button size.
 */
export const Large: Story = {
  args: {
    children: "Large",
    size: "lg",
  },
};

/**
 * Icon-only button.
 */
export const Icon: Story = {
  args: {
    children: <Plus className="h-4 w-4" />,
    size: "icon",
    variant: "outline",
    "aria-label": "Add item",
  },
};

/**
 * Disabled button state.
 */
export const Disabled: Story = {
  args: {
    children: "Disabled",
    disabled: true,
  },
};

/**
 * Send email button - common use case in EchoMail.
 */
export const SendEmail: Story = {
  args: {
    children: (
      <>
        <Send className="mr-2 h-4 w-4" />
        Send Email
      </>
    ),
    variant: "default",
    className: "bg-primary",
  },
};

/**
 * Delete action button.
 */
export const DeleteAction: Story = {
  args: {
    children: (
      <>
        <Trash2 className="mr-2 h-4 w-4" />
        Delete Campaign
      </>
    ),
    variant: "destructive",
  },
};
