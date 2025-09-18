'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  MessageSquare, 
  Plus, 
  Search, 
  ThumbsUp, 
  Eye, 
  Reply, 
  Pin,
  TrendingUp,
  HelpCircle,
  BookOpen,
  Trophy,
  Lightbulb,
  Megaphone,
  Users,
  Calendar,
  Tag
} from 'lucide-react';
import { format } from 'date-fns';

interface CommunityPost {
  id: string;
  title: string;
  content: string;
  type: string;
  category: string | null;
  tags: string[];
  views: number;
  isPinned: boolean;
  author: {
    id: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    role: string;
  };
  _count: {
    likes: number;
    replies: number;
  };
  createdAt: string;
  updatedAt: string;
}

const POST_TYPES = {
  QUESTION: { label: 'Question', icon: HelpCircle, color: 'bg-blue-100 text-blue-800' },
  DISCUSSION: { label: 'Discussion', icon: MessageSquare, color: 'bg-green-100 text-green-800' },
  RESOURCE: { label: 'Resource', icon: BookOpen, color: 'bg-purple-100 text-purple-800' },
  SUCCESS_STORY: { label: 'Success Story', icon: Trophy, color: 'bg-yellow-100 text-yellow-800' },
  TIP: { label: 'Tip', icon: Lightbulb, color: 'bg-orange-100 text-orange-800' },
  ANNOUNCEMENT: { label: 'Announcement', icon: Megaphone, color: 'bg-red-100 text-red-800' },
};

const CATEGORIES = [
  'General',
  'Mathematics',
  'Science',
  'English/Language Arts',
  'History',
  'Geography',
  'Art',
  'Music',
  'Physical Education',
  'Technology',
  'Special Needs',
  'Curriculum Reviews',
  'Learning Resources',
  'Parent Support',
  'Testing & Assessment'
];

export default function CommunityPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    type: 'DISCUSSION',
    category: '',
    tags: ''
  });

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/community');
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    try {
      const postData = {
        ...newPost,
        tags: newPost.tags.split(',').map(tag => tag.trim()).filter(Boolean)
      };

      const response = await fetch('/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      });

      if (response.ok) {
        fetchPosts();
        setShowCreateDialog(false);
        setNewPost({ title: '', content: '', type: 'DISCUSSION', category: '', tags: '' });
      }
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  const handleLikePost = async (postId: string) => {
    try {
      const response = await fetch(`/api/community/${postId}/like`, {
        method: 'POST'
      });
      if (response.ok) {
        fetchPosts();
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const getAuthorDisplayName = (author: any) => {
    if (author.firstName || author.lastName) {
      return `${author.firstName || ''} ${author.lastName || ''}`.trim();
    }
    return author.name || 'Anonymous';
  };

  const getAuthorInitials = (author: any) => {
    const name = getAuthorDisplayName(author);
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = !searchTerm || 
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
    const matchesType = selectedType === 'all' || post.type === selectedType;
    
    return matchesSearch && matchesCategory && matchesType;
  });

  // Sort posts: pinned first, then by creation date
  const sortedPosts = filteredPosts.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Community Forum</h1>
            <p className="text-muted-foreground mt-2">
              Connect with other homeschooling families, share resources, and get support
            </p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Post
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Post</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="postType">Post Type</Label>
                  <Select value={newPost.type} onValueChange={(value) => setNewPost({...newPost, type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(POST_TYPES).map(([key, type]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <type.icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={newPost.category} onValueChange={(value) => setNewPost({...newPost, category: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={newPost.title}
                    onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                    placeholder="What's your post about?"
                  />
                </div>
                <div>
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={newPost.content}
                    onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                    placeholder="Share your thoughts, questions, or resources..."
                    rows={6}
                  />
                </div>
                <div>
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={newPost.tags}
                    onChange={(e) => setNewPost({...newPost, tags: e.target.value})}
                    placeholder="e.g. math, grade-3, curriculum"
                  />
                </div>
                <Button onClick={handleCreatePost} className="w-full">
                  Create Post
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search posts, tags, or content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(POST_TYPES).map(([key, type]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <type.icon className="h-4 w-4" />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Community Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Posts</p>
                <p className="text-2xl font-bold">{posts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold">{new Set(posts.map(p => p.author.id)).size}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Views</p>
                <p className="text-2xl font-bold">{posts.reduce((sum, post) => sum + post.views, 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ThumbsUp className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Likes</p>
                <p className="text-2xl font-bold">{posts.reduce((sum, post) => sum + post._count.likes, 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Posts List */}
      {sortedPosts.length === 0 ? (
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Posts Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || selectedCategory !== 'all' || selectedType !== 'all' 
                  ? 'Try adjusting your filters'
                  : 'Be the first to start a conversation!'}
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Post
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedPosts.map((post) => {
            const PostTypeConfig = POST_TYPES[post.type as keyof typeof POST_TYPES];
            return (
              <Card key={post.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="text-sm">
                        {getAuthorInitials(post.author)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {post.isPinned && (
                          <Pin className="h-4 w-4 text-blue-600" />
                        )}
                        <Badge className={PostTypeConfig.color}>
                          <PostTypeConfig.icon className="h-3 w-3 mr-1" />
                          {PostTypeConfig.label}
                        </Badge>
                        {post.category && (
                          <Badge variant="outline" className="text-xs">
                            {post.category}
                          </Badge>
                        )}
                        {post.author.role !== 'STUDENT' && (
                          <Badge variant="secondary" className="text-xs">
                            {post.author.role}
                          </Badge>
                        )}
                      </div>
                      <h3 
                        className="text-lg font-semibold mb-2 cursor-pointer hover:text-blue-600"
                        onClick={() => router.push(`/community/${post.id}`)}
                      >
                        {post.title}
                      </h3>
                      <p className="text-muted-foreground mb-3 line-clamp-2">
                        {post.content}
                      </p>
                      {post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {post.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              <Tag className="h-3 w-3 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{getAuthorDisplayName(post.author)}</span>
                          <span>{format(new Date(post.createdAt), 'MMM dd, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => handleLikePost(post.id)}
                            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-blue-600"
                          >
                            <ThumbsUp className="h-4 w-4" />
                            {post._count.likes}
                          </button>
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Reply className="h-4 w-4" />
                            {post._count.replies}
                          </span>
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Eye className="h-4 w-4" />
                            {post.views}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}