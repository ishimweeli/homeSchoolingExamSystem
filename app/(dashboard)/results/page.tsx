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
import { 
  Trophy, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Calendar, 
  User, 
  Search,
  FileText,
  Award,
  Eye,
  Download,
  Filter,
  CheckCircle2,
  XCircle2,
  Send
} from 'lucide-react';
import { format } from 'date-fns';

interface Result {
  id: string;
  attemptId: string;
  exam: {
    id: string;
    title: string;
    subject: string;
    gradeLevel: number;
    totalMarks: number;
  };
  student: {
    id: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    username: string | null;
    email: string | null;
  };
  attempt: {
    submittedAt: string | null;
    timeSpent: number | null;
  };
  totalScore: number;
  percentage: number;
  grade: string | null;
  status: string;
  gradedAt: string;
  isPublished: boolean;
  publishedAt: string | null;
}

interface Statistics {
  totalExams: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  recentTrend: 'up' | 'down' | 'stable';
}

export default function ResultsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [results, setResults] = useState<Result[]>([]);
  const [filteredResults, setFilteredResults] = useState<Result[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [selectedChild, setSelectedChild] = useState('all');
  const [children, setChildren] = useState<any[]>([]);

  const userRole = session?.user?.role;

  useEffect(() => {
    fetchResults();
    if (userRole === 'PARENT') {
      fetchChildren();
    }
  }, [userRole]);

  useEffect(() => {
    filterResults();
  }, [searchTerm, subjectFilter, gradeFilter, selectedChild, results]);

  const fetchResults = async () => {
    try {
      const response = await fetch('/api/results');
      if (response.ok) {
        const data = await response.json();
        setResults(data.results);
        setStatistics(data.statistics);
        setFilteredResults(data.results);
      }
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChildren = async () => {
    try {
      const response = await fetch('/api/users/children');
      if (response.ok) {
        const data = await response.json();
        setChildren(data);
      }
    } catch (error) {
      console.error('Error fetching children:', error);
    }
  };

  const filterResults = () => {
    let filtered = [...results];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(result => 
        result.exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.exam.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (result.student.name && result.student.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (result.student.firstName && result.student.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (result.student.lastName && result.student.lastName.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Subject filter
    if (subjectFilter !== 'all') {
      filtered = filtered.filter(result => result.exam.subject === subjectFilter);
    }

    // Grade filter
    if (gradeFilter !== 'all') {
      filtered = filtered.filter(result => result.grade === gradeFilter);
    }

    // Child filter (for parents)
    if (userRole === 'PARENT' && selectedChild !== 'all') {
      filtered = filtered.filter(result => result.student.id === selectedChild);
    }

    setFilteredResults(filtered);
  };

  const getGradeColor = (grade: string | null) => {
    switch(grade) {
      case 'A': return 'bg-green-100 text-green-800';
      case 'B': return 'bg-blue-100 text-blue-800';
      case 'C': return 'bg-yellow-100 text-yellow-800';
      case 'D': return 'bg-orange-100 text-orange-800';
      case 'F': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
    if (percentage >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getStudentDisplayName = (student: any) => {
    if (student.firstName || student.lastName) {
      return `${student.firstName || ''} ${student.lastName || ''}`.trim();
    }
    return student.name || student.username || student.email || 'Unknown';
  };

  const viewDetailedResult = (attemptId: string) => {
    router.push(`/results/${attemptId}`);
  };

  const exportResults = () => {
    // TODO: Implement CSV export
    console.log('Exporting results...');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const uniqueSubjects = [...new Set(results.map(r => r.exam.subject))];
  const uniqueGrades = [...new Set(results.map(r => r.grade).filter(Boolean))];

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">
              {userRole === 'STUDENT' && 'My Results'}
              {userRole === 'PARENT' && "Children's Results"}
              {(userRole === 'TEACHER' || userRole === 'ADMIN') && 'Student Results'}
            </h1>
            <p className="text-muted-foreground mt-2">
              {userRole === 'STUDENT' && 'View your exam results and performance'}
              {userRole === 'PARENT' && 'Track your children\'s academic progress'}
              {(userRole === 'TEACHER' || userRole === 'ADMIN') && 'Monitor student performance and progress'}
            </p>
          </div>
          {(userRole === 'TEACHER' || userRole === 'ADMIN') && (
            <Button onClick={exportResults} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Results
            </Button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Exams</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalExams}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Average Score</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getScoreColor(statistics.averageScore)}`}>
                {statistics.averageScore.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Highest Score</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {statistics.highestScore.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Recent Trend</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {statistics.recentTrend === 'up' && (
                  <>
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <span className="text-green-600 font-medium">Improving</span>
                  </>
                )}
                {statistics.recentTrend === 'down' && (
                  <>
                    <TrendingDown className="h-5 w-5 text-red-600" />
                    <span className="text-red-600 font-medium">Declining</span>
                  </>
                )}
                {statistics.recentTrend === 'stable' && (
                  <>
                    <Trophy className="h-5 w-5 text-blue-600" />
                    <span className="text-blue-600 font-medium">Stable</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search exams or students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {userRole === 'PARENT' && children.length > 0 && (
              <Select value={selectedChild} onValueChange={setSelectedChild}>
                <SelectTrigger>
                  <SelectValue placeholder="Select child" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Children</SelectItem>
                  {children.map(child => (
                    <SelectItem key={child.id} value={child.id}>
                      {getStudentDisplayName(child)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {uniqueSubjects.map(subject => (
                  <SelectItem key={subject} value={subject}>
                    {subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by grade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                {uniqueGrades.map(grade => (
                  <SelectItem key={grade!} value={grade!}>
                    Grade {grade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results Table/Cards */}
      {filteredResults.length === 0 ? (
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
              <p className="text-muted-foreground">
                {searchTerm || subjectFilter !== 'all' || gradeFilter !== 'all' 
                  ? 'Try adjusting your filters'
                  : 'No exam results available yet'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredResults.map((result) => (
            <Card key={result.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{result.exam.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {result.exam.subject} • Grade {result.exam.gradeLevel}
                        </p>
                        {(userRole === 'TEACHER' || userRole === 'ADMIN' || userRole === 'PARENT') && (
                          <p className="text-sm mt-1">
                            <User className="h-3 w-3 inline mr-1" />
                            {getStudentDisplayName(result.student)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {result.grade && (
                          <Badge className={getGradeColor(result.grade)}>
                            Grade {result.grade}
                          </Badge>
                        )}
                        <Badge variant={result.status === 'COMPLETED' ? 'default' : 'secondary'}>
                          {result.status}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Score</p>
                        <p className={`text-lg font-semibold ${getScoreColor(result.percentage)}`}>
                          {result.totalScore}/{result.exam.totalMarks}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Percentage</p>
                        <p className={`text-lg font-semibold ${getScoreColor(result.percentage)}`}>
                          {result.percentage.toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Time Spent</p>
                        <p className="text-lg font-semibold">
                          {result.attempt.timeSpent ? `${result.attempt.timeSpent} min` : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Submitted</p>
                        <p className="text-sm">
                          {result.attempt.submittedAt 
                            ? format(new Date(result.attempt.submittedAt), 'MMM dd, yyyy')
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => viewDetailedResult(result.attemptId)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                        {(userRole === 'TEACHER' || userRole === 'ADMIN') && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => router.push(`/results/${result.attemptId}/grade`)}
                          >
                            <Award className="h-4 w-4 mr-2" />
                            Grade/Review
                          </Button>
                        )}
                      </div>
                      
                      {(userRole === 'TEACHER' || userRole === 'ADMIN') && (
                        <PublishButton 
                          attemptId={result.attemptId}
                          isPublished={result.isPublished}
                          onPublishChange={() => fetchResults()}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// PublishButton Component
interface PublishButtonProps {
  attemptId: string;
  isPublished: boolean;
  onPublishChange: () => void;
}

function PublishButton({ attemptId, isPublished, onPublishChange }: PublishButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePublishToggle = async () => {
    setLoading(true);
    try {
      const url = `/api/results/${attemptId}/publish`;
      const method = isPublished ? 'DELETE' : 'POST';
      
      const response = await fetch(url, { method });
      
      if (response.ok) {
        onPublishChange();
      } else {
        console.error('Failed to toggle publish status');
      }
    } catch (error) {
      console.error('Error toggling publish status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (isPublished) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={handlePublishToggle}
        disabled={loading}
        className="border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
      >
        <CheckCircle2 className="h-4 w-4 mr-2" />
        {loading ? 'Unpublishing...' : 'Published'}
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handlePublishToggle}
      disabled={loading}
      className="border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
    >
      <Send className="h-4 w-4 mr-2" />
      {loading ? 'Publishing...' : 'Publish'}
    </Button>
  );
}