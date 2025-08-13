'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MessageCircle, Reply, Edit3, Trash2 } from 'lucide-react';
import { UserProfileDisplay, UserProfile } from '@/components/user-profile-display';

interface Comment {
  id: string;
  content: string;
  user_id: string;
  technique_id: string;
  created_at: string;
  profile?: UserProfile;
}

interface Reply {
  id: string;
  content: string;
  user_id: string;
  comment_id: string;
  created_at: string;
  profile?: UserProfile;
}

interface CommentProps {
  techniqueId: string;
}

export function Comments({ techniqueId }: CommentProps) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = useCallback(async () => {
    const timeoutId = setTimeout(() => {
      console.warn('Comments fetch taking too long, timing out...');
      setLoading(false);
      setComments([]);
    }, 10000); // 10 second timeout

    try {
      console.log('Fetching comments for technique:', techniqueId);
      setLoading(true);

      // OPTIMIZED: Fetch comments with profiles in a single join query
      const { data: commentsData, error } = await supabase
        .from('comments')
        .select(
          `
          *,
          profiles!inner(
            id, first_name, last_name, belt_level, avatar_url, username, spotify_id
          )
        `
        )
        .eq('technique_id', techniqueId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching comments with profiles:', error);
        throw error;
      }

      console.log('Comments with profiles fetched (optimized):', commentsData?.length || 0);

      // Map the joined data to the expected format
      const commentsWithProfiles =
        commentsData?.map((comment) => ({
          ...comment,
          profile: comment.profiles,
        })) || [];

      setComments(commentsWithProfiles);
      clearTimeout(timeoutId);
    } catch (error) {
      console.error('Error in fetchComments:', error);
      setComments([]);
      clearTimeout(timeoutId);
    } finally {
      setLoading(false);
    }
  }, [techniqueId]);

  useEffect(() => {
    if (techniqueId) {
      fetchComments();
    }
  }, [techniqueId, fetchComments]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    setSubmitting(true);

    try {
      // Check current authentication state
      const {
        data: { session },
      } = await supabase.auth.getSession();
      console.log('Current session:', session);
      console.log('User from context:', user);

      if (!session?.user) {
        throw new Error('No authenticated session found');
      }
      // First, try simple insert without the complex select
      const { data: insertData, error: insertError } = await supabase
        .from('comments')
        .insert({
          content: newComment.trim(),
          user_id: session.user.id, // Use session user ID instead of context user ID
          technique_id: techniqueId,
        })
        .select('*')
        .single();

      if (insertError) throw insertError;

      // Then fetch the profile data separately
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, belt_level, avatar_url, username, spotify_id')
        .eq('id', session.user.id)
        .single();

      // Combine the data
      const data = {
        ...insertData,
        profile: profileData,
      };

      setComments((prev) => [data, ...prev]);
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Context User ID:', user?.id);
      console.error('Technique ID:', techniqueId);
      console.error('Comment content:', newComment.trim());

      // Check session again to debug auth issues
      const {
        data: { session },
      } = await supabase.auth.getSession();
      console.error('Session at error time:', session);

      alert(`Failed to add comment: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <MessageCircle className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Comments</h3>
        </div>
        <Separator />
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <MessageCircle className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Comments</h3>
        <Badge variant="secondary" className="text-xs">
          {comments.length}
        </Badge>
      </div>

      <Separator />

      {/* Add Comment Form */}
      {user ? (
        <div className="space-y-4">
          {profile && <UserProfileDisplay user={profile} size="md" showMusicPlayer={true} showUsername={true} showBelt={true} linkToProfile={true} />}
          <div className="space-y-3 mt-3">
            <form onSubmit={handleAddComment} className="space-y-3">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your thoughts about this technique..."
                className="min-h-[100px] resize-none"
                disabled={submitting}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={!newComment.trim() || submitting} className="px-8">
                  {submitting ? 'Posting...' : 'Post Comment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <MessageCircle className="h-8 w-8 mx-auto mb-3 opacity-50" />
          <p>Please log in to add comments and join the discussion.</p>
        </div>
      )}

      <Separator />

      {/* Comments List */}
      <div className="space-y-6">
        {comments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <h4 className="text-lg font-medium mb-2">No comments yet</h4>
            <p>Be the first to share your thoughts about this technique!</p>
          </div>
        ) : (
          comments.map((comment) => <CommentItem key={comment.id} comment={comment} onDelete={handleDeleteComment} />)
        )}
      </div>
    </div>
  );
}

interface CommentItemProps {
  comment: Comment;
  onDelete: (commentId: string) => void;
}

function CommentItem({ comment, onDelete }: CommentItemProps) {
  const { user, profile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replies, setReplies] = useState<Reply[]>([]);
  const [showReplies, setShowReplies] = useState(false);
  const [replyCount, setReplyCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Memoize the profile display to prevent re-renders on every keystroke
  const profileDisplay = useMemo(() => {
    if (!comment.profile) return null;
    return <UserProfileDisplay user={comment.profile} size="md" showMusicPlayer={true} showUsername={true} showBelt={true} linkToProfile={true} />;
  }, [comment.profile]);

  const fetchReplyCount = useCallback(async () => {
    try {
      console.log('Fetching reply count for comment:', comment.id);
      const { count } = await supabase.from('replies').select('*', { count: 'exact', head: true }).eq('comment_id', comment.id);

      console.log('Reply count:', count);
      setReplyCount(count || 0);
    } catch (error) {
      console.error('Error fetching reply count:', error);
    }
  }, [comment.id]);

  useEffect(() => {
    if (comment.id) {
      fetchReplyCount();
    }
  }, [comment.id, fetchReplyCount]);

  const fetchReplies = async () => {
    try {
      console.log('Fetching replies for comment:', comment.id);

      // OPTIMIZED: Fetch replies with profiles in a single join query
      const { data: repliesData, error } = await supabase
        .from('replies')
        .select(
          `
          *,
          profiles!inner(
            id, first_name, last_name, belt_level, avatar_url, username, spotify_id
          )
        `
        )
        .eq('comment_id', comment.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching replies with profiles:', error);
        throw error;
      }

      console.log('Replies with profiles fetched (optimized):', repliesData?.length || 0);

      // Map the joined data to the expected format
      const repliesWithProfiles =
        repliesData?.map((reply) => ({
          ...reply,
          profile: reply.profiles,
        })) || [];

      setReplies(repliesWithProfiles);
    } catch (error) {
      console.error('Error in fetchReplies:', error);
      setReplies([]);
    }
  };

  const handleUpdateComment = async () => {
    if (!editContent.trim()) return;

    setUpdating(true);

    try {
      const { error } = await supabase.from('comments').update({ content: editContent.trim() }).eq('id', comment.id);

      if (error) throw error;

      comment.content = editContent.trim();
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating comment:', error);
      alert('Failed to update comment');
    } finally {
      setUpdating(false);
    }
  };

  const handleAddReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || !user) {
      console.log('Reply submission cancelled: missing content or user');
      return;
    }

    console.log('Starting reply submission...');
    setSubmitting(true);

    try {
      console.log('Checking authentication state...');
      // Check current authentication state
      const {
        data: { session },
      } = await supabase.auth.getSession();

      console.log('Session data:', session?.user?.id ? 'User authenticated' : 'No session');

      if (!session?.user) {
        throw new Error('No authenticated session found');
      }

      console.log('Inserting reply into database...');
      // First, try simple insert without the complex select
      const { data: insertData, error: insertError } = await supabase
        .from('replies')
        .insert({
          content: replyContent.trim(),
          user_id: session.user.id,
          comment_id: comment.id,
        })
        .select('*')
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }

      console.log('Reply inserted successfully, fetching profile data...');
      // Then fetch the profile data separately
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, belt_level, avatar_url, username, spotify_id')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        console.warn('Could not fetch profile data:', profileError);
      }

      console.log('Combining data and updating state...');
      // Combine the data
      const data = {
        ...insertData,
        profile: profileData || null,
      };

      setReplies((prev) => [...prev, data]);
      setReplyContent('');
      setIsReplying(false);
      setShowReplies(true);
      setReplyCount((prev) => prev + 1);
      console.log('Reply added successfully!');
    } catch (error) {
      console.error('Error adding reply:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to add reply: ${errorMessage}`);
    } finally {
      console.log('Resetting submitting state...');
      setSubmitting(false);
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    try {
      const { error } = await supabase.from('replies').delete().eq('id', replyId);

      if (error) throw error;

      setReplies((prev) => prev.filter((r) => r.id !== replyId));
      setReplyCount((prev) => prev - 1);

      // If this was the last reply, close the replies section
      if (replyCount <= 1) {
        setShowReplies(false);
      }
    } catch (error) {
      console.error('Error deleting reply:', error);
      alert('Failed to delete reply');
    }
  };

  const handleUpdateReply = async (replyId: string, newContent: string) => {
    console.log('Updating reply in CommentItem:', replyId, newContent);

    // Update the local replies state
    setReplies((prev) => prev.map((reply) => (reply.id === replyId ? { ...reply, content: newContent } : reply)));
  };

  const isOwner = user && user.id === comment.user_id;
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {/* User Profile Display and Actions Row */}
        <div className="flex justify-between items-start">
          <div className="flex gap-3">
            {profileDisplay}
            <span className="text-xs text-muted-foreground mt-1">{formatDate(comment.created_at)}</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {isOwner && (
              <>
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)} className="h-8 w-8 p-0">
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Delete Comment</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">Are you sure you want to delete this comment? This action cannot be undone.</p>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => {}}>
                          Cancel
                        </Button>
                        <Button variant="destructive" onClick={() => onDelete(comment.id)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>

        {/* Comment Content */}
        <div className="space-y-3">
          {/* Content */}
          {isEditing ? (
            <div className="space-y-3">
              <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="min-h-[80px] resize-none" disabled={updating} />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleUpdateComment} disabled={!editContent.trim() || updating}>
                  {updating ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditContent(comment.content);
                    setIsEditing(false);
                  }}
                  disabled={updating}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{comment.content}</p>
          )}

          {/* Actions Bar */}
          <div className="flex items-center gap-4 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setIsReplying(!isReplying)} className="h-8 px-2 text-muted-foreground hover:text-foreground">
              <Reply className="h-4 w-4 mr-1" />
              Reply
            </Button>

            {replyCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  console.log('View Replies clicked. Current state:', { showReplies, repliesLength: replies.length, replyCount });
                  setShowReplies(!showReplies);
                  if (!showReplies && replies.length === 0) {
                    console.log('Fetching replies...');
                    fetchReplies();
                  }
                }}
                className="h-8 px-2 text-muted-foreground hover:text-foreground"
              >
                {showReplies ? 'Hide' : 'View'} {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
              </Button>
            )}
          </div>

          {/* Reply Form */}
          {isReplying && user && (
            <div className="pt-4 space-y-3">
              {profile && <UserProfileDisplay user={profile} size="md" showMusicPlayer={false} showUsername={false} showBelt={false} linkToProfile={false} />}
              <div>
                <form onSubmit={handleAddReply} className="space-y-3">
                  <Textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Write a reply..."
                    className="min-h-[80px] resize-none"
                    disabled={submitting}
                  />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={!replyContent.trim() || submitting}>
                      {submitting ? 'Posting...' : 'Post Reply'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsReplying(false);
                        setReplyContent('');
                      }}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Replies */}
          {showReplies && (
            <div className="pt-4 pl-8 border-l-2 border-muted space-y-4">
              {replies.length > 0 ? (
                replies.map((reply) => <ReplyItem key={reply.id} reply={reply} onDelete={handleDeleteReply} onUpdate={handleUpdateReply} />)
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p>No replies yet</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Separator />
    </div>
  );
}

interface ReplyItemProps {
  reply: Reply;
  onDelete: (replyId: string) => void;
  onUpdate: (replyId: string, newContent: string) => void;
}

function ReplyItem({ reply, onDelete, onUpdate }: ReplyItemProps) {
  const { user } = useAuth();
  const isOwner = user && user.id === reply.user_id;
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(reply.content);
  const [updating, setUpdating] = useState(false);

  // Memoize the profile display to prevent re-renders on every keystroke
  const profileDisplay = useMemo(() => {
    if (!reply.profile) return null;
    return <UserProfileDisplay user={reply.profile} size="md" showMusicPlayer={true} showUsername={true} showBelt={true} linkToProfile={true} />;
  }, [reply.profile]);

  const handleUpdateReply = async () => {
    if (!editContent.trim()) return;

    console.log('Starting reply update for reply:', reply.id);
    setUpdating(true);

    try {
      console.log('Updating reply content to:', editContent.trim());

      const { data, error } = await supabase.from('replies').update({ content: editContent.trim() }).eq('id', reply.id).select('*').single();

      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }

      console.log('Reply updated successfully:', data);

      // Call the onUpdate callback to refresh the parent component
      onUpdate(reply.id, editContent.trim());
      setIsEditing(false);

      console.log('Reply update completed successfully');
    } catch (error) {
      console.error('Error updating reply:', error);
      alert('Failed to update reply. Please try again.');
    } finally {
      console.log('Setting updating to false');
      setUpdating(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-3">
      {/* User Profile Display and Actions Row */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          {profileDisplay}
          <span className="text-xs text-muted-foreground">{formatDate(reply.created_at)}</span>
        </div>

        {/* Actions */}
        {isOwner && (
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground">
              <Edit3 className="h-3 w-3" />
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Reply</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Are you sure you want to delete this reply? This action cannot be undone.</p>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => {}}>
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={() => onDelete(reply.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Reply Content */}
      <div className="space-y-2">
        {/* Edit Form or Reply Text */}
        {isEditing ? (
          <div className="space-y-3">
            <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="min-h-[80px] resize-none" disabled={updating} />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleUpdateReply} disabled={!editContent.trim() || updating}>
                {updating ? 'Saving...' : 'Save'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditContent(reply.content);
                  setIsEditing(false);
                }}
                disabled={updating}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{reply.content}</p>
        )}
      </div>
    </div>
  );
}
