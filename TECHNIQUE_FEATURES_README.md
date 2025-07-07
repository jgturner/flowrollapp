# Technique Video Features

This document outlines the comprehensive video technique system built for the Next.js app, converting functionality from the old React Vite application.

## Features Implemented

### 1. Single Technique Page (`/technique/[id]`)

**Location:** `/src/app/technique/[id]/page.tsx`

**Features:**

- **Mux Video Player**: Full video playback using `@mux/mux-player-react`
- **Like System**: Users can like/unlike techniques with real-time count updates
- **Playlist Management**: Add/remove techniques from personal playlist
- **Edit Functionality**: Technique owners can edit title, description, and position
- **Delete Functionality**: Technique owners can delete their videos
- **Share System**: Native share API with clipboard fallback
- **User Profile Display**: Shows technique creator with avatar and belt level
- **Responsive Design**: Works on mobile and desktop
- **Comments System**: Full commenting and reply functionality

**Key Components:**

- Video player with proper aspect ratio and controls
- Action buttons (Like, Playlist, Share, Edit)
- User information display with belt color coding
- Breadcrumb navigation
- Loading states and error handling

### 2. Comments System

**Location:** `/src/components/comments.tsx`

**Features:**

- **Nested Comments**: Full comment and reply threading
- **Real-time Updates**: Comments update immediately after posting
- **User Authentication**: Only logged-in users can comment
- **Edit/Delete**: Users can modify their own comments and replies
- **Profile Integration**: Shows user avatars and names
- **Reply Count**: Shows number of replies with toggle functionality
- **Responsive Design**: Clean, modern UI with shadcn components

**Database Tables Used:**

- `comments` (user_id, technique_id, content, created_at)
- `replies` (user_id, comment_id, content, created_at)
- `profiles` (user profile information)

### 3. Playlist System

**Location:** `/src/app/playlist/page.tsx`

**Features:**

- **Personal Playlists**: Users can save techniques for later viewing
- **Search and Filter**: Search by title/position and filter by BJJ position
- **Remove from Playlist**: Easy removal with hover-reveal delete buttons
- **Grid Layout**: Responsive grid showing technique thumbnails
- **Empty State**: Helpful guidance when playlist is empty
- **Thumbnail Images**: Mux thumbnail integration with custom timing
- **Date Tracking**: Shows when techniques were added to playlist

**Key Functionality:**

- Add/remove techniques from playlist (handled in technique page)
- View all saved techniques in organized grid
- Search and filter saved techniques
- Navigate directly to technique pages

### 4. Video Grid (Enhanced)

**Location:** `/src/app/videos/page.tsx`

**Enhanced Features:**

- **Proper Linking**: All video cards link to `/technique/[id]` pages
- **Thumbnail Display**: Mux thumbnails with custom timing support
- **Error Handling**: Placeholder images for broken thumbnails
- **Hover Effects**: Smooth transitions and scaling
- **Search Integration**: RPC function with fallback

## Database Schema Requirements

### Core Tables

```sql
-- Techniques table
CREATE TABLE techniques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  position TEXT NOT NULL,
  description TEXT,
  mux_playback_id TEXT NOT NULL,
  thumbnail_time INTEGER,
  user_id UUID REFERENCES auth.users(id),
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Likes table
CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  technique_id UUID REFERENCES techniques(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, technique_id)
);

-- Playlists table
CREATE TABLE playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  technique_id UUID REFERENCES techniques(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, technique_id)
);

-- Comments table
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  technique_id UUID REFERENCES techniques(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Replies table
CREATE TABLE replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  comment_id UUID REFERENCES comments(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Profiles table (enhanced)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  first_name TEXT,
  last_name TEXT,
  belt_level TEXT CHECK (belt_level IN ('White', 'Blue', 'Purple', 'Brown', 'Black')),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Navigation Integration

The features are integrated into the existing sidebar navigation:

- **Videos**: Main technique browsing page
- **Playlist**: Personal saved techniques
- **Training**: Links to training-related features

## Technical Implementation

### Key Dependencies

- `@mux/mux-player-react`: Video player component
- `shadcn/ui`: UI component library
- `lucide-react`: Icons
- `next.js`: Framework with app router
- `supabase`: Database and authentication

### File Structure

```
src/
├── app/
│   ├── technique/[id]/
│   │   └── page.tsx          # Single technique page
│   ├── playlist/
│   │   └── page.tsx          # User playlist page
│   └── videos/
│       └── page.tsx          # Enhanced video grid
├── components/
│   ├── comments.tsx          # Comments system
│   ├── ui/                   # shadcn components
│   └── ...
└── ...
```

### State Management

- Local state for UI interactions
- Supabase real-time for data synchronization
- Auth context for user management

## Features Matching Old React App

✅ **Video Playback**: Mux player integration
✅ **Like System**: Like/unlike with counts
✅ **Playlist System**: Add/remove from playlist
✅ **Comments**: Full commenting with replies
✅ **Edit/Delete**: Owner permissions
✅ **Share**: Native share with clipboard fallback
✅ **User Profiles**: Avatar and belt level display
✅ **Search/Filter**: Position-based filtering
✅ **Responsive Design**: Mobile-friendly layout
✅ **Error Handling**: Graceful error states
✅ **Loading States**: Skeleton loading

## Next Steps

1. **Performance Optimization**: Implement video preloading and image optimization
2. **Real-time Features**: Add real-time comments and like updates
3. **Advanced Filtering**: Add more filter options (date, instructor, etc.)
4. **Video Upload**: Integrate video upload functionality
5. **Analytics**: Add view tracking and analytics
6. **Social Features**: Add following/followers system

## Usage

1. **Browse Videos**: Go to `/videos` to see all techniques
2. **Watch Technique**: Click any video to go to `/technique/[id]`
3. **Interact**: Like, comment, add to playlist, share
4. **Manage Playlist**: Visit `/playlist` to see saved techniques
5. **Edit Content**: Owners can edit/delete their techniques

The system provides a comprehensive video learning platform with full social features, matching and improving upon the original React Vite implementation.
