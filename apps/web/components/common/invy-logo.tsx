export function InvyLogo({ size = 24 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <g
        fill="none"
        strokeWidth="4.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        className="stroke-[#1f2937] dark:stroke-[#e6e8eb]"
      >
        <polygon points="100,166 127.712,150 127.712,72 100,56 72.288,72 72.288,150" />
        <line x1="100" y1="166" x2="100" y2="88" />
        <line x1="72.288" y1="72" x2="100" y2="88" />
        <line x1="127.712" y1="72" x2="100" y2="88" />
      </g>
      <polygon
        points="100,78 119.052,67 119.052,45 100,34 80.948,45 80.948,67"
        className="fill-[#0f9d6a] dark:fill-[#22c489]"
      />
    </svg>
  );
}
