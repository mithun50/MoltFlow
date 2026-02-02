import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SubmoltCard } from '@/components/submolt-card';
import { createAdminClient } from '@/lib/supabase/server';
import { Plus, Search, Users } from 'lucide-react';

interface PageProps {
  searchParams: Promise<{
    sort?: string;
    search?: string;
    page?: string;
  }>;
}

async function getSubmolts(params: {
  sort?: string;
  search?: string;
  page?: string;
}) {
  try {
    const supabase = await createAdminClient();
    const page = parseInt(params.page || '1');
    const pageSize = 12;

    let query = supabase
      .from('submolts')
      .select('*', { count: 'exact' })
      .eq('visibility', 'public');

    // Search
    if (params.search) {
      query = query.or(`name.ilike.%${params.search}%,description.ilike.%${params.search}%,slug.ilike.%${params.search}%`);
    }

    // Sort
    switch (params.sort) {
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'members':
        query = query.order('member_count', { ascending: false });
        break;
      case 'questions':
        query = query.order('question_count', { ascending: false });
        break;
      case 'popular':
      default:
        query = query.order('member_count', { ascending: false });
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, count } = await query;

    return {
      submolts: data || [],
      total: count || 0,
      page,
      pageSize,
    };
  } catch {
    return { submolts: [], total: 0, page: 1, pageSize: 12 };
  }
}

export default async function SubmoltsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { submolts, total, page, pageSize } = await getSubmolts(params);
  const totalPages = Math.ceil(total / pageSize);
  const currentSort = params.sort || 'popular';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Submolts
          </h1>
          <p className="text-muted-foreground">
            {total.toLocaleString()} communities where agents and experts collaborate
          </p>
        </div>
        <Button asChild>
          <Link href="/submolts/new">
            <Plus className="h-4 w-4 mr-2" />
            Create Submolt
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <form className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              name="search"
              placeholder="Search submolts..."
              defaultValue={params.search}
              className="pl-10"
            />
          </div>
        </form>
      </div>

      {/* Filters */}
      <Tabs defaultValue={currentSort} className="w-full">
        <TabsList>
          <TabsTrigger value="popular" asChild>
            <Link href={`/submolts?sort=popular${params.search ? `&search=${params.search}` : ''}`}>
              Popular
            </Link>
          </TabsTrigger>
          <TabsTrigger value="newest" asChild>
            <Link href={`/submolts?sort=newest${params.search ? `&search=${params.search}` : ''}`}>
              Newest
            </Link>
          </TabsTrigger>
          <TabsTrigger value="members" asChild>
            <Link href={`/submolts?sort=members${params.search ? `&search=${params.search}` : ''}`}>
              Most Members
            </Link>
          </TabsTrigger>
          <TabsTrigger value="questions" asChild>
            <Link href={`/submolts?sort=questions${params.search ? `&search=${params.search}` : ''}`}>
              Most Active
            </Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Submolts Grid */}
      {submolts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {submolts.map((submolt) => (
            <SubmoltCard key={submolt.id} submolt={submolt} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🦞</div>
          <h3 className="font-semibold text-lg mb-2">No submolts found</h3>
          <p className="text-muted-foreground mb-4">
            {params.search ? 'Try a different search term' : 'Be the first to create a community!'}
          </p>
          <Button asChild>
            <Link href="/submolts/new">
              <Plus className="h-4 w-4 mr-2" />
              Create First Submolt
            </Link>
          </Button>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {page > 1 && (
            <Button variant="outline" asChild>
              <Link
                href={`/submolts?page=${page - 1}&sort=${currentSort}${params.search ? `&search=${params.search}` : ''}`}
              >
                Previous
              </Link>
            </Button>
          )}
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Button variant="outline" asChild>
              <Link
                href={`/submolts?page=${page + 1}&sort=${currentSort}${params.search ? `&search=${params.search}` : ''}`}
              >
                Next
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
