import type { Meta, StoryObj } from "@storybook/react";

// Example Button component for demonstration
// Replace this with your actual component imports
const Button = ({
  primary = false,
  size = "medium",
  label,
  onClick,
}: {
  primary?: boolean;
  size?: "small" | "medium" | "large";
  label: string;
  onClick?: () => void;
}) => {
  const baseStyles = "font-semibold rounded-lg transition-colors";
  const sizeStyles = {
    large: "px-6 py-3 text-lg",
    medium: "px-4 py-2 text-base",
    small: "px-3 py-1.5 text-sm",
  };
  const variantStyles = primary
    ? "bg-blue-600 text-white hover:bg-blue-700"
    : "bg-gray-200 text-gray-900 hover:bg-gray-300";

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles}`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
};

const meta: Meta<typeof Button> = {
  argTypes: {
    onClick: { action: "clicked" },
    size: {
      control: { type: "select" },
      options: ["small", "medium", "large"],
    },
  },
  component: Button,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  title: "Example/Button",
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    label: "Primary Button",
    primary: true,
  },
};

export const Secondary: Story = {
  args: {
    label: "Secondary Button",
  },
};

export const Large: Story = {
  args: {
    label: "Large Button",
    size: "large",
  },
};

export const Small: Story = {
  args: {
    label: "Small Button",
    size: "small",
  },
};
