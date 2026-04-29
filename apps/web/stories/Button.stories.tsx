import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { fn } from 'storybook/test';

import { Button } from '../components/ui/button';
import { Download } from 'lucide-react';

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: 'Common/Button',
  component: Button,
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
    layout: 'centered',
  },
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ['autodocs'],
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'default',
        'destructive',
        'outline',
        'secondary',
        'ghost',
        'link',
      ],
    },
    size: { control: 'select', options: ['default', 'sm', 'lg', 'icon'] },
  },
  // Use `fn` to spy on the onClick arg, which will appear in the actions panel once invoked: https://storybook.js.org/docs/essentials/actions#story-args
  args: { onClick: fn(), children: 'Button' },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    variant: 'default',
    size: 'default',
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    size: 'default',
  },
};

export const WithIcon: Story = {
  render: (...args) => (
    <Button {...args}>
      <Download /> Export
    </Button>
  ),
};

export const AsChild: Story = {
  render: (...args) => (
    <Button {...args} asChild>
      <a href="#">Login</a>
    </Button>
  ),
};
