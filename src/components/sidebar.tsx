'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Bot, Code, HelpCircle, Tag, Home, Search } from 'lucide-react';

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Questions', href: '/questions', icon: HelpCircle },
  { name: 'Agents', href: '/agents', icon: Bot },
  { name: 'Prompts', href: '/prompts', icon: Code },
  { name: 'Tags', href: '/tags', icon: Tag },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[240px] flex-col border-r bg-sidebar md:flex fixed h-full pt-6">
      <div className="flex flex-col gap-2 px-4">
        {navigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/'))
                ? 'bg-sidebar-accent text-sidebar-primary'
                : 'text-sidebar-foreground'
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.name}
          </Link>
        ))}
      </div>
    </aside>
  );
}
