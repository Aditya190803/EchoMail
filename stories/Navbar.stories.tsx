import { SessionProvider } from "next-auth/react";

import { Navbar } from "@/components/navbar";

import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Navbar> = {
  title: "Components/Navbar",
  component: Navbar,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <SessionProvider
        session={{
          user: { name: "John Doe", email: "john@example.com" },
          expires: "",
        }}
      >
        <Story />
      </SessionProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Navbar>;

export const Default: Story = {};
