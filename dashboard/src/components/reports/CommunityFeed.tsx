import { useReportStore } from '../../stores/useReportStore';
import { Badge } from '../primitives/Badge';

export function CommunityFeed() {
  const posts = useReportStore((s) => s.communityPosts);

  if (posts.length === 0) {
    return (
      <div className="glass-raised py-12">
        <p className="text-[13px] text-text-tertiary text-center">No community posts yet</p>
        <p className="text-[11px] text-text-quaternary text-center mt-1">Posts from SafeRoute mobile users will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {posts.map((post) => (
        <div key={post.id} className="glass-raised animate-slide-up overflow-hidden">
          <div className="px-5 py-3.5 flex items-start gap-3">
            {/* Type indicator */}
            <span
              className={`shrink-0 mt-0.5 h-2 w-2 rounded-full ${
                post.type === 'negative' ? 'bg-accent-red' : 'bg-accent-green'
              }`}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={post.type === 'negative' ? 'high' : 'low'}>
                  {post.type === 'negative' ? 'Warning' : 'All Clear'}
                </Badge>
                {post.verified && <Badge variant="info">Verified</Badge>}
                <span className="text-[10px] text-text-quaternary">
                  {formatPostAge(post.timestamp)}
                </span>
              </div>
              <p className="text-[12px] text-text-secondary leading-relaxed">{post.content}</p>
              {post.location && (
                <p className="text-[10px] text-text-quaternary mt-1 font-mono tabular-nums">
                  {post.location.latitude.toFixed(4)}, {post.location.longitude.toFixed(4)}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatPostAge(date: Date): string {
  const mins = Math.round((Date.now() - date.getTime()) / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
