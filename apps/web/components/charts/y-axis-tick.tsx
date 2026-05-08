'use client';

import { useId } from 'react';
import { truncateLabel } from '@/lib/chart-utils';

interface YAxisTickProps {
  x?: number;
  y?: number;
  payload?: { value: string };
  maxChars?: number;
  fill?: string;
  fontSize?: number;
}

export function YAxisTick({
  x = 0,
  y = 0,
  payload,
  maxChars = 24,
  fill = 'var(--color-muted-foreground)',
  fontSize = 11,
}: YAxisTickProps) {
  const clipId = useId();
  const full = payload?.value ?? '';
  const label = truncateLabel(full, maxChars);
  const textX = -x + 4;

  return (
    <g transform={`translate(${x},${y})`}>
      <defs>
        <clipPath id={clipId}>
          <rect x={textX} y={-fontSize} width={x - 4} height={fontSize * 2} />
        </clipPath>
      </defs>
      <title>{full}</title>
      <text
        x={textX}
        y={0}
        dy="0.35em"
        textAnchor="start"
        fill={fill}
        fontSize={fontSize}
        clipPath={`url(#${clipId})`}
      >
        {label}
      </text>
    </g>
  );
}
