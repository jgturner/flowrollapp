import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import Avatar from './Avatar';
import Reply from './Reply';
import { FaReply, FaEdit, FaTrash } from 'react-icons/fa';

export default function Comment({ comment, onDelete }) {
  const { user } = useAuth();
  const [isReplying, setIsReplying] = useState(false);
  const [newReply, setNewReply] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content);
  const [replies, setReplies] = useState([]);
  const [showReplies, setShowReplies] = useState(false);
  const [replyCount, setReplyCount] = useState(0);

  useEffect(() => {
    const getReplyCount = async () => {
      const { count, error } = await supabase.from('replies').select('*', { count: 'exact', head: true }).eq('comment_id', comment.id);

      if (error) {
        console.error('Error fetching reply count:', error);
      } else if (count) {
        setReplyCount(count);
      }
    };
    getReplyCount();
  }, [comment.id]);

  useEffect(() => {
    if (showReplies) {
      fetchReplies();
    }
  }, [showReplies, comment.id]);

  const fetchReplies = async () => {
    // Step 1: Fetch all replies for the comment
    const { data: repliesData, error: repliesError } = await supabase.from('replies').select('*').eq('comment_id', comment.id).order('created_at', { ascending: true });

    if (repliesError) {
      console.error('Error fetching replies:', repliesError);
      setReplies([]);
      return;
    }

    // Step 2: Fetch profile for each reply
    const repliesWithProfiles = await Promise.all(
      repliesData.map(async (reply) => {
        const { data: profileData, error: profileError } = await supabase.from('profiles').select('*').eq('id', reply.user_id).single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error(`Error fetching profile for user ${reply.user_id}:`, profileError.message);
        }

        if (profileData && profileData.avatar_url) {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(profileData.avatar_url);
          profileData.avatar_url = urlData.publicUrl;
        }

        return { ...reply, profile: profileData || null };
      })
    );

    setReplies(repliesWithProfiles);
  };

  const handleAddReply = async (e) => {
    e.preventDefault();
    if (!newReply.trim() || !user) return;

    const { data, error } = await supabase
      .from('replies')
      .insert({
        content: newReply,
        user_id: user.id,
        comment_id: comment.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding reply:', error.message);
    } else if (data) {
      const newReplyWithProfile = {
        ...data,
        profile: user.profile,
      };
      setReplies([...replies, newReplyWithProfile]);
      setNewReply('');
      setIsReplying(false);
      setShowReplies(true);
    }
  };

  const handleUpdateComment = async () => {
    if (!editedContent.trim()) return;

    const { error } = await supabase.from('comments').update({ content: editedContent }).eq('id', comment.id);

    if (error) {
      console.error('Error updating comment:', error);
    } else {
      comment.content = editedContent;
      setIsEditing(false);
    }
  };

  const handleDeleteComment = async () => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      const { error } = await supabase.from('comments').delete().eq('id', comment.id);

      if (error) {
        console.error('Error deleting comment:', error.message);
        alert('Failed to delete comment.');
      } else {
        onDelete(comment.id);
      }
    }
  };

  const handleDeleteReply = (replyId) => {
    setReplies((currentReplies) => currentReplies.filter((r) => r.id !== replyId));
  };

  return (
    <div className="flex items-start gap-1">
      <Avatar url={comment.profile?.avatar_url} name={`${comment.profile?.first_name} ${comment.profile?.last_name}`} size={40} />
      <div className="flex-1">
        <div className="px-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-white pt-2">{`${comment.profile?.first_name} ${comment.profile?.last_name}`}</p>
            {user?.id === comment.user_id && (
              <div className="flex items-center gap-3">
                <button onClick={() => setIsEditing(!isEditing)} className="text-gray-400 hover:text-white">
                  <FaEdit />
                </button>
                <button onClick={handleDeleteComment} className="text-gray-400 hover:text-white">
                  <FaTrash />
                </button>
              </div>
            )}
          </div>
          {isEditing ? (
            <div>
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="w-full  border border-white-600 rounded-md p-2 text-white mt-2"
                rows="2"
              ></textarea>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleUpdateComment}
                  className="px-3 py-1  border border-white text-white rounded-md text-sm hover:bg-white hover:text-black disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1  border border-white text-white rounded-md text-sm hover:bg-white hover:text-black disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-300 mt-2 mb-4">{comment.content}</p>
          )}
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
          <button onClick={() => setIsReplying(!isReplying)} className="hover:text-white flex items-center gap-1">
            <FaReply /> Reply
          </button>
          {replyCount > 0 && !showReplies && (
            <button onClick={() => setShowReplies(true)} className="hover:text-white">
              View {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
            </button>
          )}
          {showReplies && (
            <button onClick={() => setShowReplies(false)} className="hover:text-white">
              Hide replies
            </button>
          )}
        </div>
        {isReplying && (
          <form onSubmit={handleAddReply} className="flex items-start gap-2 mt-3">
            <Avatar url={user.profile?.avatar_url} name={`${user.profile?.first_name} ${user.profile?.last_name}`} size={32} />
            <div className="w-full">
              <textarea
                value={newReply}
                onChange={(e) => setNewReply(e.target.value)}
                placeholder="Add a reply..."
                className="w-full  border border-gray-600 rounded-md p-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-white"
                rows="2"
              ></textarea>
              <div className="flex gap-2 mt-2">
                <button
                  type="submit"
                  className="px-3 py-1  border border-white text-white rounded-md text-sm hover:bg-white hover:text-black disabled:opacity-50"
                  disabled={!newReply.trim()}
                >
                  Reply
                </button>
                <button onClick={() => setIsReplying(false)} className="px-3 py-1 border border-white text-white hover:bg-white hover:text-black rounded-md text-sm">
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}
        {showReplies && (
          <div className="mt-3 space-y-3 pl-5 border-l-2 border-gray-700">
            {replies.map((reply) => (
              <Reply key={reply.id} reply={reply} onDelete={handleDeleteReply} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
