import { cn } from '@/lib/utils';

export type TextSize = 'h1' | 'h2' | 'h3' | 'body' | 'caption';

type Tag = 'h1' | 'h2' | 'h3' | 'p';

interface SizeConfig {
  tag: Tag;
  className: string;
}

const SIZE_CONFIG: Record<TextSize, SizeConfig> = {
  h1: { tag: 'h1', className: 'text-2xl font-semibold text-foreground' },
  h2: { tag: 'h2', className: 'text-xl font-semibold text-foreground' },
  h3: { tag: 'h3', className: 'text-base font-semibold text-foreground' },
  body: { tag: 'p', className: 'text-sm text-foreground' },
  caption: { tag: 'p', className: 'text-xs text-muted-foreground' },
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
