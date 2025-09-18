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
import { Switch } from '@/components/ui/switch';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Share2, 
  Calendar,
  Tag,
  Star,
  Award,
  FileText,
  Image,
  Video,
  Music,
  Presentation,
  Microscope,
  MapPin,
  Trophy,
  User
} from 'lucide-react';
import { format } from 'date-fns';

interface Portfolio {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  student: {
    id: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
  };
  _count: {
    items: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface PortfolioItem {
  id: string;
  title: string;
  description: string | null;
  type: string;
  subject: string | null;
  tags: string[];
  grade: string | null;
  feedback: string | null;
  completedAt: string | null;
  isPublished: boolean;
  createdAt: string;
}

const PORTFOLIO_ITEM_TYPES = {
  ASSIGNMENT: { label: 'Assignment', icon: FileText },
  PROJECT: { label: 'Project', icon: BookOpen },
  ARTWORK: { label: 'Artwork', icon: Image },
  WRITING: { label: 'Writing', icon: FileText },
  VIDEO: { label: 'Video', icon: Video },
  AUDIO: { label: 'Audio', icon: Music },
  PHOTO: { label: 'Photo', icon: Image },
  PRESENTATION: { label: 'Presentation', icon: Presentation },
  RESEARCH: { label: 'Research', icon: Microscope },
  EXPERIMENT: { label: 'Experiment', icon: Microscope },
  FIELD_TRIP: { label: 'Field Trip', icon: MapPin },
  REFLECTION: { label: 'Reflection', icon: FileText },
  ACHIEVEMENT: { label: 'Achievement', icon: Trophy },
  CERTIFICATE: { label: 'Certificate', icon: Award },
};

export default function PortfoliosPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('all');
  const [students, setStudents] = useState<any[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPortfolio, setNewPortfolio] = useState({
    title: '',
    description: '',
    isPublic: false,
    studentId: ''
  });

  const userRole = session?.user?.role;

  useEffect(() => {
    fetchPortfolios();
    if (userRole !== 'STUDENT') {
      fetchStudents();
    }
  }, [userRole]);

  const fetchPortfolios = async () => {
    try {
      const response = await fetch('/api/portfolios');
      if (response.ok) {
        const data = await response.json();
        setPortfolios(data);
      }
    } catch (error) {
      console.error('Error fetching portfolios:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/users/students');
      if (response.ok) {
        const data = await response.json();
        setStudents(data);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const handleCreatePortfolio = async () => {
    try {
      const portfolioData = {
        ...newPortfolio,
        studentId: userRole === 'STUDENT' ? session?.user.id : newPortfolio.studentId
      };

      const response = await fetch('/api/portfolios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(portfolioData)
      });

      if (response.ok) {
        fetchPortfolios();
        setShowCreateDialog(false);
        setNewPortfolio({ title: '', description: '', isPublic: false, studentId: '' });
      }
    } catch (error) {
      console.error('Error creating portfolio:', error);
    }
  };

  const getStudentDisplayName = (student: any) => {
    if (student.firstName || student.lastName) {
      return `${student.firstName || ''} ${student.lastName || ''}`.trim();
    }
    return student.name || 'Unknown Student';
  };

  const filteredPortfolios = portfolios.filter(portfolio => {
    const matchesSearch = !searchTerm || 
      portfolio.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (portfolio.description && portfolio.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStudent = selectedStudent === 'all' || portfolio.student.id === selectedStudent;
    
    return matchesSearch && matchesStudent;
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
            <h1 className="text-3xl font-bold">
              {userRole === 'STUDENT' && 'My Portfolio'}
              {userRole === 'PARENT' && "Children's Portfolios"}
              {(userRole === 'TEACHER' || userRole === 'ADMIN') && 'Student Portfolios'}
            </h1>
            <p className="text-muted-foreground mt-2">
              {userRole === 'STUDENT' && 'Showcase your learning journey and achievements'}
              {userRole === 'PARENT' && 'View and track your children\'s learning portfolios'}
              {(userRole === 'TEACHER' || userRole === 'ADMIN') && 'Monitor student progress and achievements'}
            </p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Portfolio
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Portfolio</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Portfolio Title</Label>
                  <Input
                    id="title"
                    value={newPortfolio.title}
                    onChange={(e) => setNewPortfolio({...newPortfolio, title: e.target.value})}
                    placeholder="e.g. Grade 5 Science Projects"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newPortfolio.description}
                    onChange={(e) => setNewPortfolio({...newPortfolio, description: e.target.value})}
                    placeholder="Describe what this portfolio contains..."
                  />
                </div>
                {(userRole === 'TEACHER' || userRole === 'ADMIN') && (
                  <div>
                    <Label htmlFor="studentId">Student</Label>
                    <Select value={newPortfolio.studentId} onValueChange={(value) => setNewPortfolio({...newPortfolio, studentId: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select student" />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map(student => (
                          <SelectItem key={student.id} value={student.id}>
                            {getStudentDisplayName(student)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <Label htmlFor="isPublic">Make Public</Label>
                  <Switch
                    id="isPublic"
                    checked={newPortfolio.isPublic}
                    onCheckedChange={(checked) => setNewPortfolio({...newPortfolio, isPublic: checked})}
                  />
                </div>
                <Button onClick={handleCreatePortfolio} className="w-full">
                  Create Portfolio
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search portfolios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {(userRole === 'PARENT' || userRole === 'TEACHER' || userRole === 'ADMIN') && students.length > 0 && (
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="All Students" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students</SelectItem>
                  {students.map(student => (
                    <SelectItem key={student.id} value={student.id}>
                      {getStudentDisplayName(student)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Portfolios Grid */}
      {filteredPortfolios.length === 0 ? (
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Portfolios Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'Try adjusting your search terms' : 'Create your first portfolio to get started'}
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Portfolio
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredPortfolios.map((portfolio) => (
            <Card key={portfolio.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{portfolio.title}</CardTitle>
                    {(userRole !== 'STUDENT') && (
                      <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                        <User className="h-3 w-3" />
                        {getStudentDisplayName(portfolio.student)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {portfolio.isPublic && (
                      <Badge variant="outline" className="text-xs">
                        Public
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-xs">
                      {portfolio._count.items} items
                    </Badge>
                  </div>
                </div>
                {portfolio.description && (
                  <CardDescription className="line-clamp-2">
                    {portfolio.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                  <span>Created {format(new Date(portfolio.createdAt), 'MMM dd, yyyy')}</span>
                  <span>Updated {format(new Date(portfolio.updatedAt), 'MMM dd, yyyy')}</span>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => router.push(`/portfolios/${portfolio.id}`)}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => router.push(`/portfolios/${portfolio.id}/edit`)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {portfolio.isPublic && (
                    <Button size="sm" variant="outline">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}