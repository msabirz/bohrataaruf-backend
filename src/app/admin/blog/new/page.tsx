import { requireAdminAuth } from '@/lib/adminAuth';
import BlogEditor from '../BlogEditor';

export const dynamic = 'force-dynamic';

export default async function NewBlogPostPage() {
  await requireAdminAuth();
  return <BlogEditor post={null} />;
}
