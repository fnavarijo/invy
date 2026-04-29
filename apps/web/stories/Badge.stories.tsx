import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { CircleCheck, CircleAlert, Clock } from 'lucide-react';

import { Badge } from '../components/ui/badge';

const meta = {
  title: 'Common/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'],
    },
  },
  args: { children: 'Badge' },
} satisfies Meta<typeof Badge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { variant: 'default' },
};

export const Secondary: Story = {
  args: { variant: 'secondary' },
};

export const Destructive: Story = {
  args: { variant: 'destructive' },
};

export const Outline: Story = {
  args: { variant: 'outline' },
};

export const Ghost: Story = {
  args: { variant: 'ghost' },
};

export const WithIcon: Story = {
  render: (args) => (
    <Badge {...args}>
      <CircleCheck /> Aprobado
    </Badge>
  ),
};

export const AllVariants: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-2">
      <Badge {...args} variant="default">Default</Badge>
      <Badge {...args} variant="secondary">Secondary</Badge>
      <Badge {...args} variant="destructive">Destructive</Badge>
      <Badge {...args} variant="outline">Outline</Badge>
      <Badge {...args} variant="ghost">Ghost</Badge>
    </div>
  ),
};

export const StatusBadges: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-2">
      <Badge {...args} variant="default">
        <CircleCheck /> Completado
      </Badge>
      <Badge {...args} variant="secondary">
        <Clock /> Pendiente
      </Badge>
      <Badge {...args} variant="destructive">
        <CircleAlert /> Error
      </Badge>
    </div>
  ),
};

export const AsChild: Story = {
  render: (args) => (
    <Badge {...args} asChild>
      <a href="#">Enlace</a>
    </Badge>
  ),
};
