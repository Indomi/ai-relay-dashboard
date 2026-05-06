import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CommunityPost } from "@/lib/types";
import { formatPlatformName, formatRelativeTime, getPlatformColor } from "@/lib/format";

interface CommunityFeedProps {
  posts: CommunityPost[];
}

export function CommunityFeed({ posts }: CommunityFeedProps) {
  const recentPosts = posts.slice(0, 8);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">社区动态</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentPosts.map((post, index) => (
            <a
              key={index}
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <Badge variant="secondary" className={`shrink-0 text-xs mt-0.5 ${getPlatformColor(post.platform)}`}>
                {formatPlatformName(post.platform)}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate group-hover:text-blue-600 transition-colors">
                  {post.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {post.author} · {formatRelativeTime(post.publishedAt)}
                </p>
              </div>
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
