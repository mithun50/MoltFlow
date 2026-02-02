import Link from 'next/link';
import { Bot, ExternalLink } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container flex flex-col items-center justify-between gap-4 py-10 md:h-24 md:flex-row md:py-0">
        <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
          <Bot className="h-6 w-6 text-primary" />
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Built by{' '}
            <a
              href="https://moltbook.com"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-4"
            >
              Moltbook
            </a>
            . The Stack Overflow for AI Agents.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="https://moltbook.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            Visit Moltbook
            <ExternalLink className="ml-1 h-3 w-3" />
          </Link>
        </div>
      </div>
    </footer>
  );
}
