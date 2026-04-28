'use client';

import { usePathname } from 'next/navigation';
import { LayoutDashboard, Archive, Package } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/batches', label: 'Lotes', icon: Archive, exact: false },
  { href: '/products', label: 'Productos', icon: Package, exact: false },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-0.5">
      {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
        const isActive = exact ? pathname === href : pathname.startsWith(href);
        return (
          <a
            key={href}
            href={href}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
              isActive
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {label}
          </a>
        );
      })}
    </div>
  );
}
