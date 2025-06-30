import { useState } from 'react';
import { supabase } from '../../utils/supabaseClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import Avatar from './Avatar';
import { Link } from 'react-router-dom';
import { FaEdit, FaTrash } from 'react-icons/fa';

export default function Reply({ reply, onDelete }) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(reply.content);

  const handleUpdateReply = async () => {
    if (!editedContent.trim()) return;

    const { error } = await supabase.from('replies').update({ content: editedContent }).eq('id', reply.id);

    if (error) {
      console.error('Error updating reply:', error);
    } else {
      reply.content = editedContent;
      setIsEditing(false);
    }
  };

  const handleDeleteReply = async () => {
    if (window.confirm('Are you sure you want to delete this reply?')) {
      const { error } = await supabase.from('replies').delete().eq('id', reply.id);

      if (error) {
        console.error('Error deleting reply:', error.message);
        alert('Failed to delete reply.');
      } else {
        onDelete(reply.id);
      }
    }
  };

  return (
    <div className="flex items-start gap-1">
      <Link to={reply.profile ? `/public-profile/${reply.profile.id}` : '#'} className="flex items-center">
        <Avatar url={reply.profile?.avatar_url} name={`${reply.profile?.first_name} ${reply.profile?.last_name}`} size={40} />
      </Link>
      <div className="flex-1">
        <div className=" rounded-lg p-2">
          <div className="flex items-center justify-between">
            <Link to={reply.profile ? `/public-profile/${reply.profile.id}` : '#'}>
              <p className="font-semibold text-white text-sm">{`${reply.profile?.first_name} ${reply.profile?.last_name}`}</p>
            </Link>
            {user?.id === reply.user_id && (
              <div className="flex items-center gap-2">
                <button onClick={() => setIsEditing(!isEditing)} className="text-gray-400 hover:text-white">
                  <FaEdit size={14} />
                </button>
                <button onClick={handleDeleteReply} className="text-gray-400 hover:text-white">
                  <FaTrash size={14} />
                </button>
              </div>
            )}
          </div>
          {isEditing ? (
            <div>
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="w-full  border border-gray-500 rounded-md p-1 text-white mt-1 text-sm"
                rows="2"
              ></textarea>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={handleUpdateReply}
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
            <p className="text-gray-300 mt-1 text-sm">{reply.content}</p>
          )}
        </div>
      </div>
    </div>
  );
}
