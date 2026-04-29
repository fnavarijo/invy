import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { LimitSelector } from '../components/tables/limit-selector';

const meta = {
  title: 'Tables/LimitSelector',
  component: LimitSelector,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    options: { control: false },
    current: { control: 'number' },
    onLimitSelect: { control: false },
  },
  args: {
    options: [25, 50, 100],
    onLimitSelect: fn(),
  },
} satisfies Meta<typeof LimitSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FirstSelected: Story = {
  args: { current: 25 },
};

export const MiddleSelected: Story = {
  args: { current: 50 },
};

export const LastSelected: Story = {
  args: { current: 100 },
};

export const CustomOptions: Story = {
  args: {
    options: [10, 20, 50],
    current: 10,
  },
};
