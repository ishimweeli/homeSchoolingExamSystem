'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  TrendingUp, 
  Calendar, 
  Award,
  Clock,
  BookOpen,
  BarChart3,
  Plus,
  Eye,
  MessageCircle
} from 'lucide-react';

interface Child {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  gradeLevel?: number;
  recentActivity: {
    examsCompleted: number;
    averageScore: number;
    timeSpent: number; // in minutes
    lastActivity: string;
  };
  currentAssignments: number;
  upcomingDeadlines: number;
}

interface FamilyStats {
  totalChildren: number;
  totalExamsCompleted: number;
  averageFamilyScore: number;
  totalStudyTime: number;
  weeklyProgress: {
    week: string;
    completed: number;
    average: number;
  }[];
}

export default function FamilyDashboard() {
  const [children, setChildren] = useState<Child[]>([]);
  const [familyStats, setFamilyStats] = useState<FamilyStats | null>(null);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFamilyData();
  }, []);

  const fetchFamilyData = async () => {
    try {
      const response = await fetch('/api/family/dashboard');
      if (response.ok) {
        const data = await response.json();
        setChildren(data.children);
        setFamilyStats(data.familyStats);
      }
    } catch (error) {
      console.error('Error fetching family data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getChildDisplayName = (child: Child) => {
    if (child.firstName || child.lastName) {
      return `${child.firstName || ''} ${child.lastName || ''}`.trim();
    }
    return child.name || `Student ${child.id.slice(0, 8)}`;
  };

  const getPerformanceBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-100 text-green-800">Excellent</Badge>;
    if (score >= 80) return <Badge className="bg-blue-100 text-blue-800">Good</Badge>;
    if (score >= 70) return <Badge className="bg-yellow-100 text-yellow-800">Fair</Badge>;
    if (score >= 60) return <Badge className="bg-orange-100 text-orange-800">Needs Work</Badge>;
    return <Badge className="bg-red-100 text-red-800">Struggling</Badge>;
  };

  const handleViewChild = (childId: string) => {
    setSelectedChild(childId);
    // Navigate to individual child dashboard
    window.location.href = `/dashboard/student/${childId}`;
  };

  const handleCreateAssignment = () => {
    window.location.href = '/exams/create';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Family Overview Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Family Dashboard</h1>
          <p className="text-gray-600">Managing {children.length} student{children.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={handleCreateAssignment} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Create Assignment
        </Button>
      </div>

      {/* Family Stats Overview */}
      {familyStats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{familyStats.totalChildren}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Exams Completed</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{familyStats.totalExamsCompleted}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Family Average</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{familyStats.averageFamilyScore.toFixed(1)}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Study Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(familyStats.totalStudyTime / 60)}h</div>
              <p className="text-xs text-muted-foreground">This week</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Individual Children Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {children.map((child) => (
          <Card key={child.id} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">{getChildDisplayName(child)}</CardTitle>
                  {child.gradeLevel && (
                    <p className="text-sm text-gray-600">Grade {child.gradeLevel}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {getPerformanceBadge(child.recentActivity.averageScore)}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Progress Overview */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Average Score</span>
                  <span className="font-medium">{child.recentActivity.averageScore.toFixed(1)}%</span>
                </div>
                <Progress 
                  value={child.recentActivity.averageScore} 
                  className="h-2"
                />
              </div>

              {/* Activity Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{child.recentActivity.examsCompleted}</div>
                  <p className="text-xs text-gray-600">Exams Completed</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{Math.round(child.recentActivity.timeSpent / 60)}</div>
                  <p className="text-xs text-gray-600">Hours Studied</p>
                </div>
              </div>

              {/* Assignments Status */}
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4 text-blue-600" />
                  <span>{child.currentAssignments} Active Assignments</span>
                </div>
                {child.upcomingDeadlines > 0 && (
                  <div className="flex items-center gap-1 text-orange-600">
                    <Calendar className="h-4 w-4" />
                    <span>{child.upcomingDeadlines} Due Soon</span>
                  </div>
                )}
              </div>

              {/* Last Activity */}
              <div className="text-xs text-gray-500">
                Last active: {child.recentActivity.lastActivity}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleViewChild(child.id)}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View Details
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.location.href = `/tutoring/${child.id}`}
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.location.href = `/analytics/${child.id}`}
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add New Child */}
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Users className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">Add Another Student</h3>
          <p className="text-gray-500 text-center mb-4">
            Create an account for another child to manage their homeschool journey
          </p>
          <Button 
            variant="outline"
            onClick={() => window.location.href = '/family/add-student'}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Student
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}