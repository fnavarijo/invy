"use client"

type Props = { message: string }

export function ChartEmpty({ message }: Props) {
  return (
    <div className="flex h-[220px] items-center justify-center rounded-md bg-muted/40">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
