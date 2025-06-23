import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import Comment from './Comment';
import Avatar from './Avatar';

export default function Comments({ techniqueId }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCommentsAndProfiles = async () => {
      setLoading(true);

      // Step 1: Fetch all comments for the technique
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*')
        .eq('technique_id', techniqueId)
        .order('created_at', { ascending: false });

      if (commentsError) {
        console.error('Error fetching comments:', commentsError);
        setComments([]);
        setLoading(false);
        return;
      }

      // Step 2: Fetch profile for each comment
      const commentsWithProfiles = await Promise.all(
        commentsData.map(async (comment) => {
          const { data: profileData, error: profileError } = await supabase.from('profiles').select('*').eq('id', comment.user_id).single();

          if (profileError && profileError.code !== 'PGRST116') {
            console.error(`Error fetching profile for user ${comment.user_id}:`, profileError.message);
          }

          if (profileData && profileData.avatar_url) {
            const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(profileData.avatar_url);
            profileData.avatar_url = urlData.publicUrl;
          }

          return { ...comment, profile: profileData || null };
        })
      );

      setComments(commentsWithProfiles);
      setLoading(false);
    };

    fetchCommentsAndProfiles();
  }, [techniqueId]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    const { data, error } = await supabase
      .from('comments')
      .insert({
        content: newComment,
        user_id: user.id,
        technique_id: techniqueId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding comment:', error.message);
    } else if (data) {
      const newCommentWithProfile = {
        ...data,
        profile: user.profile,
      };
      setComments([newCommentWithProfile, ...comments]);
      setNewComment('');
    }
  };

  const handleDeleteComment = (commentId) => {
    setComments((currentComments) => currentComments.filter((c) => c.id !== commentId));
  };

  return (
    <div>
      <h3 className="text-white text-lg font-bold mb-4">Comments</h3>
      {user && (
        <form onSubmit={handleAddComment} className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Avatar url={user.profile?.avatar_url} name={user.profile ? `${user.profile.first_name} ${user.profile.last_name}` : ''} size={40} />
            <p>
              {user.profile.first_name} {user.profile.last_name}
            </p>
          </div>
          <div className="w-full">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="w-full bg-transparent border border-gray-500 rounded-md p-2 text-white focus:outline-none focus:ring-1 focus:ring-white"
              rows="2"
            ></textarea>
            <div className="mt-2 flex justify-end">
              <button
                type="submit"
                className="px-3 py-1 border border-white text-white rounded-md text-sm hover:bg-white hover:text-black disabled:opacity-50"
                disabled={!newComment.trim()}
              >
                Comment
              </button>
            </div>
          </div>
        </form>
      )}
      {loading ? (
        <p>Loading comments...</p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <Comment key={comment.id} comment={comment} onDelete={handleDeleteComment} />
          ))}
        </div>
      )}
    </div>
  );
}
