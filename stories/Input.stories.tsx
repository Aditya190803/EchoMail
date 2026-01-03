import { useState } from "react";

import { Mail, Search as SearchIcon, Lock, Eye, EyeOff } from "lucide-react";

import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

import type { Meta, StoryObj } from "@storybook/react";

/**
 * Input component for text entry. Supports various types and states.
 */
const meta: Meta<typeof Input> = {
  title: "UI/Input",
  component: Input,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  argTypes: {
    type: {
      control: "select",
      options: ["text", "email", "password", "search", "number", "tel", "url"],
    },
    disabled: {
      control: "boolean",
    },
    placeholder: {
      control: "text",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

/**
 * Default text input.
 */
export const Default: Story = {
  args: {
    placeholder: "Enter text...",
  },
};

/**
 * Email input with appropriate type.
 */
export const Email: Story = {
  args: {
    type: "email",
    placeholder: "you@example.com",
  },
};

/**
 * Password input.
 */
export const Password: Story = {
  args: {
    type: "password",
    placeholder: "Enter password",
  },
};

/**
 * Disabled input state.
 */
export const Disabled: Story = {
  args: {
    placeholder: "Disabled input",
    disabled: true,
  },
};

/**
 * Input with label - common pattern.
 */
export const WithLabel: Story = {
  render: () => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="email">Email</Label>
      <Input type="email" id="email" placeholder="Email" />
    </div>
  ),
};

/**
 * Input with icon prefix.
 */
export const WithIcon: Story = {
  render: () => (
    <div className="relative w-full max-w-sm">
      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input type="email" placeholder="Email" className="pl-10" />
    </div>
  ),
};

/**
 * Search input with icon.
 */
export const SearchInput: Story = {
  render: () => (
    <div className="relative w-full max-w-sm">
      <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input type="search" placeholder="Search contacts..." className="pl-10" />
    </div>
  ),
};

/**
 * Password input with toggle visibility.
 */
export const PasswordWithToggle: Story = {
  render: function PasswordWithToggleRender() {
    const [showPassword, setShowPassword] = useState(false);
    return (
      <div className="relative w-full max-w-sm">
        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type={showPassword ? "text" : "password"}
          placeholder="Enter password"
          className="pl-10 pr-10"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
    );
  },
};

/**
 * Input with helper text.
 */
export const WithHelperText: Story = {
  render: () => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="subject">Subject Line</Label>
      <Input id="subject" placeholder="Enter email subject" />
      <p className="text-sm text-muted-foreground">
        Use placeholders like {"{{name}}"} for personalization
      </p>
    </div>
  ),
};

/**
 * Input with error state.
 */
export const WithError: Story = {
  render: () => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="email-error" className="text-destructive">
        Email
      </Label>
      <Input
        id="email-error"
        type="email"
        placeholder="Email"
        className="border-destructive focus-visible:ring-destructive"
        defaultValue="invalid-email"
      />
      <p className="text-sm text-destructive">
        Please enter a valid email address
      </p>
    </div>
  ),
};

/**
 * Required input field.
 */
export const Required: Story = {
  render: () => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="required-email">
        Email <span className="text-destructive">*</span>
      </Label>
      <Input
        id="required-email"
        type="email"
        placeholder="you@example.com"
        required
        aria-required="true"
      />
    </div>
  ),
};
