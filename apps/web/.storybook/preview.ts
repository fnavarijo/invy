import { themes } from 'storybook/theming';
import '../app/globals.css';
import type { Preview } from '@storybook/nextjs-vite';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    // docs: {
    //   theme: themes.dark,
    // },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo',
    },
  },
  argTypes: {
    className: {
      control: 'text',
      description: 'Class name passed to the component.',
    },
  },
};

export default preview;
