import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Underline,
} from 'lucide-react';

import { Button } from '../components/ui/button';
import {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
} from '../components/ui/button-group';

const meta = {
  title: 'Common/ButtonGroup',
  component: ButtonGroup,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    orientation: {
      control: 'radio',
      options: ['horizontal', 'vertical'],
    },
  },
  args: {
    orientation: 'horizontal',
  },
} satisfies Meta<typeof ButtonGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <ButtonGroup {...args}>
      <Button variant="outline">Day</Button>
      <Button variant="outline">Week</Button>
      <Button variant="outline">Month</Button>
    </ButtonGroup>
  ),
};

export const Vertical: Story = {
  args: { orientation: 'vertical' },
  render: (args) => (
    <ButtonGroup {...args}>
      <Button variant="outline">Day</Button>
      <Button variant="outline">Week</Button>
      <Button variant="outline">Month</Button>
    </ButtonGroup>
  ),
};

export const WithIcons: Story = {
  render: (args) => (
    <ButtonGroup {...args}>
      <Button variant="outline" size="icon">
        <AlignLeft />
      </Button>
      <Button variant="outline" size="icon">
        <AlignCenter />
      </Button>
      <Button variant="outline" size="icon">
        <AlignRight />
      </Button>
    </ButtonGroup>
  ),
};

export const WithSeparator: Story = {
  render: (args) => (
    <ButtonGroup {...args}>
      <Button variant="outline" size="icon">
        <Bold />
      </Button>
      <Button variant="outline" size="icon">
        <Italic />
      </Button>
      <ButtonGroupSeparator />
      <Button variant="outline" size="icon">
        <Underline />
      </Button>
    </ButtonGroup>
  ),
};

export const WithText: Story = {
  render: (args) => (
    <ButtonGroup {...args}>
      <ButtonGroupText>Sort by</ButtonGroupText>
      <Button variant="outline">Date</Button>
      <Button variant="outline">Amount</Button>
    </ButtonGroup>
  ),
};

export const AsChild: Story = {
  render: (args) => (
    <ButtonGroup {...args}>
      <Button variant="outline" asChild>
        <a href="#">Home</a>
      </Button>
      <Button variant="outline" asChild>
        <a href="#">Invoices</a>
      </Button>
      <Button variant="outline" asChild>
        <a href="#">Settings</a>
      </Button>
    </ButtonGroup>
  ),
};
