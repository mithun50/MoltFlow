'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MarkdownContent } from '@/components/markdown-content';
import { Bold, Italic, Code, Link, List, ListOrdered, Quote, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  disabled?: boolean;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Write your content here...',
  minHeight = '200px',
  disabled = false,
}: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');

  const insertMarkdown = (before: string, after: string = '', placeholder: string = '') => {
    const textarea = document.querySelector('textarea');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end) || placeholder;

    const newValue =
      value.substring(0, start) + before + selectedText + after + value.substring(end);

    onChange(newValue);

    // Reset cursor position
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selectedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const toolbarButtons = [
    { icon: Bold, action: () => insertMarkdown('**', '**', 'bold'), title: 'Bold' },
    { icon: Italic, action: () => insertMarkdown('*', '*', 'italic'), title: 'Italic' },
    { icon: Code, action: () => insertMarkdown('`', '`', 'code'), title: 'Inline Code' },
    { icon: Link, action: () => insertMarkdown('[', '](url)', 'link text'), title: 'Link' },
    { icon: List, action: () => insertMarkdown('\n- ', '', 'item'), title: 'Bullet List' },
    {
      icon: ListOrdered,
      action: () => insertMarkdown('\n1. ', '', 'item'),
      title: 'Numbered List',
    },
    { icon: Quote, action: () => insertMarkdown('\n> ', '', 'quote'), title: 'Quote' },
  ];

  return (
    <div className="border rounded-lg overflow-hidden">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'write' | 'preview')}>
        <div className="flex items-center justify-between border-b bg-muted/30 px-2">
          <TabsList className="h-10 bg-transparent">
            <TabsTrigger value="write" className="data-[state=active]:bg-background">
              Write
            </TabsTrigger>
            <TabsTrigger value="preview" className="data-[state=active]:bg-background">
              Preview
            </TabsTrigger>
          </TabsList>

          {activeTab === 'write' && (
            <div className="flex items-center gap-0.5">
              {toolbarButtons.map(({ icon: Icon, action, title }) => (
                <Button
                  key={title}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={action}
                  disabled={disabled}
                  title={title}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => insertMarkdown('\n```\n', '\n```', 'code block')}
                disabled={disabled}
                title="Code Block"
              >
                {'</>'}
              </Button>
            </div>
          )}
        </div>

        <TabsContent value="write" className="m-0">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              'border-0 rounded-none focus-visible:ring-0 resize-none',
              'font-mono text-sm'
            )}
            style={{ minHeight }}
          />
        </TabsContent>

        <TabsContent value="preview" className="m-0">
          <div
            className="p-4 prose prose-sm dark:prose-invert max-w-none overflow-auto"
            style={{ minHeight }}
          >
            {value ? (
              <MarkdownContent content={value} />
            ) : (
              <p className="text-muted-foreground italic">Nothing to preview</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <div className="px-3 py-2 border-t bg-muted/30 text-xs text-muted-foreground">
        Markdown supported. Use ```language for code blocks.
      </div>
    </div>
  );
}
