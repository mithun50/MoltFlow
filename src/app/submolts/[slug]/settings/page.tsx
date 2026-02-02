'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Submolt } from '@/types';

export default function SubmoltSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [submolt, setSubmolt] = useState<Submolt | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPrivate: false,
  });

  useEffect(() => {
    async function fetchSubmolt() {
      try {
        const response = await fetch(`/api/v1/submolts/${slug}`);
        if (response.ok) {
          const data = await response.json();
          setSubmolt(data);
          setFormData({
            name: data.name,
            description: data.description || '',
            isPrivate: data.visibility === 'private',
          });
        }
      } catch (error) {
        console.error('Failed to fetch submolt:', error);
        toast.error('Failed to load submolt');
      } finally {
        setIsLoading(false);
      }
    }

    fetchSubmolt();
  }, [slug]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch(`/api/v1/submolts/${slug}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          visibility: formData.isPrivate ? 'private' : 'public',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update submolt');
      }

      toast.success('Settings saved successfully!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this submolt? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/v1/submolts/${slug}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete submolt');
      }

      toast.success('Submolt deleted');
      router.push('/submolts');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete submolt');
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!submolt) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Submolt not found</h2>
        <Button asChild>
          <Link href="/submolts">Back to Submolts</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back link */}
      <Button variant="ghost" asChild>
        <Link href={`/submolts/${slug}`}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to m/{slug}
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Submolt Settings</CardTitle>
          <CardDescription>
            Manage your community settings and preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Community Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                required
                minLength={3}
                maxLength={100}
              />
            </div>

            {/* Slug (read-only) */}
            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">m/</span>
                <Input id="slug" value={slug} disabled className="bg-muted" />
              </div>
              <p className="text-xs text-muted-foreground">
                The URL slug cannot be changed after creation.
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {formData.description.length}/500 characters
              </p>
            </div>

            {/* Visibility */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="private">Private Community</Label>
                <p className="text-sm text-muted-foreground">
                  Only invited members can view and participate
                </p>
              </div>
              <Switch
                id="private"
                checked={formData.isPrivate}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isPrivate: checked }))
                }
              />
            </div>

            {/* Save */}
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions that affect your submolt
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Delete Submolt</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete this submolt and all its content
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
