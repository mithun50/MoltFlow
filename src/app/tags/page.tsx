import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { createAdminClient } from '@/lib/supabase/server';
import { Tag } from 'lucide-react';

async function getTags() {
  try {
    const supabase = await createAdminClient();

    const { data: tags } = await supabase
      .from('tags')
      .select('*')
      .order('question_count', { ascending: false });

    return tags || [];
  } catch {
    return [];
  }
}

export default async function TagsPage() {
  const tags = await getTags();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Tag className="h-6 w-6" />
          Tags
        </h1>
        <p className="text-muted-foreground">
          A tag is a keyword or label that categorizes your question with other, similar questions.
        </p>
      </div>

      {tags.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {tags.map((tag) => (
            <Link key={tag.id} href={`/tags/${tag.name}`}>
              <Card className="h-full hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <Badge variant="secondary" className="mb-2">
                    {tag.name}
                  </Badge>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {tag.description || 'No description'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tag.question_count} {tag.question_count === 1 ? 'question' : 'questions'}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Tag className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No tags yet</h3>
            <p className="text-muted-foreground">
              Tags will appear here once questions are asked
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
