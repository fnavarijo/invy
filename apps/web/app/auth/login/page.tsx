'use client';

import { useEffect, useState } from 'react';
import { SignIn } from '@clerk/nextjs';
type Appearance = NonNullable<Parameters<typeof SignIn>[0]['appearance']>;

// ---------------------------------------------------------------------------
// Clerk appearance objects derived from globals.css design tokens.
//
// Clerk's `variables` API only accepts resolved color values — CSS custom
// properties cannot be used directly. These hex values are the closest sRGB
// approximations of the app's OKLCH tokens. The `elements` overrides use
// Tailwind classes which DO resolve CSS variables at runtime.
//
// Light:
//   --primary            oklch(0.46 0.175 264) → #4338ca
//   --background         oklch(1    0     0  ) → #ffffff
//   --card               oklch(0.99 0.003 264) → #fafbfd
//   --foreground         oklch(0.13 0.012 264) → #1a1b2e
//   --muted-foreground   oklch(0.50 0.018 264) → #737480
//   --destructive        oklch(0.56 0.215  27) → #d14b1a
//
// Dark:
//   --primary            oklch(0.62 0.175 264) → #7578db
//   --background         oklch(0.14 0.018 264) → #16182c
//   --card               oklch(0.19 0.020 264) → #1d1f33
//   --foreground         oklch(0.94 0.008 264) → #eeeef5
//   --muted-foreground   oklch(0.60 0.020 264) → #8d8fa2
//   --destructive        oklch(0.68 0.190  22) → #de6b52
// ---------------------------------------------------------------------------

const ELEMENTS: Appearance['elements'] = {
  card: 'shadow-none border border-border rounded-xl',
  headerTitle: 'text-xl font-semibold',
  headerSubtitle: 'text-sm',
  socialButtonsBlockButton: 'border border-border',
  formButtonPrimary: 'text-sm font-medium',
  formFieldInput: 'border border-input rounded-md text-sm',
  formFieldLabel: 'text-sm font-medium',
  footerActionLink: 'font-medium',
  dividerLine: 'bg-border',
  dividerText: 'text-muted-foreground text-xs',
  identityPreviewEditButton: 'text-sm',
  alertText: 'text-sm',
};

const LIGHT_APPEARANCE: Appearance = {
  variables: {
    colorPrimary: '#4338ca',
    colorBackground: '#ffffff',
    colorInputBackground: '#fafbfd',
    colorText: '#1a1b2e',
    colorTextSecondary: '#737480',
    colorInputText: '#1a1b2e',
    colorDanger: '#d14b1a',
    borderRadius: '0.5rem',
    fontFamily: 'inherit',
    fontSize: '0.875rem',
    spacingUnit: '1rem',
  },
  elements: ELEMENTS,
};

const DARK_APPEARANCE: Appearance = {
  variables: {
    colorPrimary: '#7578db',
    colorBackground: '#16182c',
    colorInputBackground: '#1d1f33',
    colorText: '#eeeef5',
    colorTextSecondary: '#8d8fa2',
    colorInputText: '#eeeef5',
    colorDanger: '#de6b52',
    borderRadius: '0.5rem',
    fontFamily: 'inherit',
    fontSize: '0.875rem',
    spacingUnit: '1rem',
  },
  elements: ELEMENTS,
};

export default function LoginPage() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    setIsDark(root.classList.contains('dark'));

    const observer = new MutationObserver(() => {
      setIsDark(root.classList.contains('dark'));
    });
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <SignIn appearance={isDark ? DARK_APPEARANCE : LIGHT_APPEARANCE} />
      </main>
    </div>
  );
}
