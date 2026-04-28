import { cn } from '@/lib/utils';

export type TextSize =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'body'
  | 'caption'
  | 'mono';

type Tag = 'h1' | 'h2' | 'h3' | 'p';

interface SizeConfig {
  tag: Tag;
  className: string;
}

// Design system type scale
// Format: size / weight / line-height
// Display  48 / 600 / 50px
// H1       32 / 600 / 36px
// H2       22 / 600 / 26px
// H3       18 / 600 / 22px
// Body     16 / 500 / 24px
// Caption  14 / 500 / 18px — uppercase by default, override via className
// Mono     14 / 500 / 24px — JetBrains Mono
const SIZE_CONFIG: Record<TextSize, SizeConfig> = {
  display: {
    tag: 'h1',
    className: 'text-3xl font-semibold tracking-tight text-foreground',
  },
  h1: {
    tag: 'h1',
    className: 'text-2xl font-semibold tracking-tight text-foreground',
  },
  h2: {
    tag: 'h2',
    className: 'text-xl font-semibold tracking-tight text-foreground',
  },
  h3: {
    tag: 'h3',
    className: 'text-lg font-semibold tracking-tight text-foreground',
  },
  body: {
    tag: 'p',
    className: 'text-base font-medium text-foreground',
  },
  caption: {
    tag: 'p',
    className: 'text-sm font-medium uppercase text-muted-foreground',
  },
  mono: {
    tag: 'p',
    className: 'font-mono text-sm leading-6 font-medium text-foreground',
  },
};

interface TextProps {
  id?: string;
  size: TextSize;
  className?: string;
  children: React.ReactNode;
}

export function Text({ size, className, children, id }: TextProps) {
  const { tag: Tag, className: sizeClassName } = SIZE_CONFIG[size];

  return (
    <Tag className={cn(sizeClassName, className)} id={id}>
      {children}
    </Tag>
  );
}
