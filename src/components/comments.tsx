'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageCircle, Reply, Edit3, Trash2, User } from 'lucide-react';

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  belt_level: 'White' | 'Blue' | 'Purple' | 'Brown' | 'Black' | null;
  avatar_url: string | null;
}

interface Comment {
  id: string;
  content: string;
  user_id: string;
  technique_id: string;
  created_at: string;
  profile?: Profile;
}

interface Reply {
  id: string;
  content: string;
  user_id: string;
  comment_id: string;
  created_at: string;
  profile?: Profile;
}

interface CommentProps {
  techniqueId: string;
}

export function Comments({ techniqueId }: CommentProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [techniqueId]);

  const fetchComments = async () => {
    try {
      setLoading(true);

      const { data: commentsData, error } = await supabase
        .from('comments')
        .select(
          `
          *,
          profiles:user_id (
            id,
            first_name,
            last_name,
            belt_level,
            avatar_url
          )
        `
        )
        .eq('technique_id', techniqueId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setComments(commentsData || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    setSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          content: newComment.trim(),
          user_id: user.id,
          technique_id: techniqueId,
        })
        .select(
          `
          *,
          profiles:user_id (
            id,
            first_name,
            last_name,
            belt_level,
            avatar_url
          )
        `
        )
        .single();

      if (error) throw error;

      setComments((prev) => [data, ...prev]);
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      const { error } = await supabase.from('comments').delete().eq('id', commentId);

      if (error) throw error;

      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Failed to delete comment');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Comments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Comments ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add Comment Form */}
        {user ? (
          <form onSubmit={handleAddComment} className="space-y-4">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                {user.profile?.avatar_url ? (
                  <img src={user.profile.avatar_url} alt="Your avatar" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <User className="h-5 w-5 text-gray-500" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium mb-2">
                  {user.profile?.first_name} {user.profile?.last_name}
                </p>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px] resize-none rounded-md"
                  rows={3}
                />
                <div className="flex justify-end mt-2">
                  <Button type="submit" size="sm" disabled={!newComment.trim() || submitting}>
                    {submitting ? 'Posting...' : 'Comment'}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        ) : (
          <div className="text-center py-4 text-muted-foreground">Please log in to add comments.</div>
        )}

        {/* Comments List */}
        <div className="space-y-6">
          {comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No comments yet. Be the first to comment!</div>
          ) : (
            comments.map((comment) => <CommentItem key={comment.id} comment={comment} onDelete={handleDeleteComment} techniqueId={techniqueId} />)
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface CommentItemProps {
  comment: Comment;
  onDelete: (commentId: string) => void;
  techniqueId: string;
}

function CommentItem({ comment, onDelete, techniqueId }: CommentItemProps) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replies, setReplies] = useState<Reply[]>([]);
  const [showReplies, setShowReplies] = useState(false);
  const [replyCount, setReplyCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReplyCount();
  }, [comment.id]);

  const fetchReplyCount = async () => {
    try {
      const { count } = await supabase.from('replies').select('*', { count: 'exact', head: true }).eq('comment_id', comment.id);

      setReplyCount(count || 0);
    } catch (error) {
      console.error('Error fetching reply count:', error);
    }
  };

  const fetchReplies = async () => {
    try {
      const { data, error } = await supabase
        .from('replies')
        .select(
          `
          *,
          profiles:user_id (
            id,
            first_name,
            last_name,
            belt_level,
            avatar_url
          )
        `
        )
        .eq('comment_id', comment.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setReplies(data || []);
    } catch (error) {
      console.error('Error fetching replies:', error);
    }
  };

  const handleUpdateComment = async () => {
    if (!editContent.trim()) return;

    try {
      const { error } = await supabase.from('comments').update({ content: editContent.trim() }).eq('id', comment.id);

      if (error) throw error;

      comment.content = editContent.trim();
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating comment:', error);
      alert('Failed to update comment');
    }
  };

  const handleAddReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || !user) return;

    setSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('replies')
        .insert({
          content: replyContent.trim(),
          user_id: user.id,
          comment_id: comment.id,
        })
        .select(
          `
          *,
          profiles:user_id (
            id,
            first_name,
            last_name,
            belt_level,
            avatar_url
          )
        `
        )
        .single();

      if (error) throw error;

      setReplies((prev) => [...prev, data]);
      setReplyContent('');
      setIsReplying(false);
      setShowReplies(true);
      setReplyCount((prev) => prev + 1);
    } catch (error) {
      console.error('Error adding reply:', error);
      alert('Failed to add reply');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!window.confirm('Are you sure you want to delete this reply?')) {
      return;
    }

    try {
      const { error } = await supabase.from('replies').delete().eq('id', replyId);

      if (error) throw error;

      setReplies((prev) => prev.filter((r) => r.id !== replyId));
      setReplyCount((prev) => prev - 1);
    } catch (error) {
      console.error('Error deleting reply:', error);
      alert('Failed to delete reply');
    }
  };

  const isOwner = user && user.id === comment.user_id;

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
          {comment.profile?.avatar_url ? (
            <img src={comment.profile.avatar_url} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <User className="h-5 w-5 text-gray-500" />
          )}
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">
                {comment.profile?.first_name} {comment.profile?.last_name}
              </p>
              <p className="text-xs text-muted-foreground">{new Date(comment.created_at).toLocaleDateString()}</p>
            </div>

            {isOwner && (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)}>
                  <Edit3 className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onDelete(comment.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[60px] resize-none rounded-md"
                rows={2}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleUpdateComment}>
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-700">{comment.content}</p>
          )}

          {/* Reply Actions */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Button variant="ghost" size="sm" onClick={() => setIsReplying(!isReplying)} className="p-0 h-auto text-xs hover:text-foreground">
              <Reply className="h-3 w-3 mr-1" />
              Reply
            </Button>

            {replyCount > 0 && !showReplies && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowReplies(true);
                  fetchReplies();
                }}
                className="p-0 h-auto text-xs hover:text-foreground"
              >
                View {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
              </Button>
            )}

            {showReplies && replyCount > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setShowReplies(false)} className="p-0 h-auto text-xs hover:text-foreground">
                Hide replies
              </Button>
            )}
          </div>

          {/* Reply Form */}
          {isReplying && user && (
            <form onSubmit={handleAddReply} className="mt-3">
              <div className="flex gap-2">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                  {user.profile?.avatar_url ? (
                    <img src={user.profile.avatar_url} alt="Your avatar" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <User className="h-4 w-4 text-gray-500" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Add a reply..."
                    className="w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[60px] resize-none rounded-md"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={!replyContent.trim() || submitting}>
                      {submitting ? 'Posting...' : 'Reply'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setIsReplying(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* Replies */}
          {showReplies && replies.length > 0 && (
            <div className="ml-4 pl-4 border-l-2 border-gray-200 space-y-3 mt-3">
              {replies.map((reply) => (
                <ReplyItem key={reply.id} reply={reply} onDelete={handleDeleteReply} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ReplyItemProps {
  reply: Reply;
  onDelete: (replyId: string) => void;
}

function ReplyItem({ reply, onDelete }: ReplyItemProps) {
  const { user } = useAuth();
  const isOwner = user && user.id === reply.user_id;

  return (
    <div className="flex gap-2">
      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
        {reply.profile?.avatar_url ? (
          <img src={reply.profile.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <User className="h-4 w-4 text-gray-500" />
        )}
      </div>

      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-xs">
              {reply.profile?.first_name} {reply.profile?.last_name}
            </p>
            <p className="text-xs text-muted-foreground">{new Date(reply.created_at).toLocaleDateString()}</p>
          </div>

          {isOwner && (
            <Button variant="ghost" size="sm" onClick={() => onDelete(reply.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>

        <p className="text-sm text-gray-700 mt-1">{reply.content}</p>
      </div>
    </div>
  );
}
