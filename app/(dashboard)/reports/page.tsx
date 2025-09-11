'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Award, 
  Target, 
  Calendar,
  Download,
  BookOpen,
  CheckCircle,
  Clock,
  AlertCircle,
  BarChart3,
  PieChart,
  User,
  FileText,
  GraduationCap
} from 'lucide-react';
import { format, subDays } from 'date-fns';

interface ProgressReport {
  studentId: string;
  student: {
    id: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
  };
  period: string;
  summary: {
    totalExams: number;
    averageScore: number;
    improvement: number;
    timeSpent: number;
    standardsMastered: number;
    standardsInProgress: number;
    portfolioItems: number;
  };
  subjectBreakdown: {
    subject: string;
    averageScore: number;
    examsCompleted: number;
    trending: 'up' | 'down' | 'stable';
    standardsProgress: number;
  }[];
  recentActivity: {
    date: string;
    type: 'exam' | 'portfolio' | 'standard';
    description: string;
    score?: number;
  }[];
  recommendations: string[];
  strengths: string[];
  areasForImprovement: string[];
}

export default function ReportsPage() {
  const { data: session } = useSession();
  const [reports, setReports] = useState<ProgressReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [students, setStudents] = useState<any[]>([]);

  const userRole = session?.user?.role;

  useEffect(() => {
    fetchReports();
    if (userRole !== 'STUDENT') {
      fetchStudents();
    }
  }, [userRole, selectedStudent, selectedPeriod]);

  const fetchReports = async () => {
    try {
      const params = new URLSearchParams({
        period: selectedPeriod,
        ...(selectedStudent !== 'all' && { studentId: selectedStudent })
      });
      
      const response = await fetch(`/api/reports?${params}`);
      if (response.ok) {
        const data = await response.json();
        setReports(data);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
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

  const getStudentDisplayName = (student: any) => {
    if (student.firstName || student.lastName) {
      return `${student.firstName || ''} ${student.lastName || ''}`.trim();
    }
    return student.name || 'Student';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Target className="h-4 w-4 text-blue-600" />;
    }
  };

  const exportReport = (studentId: string) => {
    // TODO: Implement PDF export
    console.log('Exporting report for student:', studentId);
  };

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
            <h1 className="text-3xl font-bold">Progress Reports</h1>
            <p className="text-muted-foreground mt-2">
              Comprehensive learning analytics and progress tracking
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-4">
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
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 3 Months</SelectItem>
                <SelectItem value="365">Last Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reports */}
      {reports.length === 0 ? (
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
              <p className="text-muted-foreground">
                No learning activity found for the selected period.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {reports.map((report) => (
            <Card key={report.studentId}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {getStudentDisplayName(report.student)}
                    </CardTitle>
                    <CardDescription>
                      Progress Report - {report.period}
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => exportReport(report.studentId)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="subjects">Subjects</TabsTrigger>
                    <TabsTrigger value="standards">Standards</TabsTrigger>
                    <TabsTrigger value="recommendations">Insights</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="space-y-6">
                    {/* Key Metrics */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-600" />
                            <div>
                              <p className="text-2xl font-bold">{report.summary.totalExams}</p>
                              <p className="text-xs text-muted-foreground">Exams Completed</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <Award className="h-4 w-4 text-green-600" />
                            <div>
                              <p className="text-2xl font-bold">{report.summary.averageScore.toFixed(1)}%</p>
                              <p className="text-xs text-muted-foreground">Average Score</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-purple-600" />
                            <div>
                              <p className="text-2xl font-bold">{Math.round(report.summary.timeSpent / 60)}h</p>
                              <p className="text-xs text-muted-foreground">Study Time</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-orange-600" />
                            <div>
                              <p className="text-2xl font-bold">{report.summary.standardsMastered}</p>
                              <p className="text-xs text-muted-foreground">Standards Mastered</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Improvement Trend */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Performance Trend</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            {report.summary.improvement > 0 ? (
                              <TrendingUp className="h-5 w-5 text-green-600" />
                            ) : report.summary.improvement < 0 ? (
                              <TrendingDown className="h-5 w-5 text-red-600" />
                            ) : (
                              <Target className="h-5 w-5 text-blue-600" />
                            )}
                            <span className={`font-medium ${
                              report.summary.improvement > 0 ? 'text-green-600' :
                              report.summary.improvement < 0 ? 'text-red-600' : 'text-blue-600'
                            }`}>
                              {report.summary.improvement > 0 ? '+' : ''}
                              {report.summary.improvement.toFixed(1)}% change
                            </span>
                          </div>
                          <span className="text-muted-foreground">from previous period</span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Recent Activity */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {report.recentActivity.slice(0, 5).map((activity, index) => (
                            <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${
                                  activity.type === 'exam' ? 'bg-blue-100' :
                                  activity.type === 'portfolio' ? 'bg-green-100' : 'bg-purple-100'
                                }`}>
                                  {activity.type === 'exam' && <GraduationCap className="h-4 w-4 text-blue-600" />}
                                  {activity.type === 'portfolio' && <BookOpen className="h-4 w-4 text-green-600" />}
                                  {activity.type === 'standard' && <Target className="h-4 w-4 text-purple-600" />}
                                </div>
                                <div>
                                  <p className="font-medium">{activity.description}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {format(new Date(activity.date), 'MMM dd, yyyy')}
                                  </p>
                                </div>
                              </div>
                              {activity.score && (
                                <Badge variant="outline">
                                  {activity.score}%
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="subjects" className="space-y-4">
                    {report.subjectBreakdown.map((subject) => (
                      <Card key={subject.subject}>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-semibold">{subject.subject}</h3>
                              {getTrendIcon(subject.trending)}
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold">{subject.averageScore.toFixed(1)}%</p>
                              <p className="text-sm text-muted-foreground">
                                {subject.examsCompleted} exams
                              </p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Standards Progress</span>
                              <span>{subject.standardsProgress}%</span>
                            </div>
                            <Progress value={subject.standardsProgress} className="h-2" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </TabsContent>

                  <TabsContent value="standards" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-green-600">Mastered Standards</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-center py-8">
                            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                            <p className="text-3xl font-bold text-green-600">
                              {report.summary.standardsMastered}
                            </p>
                            <p className="text-muted-foreground">Standards Completed</p>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-orange-600">In Progress</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-center py-8">
                            <Clock className="h-12 w-12 text-orange-600 mx-auto mb-4" />
                            <p className="text-3xl font-bold text-orange-600">
                              {report.summary.standardsInProgress}
                            </p>
                            <p className="text-muted-foreground">Standards In Progress</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="recommendations" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-green-600">Strengths</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {report.strengths.map((strength, index) => (
                              <li key={index} className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span>{strength}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-orange-600">Areas for Improvement</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {report.areasForImprovement.map((area, index) => (
                              <li key={index} className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-orange-600" />
                                <span>{area}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>AI Recommendations</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-3">
                          {report.recommendations.map((recommendation, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <Target className="h-4 w-4 text-blue-600 mt-1" />
                              <span>{recommendation}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}