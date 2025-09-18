'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Users,
  Calendar,
  BookOpen,
  ArrowLeft,
  Loader2,
  UserCheck,
  Clock,
  CheckCircle
} from 'lucide-react';
import { Skeleton } from '@/components/ui/loading-skeleton';

interface Student {
  id: string;
  name: string;
  email: string;
  gradeLevel?: number;
  isAssigned?: boolean;
  assignedDate?: string;
}

interface StudyModule {
  id: string;
  title: string;
  description: string;
  subject: string;
  gradeLevel: number;
  totalLessons: number;
}

export default function AssignStudyModulePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [module, setModule] = useState<StudyModule | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [instructions, setInstructions] = useState('');

  useEffect(() => {
    fetchModuleAndStudents();
  }, [params.id]);

  const fetchModuleAndStudents = async () => {
    try {
      // Fetch module details
      const moduleRes = await fetch(`/api/study-modules/${params.id}`);
      if (moduleRes.ok) {
        const moduleData = await moduleRes.json();
        setModule(moduleData.module || moduleData);
      }

      // Fetch available students
      const studentsRes = await fetch('/api/students');
      if (studentsRes.ok) {
        const studentsData = await studentsRes.json();
        const allStudents = studentsData.students || [];

        // Fetch existing assignments for this module
        const assignmentsRes = await fetch(`/api/study-modules/${params.id}/assignments`);
        if (assignmentsRes.ok) {
          const assignmentsData = await assignmentsRes.json();
          const assignedStudentIds = new Set(assignmentsData.assignments?.map((a: any) => a.studentId) || []);

          // Mark students as assigned if they already have this module
          const studentsWithStatus = allStudents.map((student: Student) => ({
            ...student,
            isAssigned: assignedStudentIds.has(student.id),
            assignedDate: assignmentsData.assignments?.find((a: any) => a.studentId === student.id)?.createdAt
          }));

          setStudents(studentsWithStatus);
        } else {
          setStudents(allStudents);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
    const unassignedStudents = students.filter(s => !s.isAssigned);
    if (selectedStudentIds.length === unassignedStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(unassignedStudents.map(s => s.id));
    }
  };

  const handleAssign = async () => {
    if (selectedStudentIds.length === 0) {
      toast.error('Please select at least one student');
      return;
    }

    setAssigning(true);
    try {
      const response = await fetch(`/api/study-modules/${params.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: selectedStudentIds,
          dueDate: dueDate || null,
          instructions: instructions || null
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Module assigned to ${selectedStudentIds.length} student(s)!`);
        router.push('/study');
      } else {
        throw new Error('Failed to assign module');
      }
    } catch (error) {
      console.error('Assignment error:', error);
      toast.error('Failed to assign module');
    } finally {
      setAssigning(false);
    }
  };

  if (!module && !loading) {
    return (
      <div className="text-center py-12">
        <p>Module not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Assign Study Module</h1>
          <p className="text-gray-600">
            {loading ? (
              <Skeleton className="h-4 w-64" />
            ) : (
              `Assign "${module?.title}" to students`
            )}
          </p>
        </div>
      </div>

      {/* Module Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {loading ? <Skeleton className="h-6 w-48" /> : module?.title}
          </CardTitle>
          <CardDescription>
            {loading ? <Skeleton className="h-4 w-full" /> : module?.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {loading ? (
              <>
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-24" />
              </>
            ) : (
              <>
                <Badge variant="secondary">{module?.subject}</Badge>
                <Badge variant="outline">Grade {module?.gradeLevel}</Badge>
                <Badge className="bg-purple-100 text-purple-700">
                  {module?.totalLessons} Lessons
                </Badge>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Assignment Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Student Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Select Students
            </CardTitle>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {selectedStudentIds.length} of {students.filter(s => !s.isAssigned).length} available selected
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={students.every(s => s.isAssigned)}
              >
                {selectedStudentIds.length === students.filter(s => !s.isAssigned).length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto space-y-3">
              {loading ? (
                <>
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <Skeleton className="h-4 w-4" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-1" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                  ))}
                </>
              ) : students.length > 0 ? (
                students.map((student) => (
                  <div
                    key={student.id}
                    className={cn(
                      "flex items-center space-x-3 p-3 border rounded-lg",
                      student.isAssigned ? "bg-gray-100 opacity-60" : "hover:bg-gray-50"
                    )}
                  >
                    <Checkbox
                      checked={selectedStudentIds.includes(student.id)}
                      onCheckedChange={() => handleStudentToggle(student.id)}
                      disabled={student.isAssigned}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{student.name}</p>
                      <p className="text-sm text-gray-600">{student.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {student.gradeLevel && (
                          <Badge variant="outline" className="text-xs">
                            Grade {student.gradeLevel}
                          </Badge>
                        )}
                        {student.isAssigned && (
                          <Badge className="text-xs bg-blue-100 text-blue-700">
                            Already Assigned
                          </Badge>
                        )}
                      </div>
                    </div>
                    {student.isAssigned ? (
                      <CheckCircle className="h-5 w-5 text-blue-500" />
                    ) : selectedStudentIds.includes(student.id) ? (
                      <UserCheck className="h-5 w-5 text-green-500" />
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">
                  No students found. Add students first.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Assignment Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Assignment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Due Date */}
            <div>
              <Label htmlFor="dueDate" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Due Date (Optional)
              </Label>
              <Input
                type="datetime-local"
                id="dueDate"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Students will see this deadline in their dashboard
              </p>
            </div>

            {/* Instructions */}
            <div>
              <Label htmlFor="instructions">
                Instructions for Students (Optional)
              </Label>
              <Textarea
                id="instructions"
                placeholder="e.g., Complete this module before our next class. Focus on the practice exercises..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={4}
                className="mt-1"
              />
            </div>

            {/* Assignment Summary */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Assignment Summary:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Students will see this module in their Study page</li>
                <li>• They can track progress and earn XP as they complete lessons</li>
                <li>• You'll receive notifications when they complete the module</li>
                <li>• View detailed analytics in the Results section</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={assigning}
        >
          Cancel
        </Button>
        <Button
          onClick={handleAssign}
          disabled={assigning || selectedStudentIds.length === 0}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {assigning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Assigning...
            </>
          ) : (
            <>
              <Users className="h-4 w-4 mr-2" />
              Assign to {selectedStudentIds.length} Student{selectedStudentIds.length !== 1 ? 's' : ''}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}