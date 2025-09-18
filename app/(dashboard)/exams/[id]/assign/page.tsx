'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Users, User, ArrowLeft, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/loading-skeleton';

interface Student {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  email: string | null;
}

interface Class {
  id: string;
  name: string;
  description: string | null;
  gradeLevel: number | null;
  students: { student: Student }[];
}

interface Exam {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  gradeLevel: number;
}

export default function AssignExamPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id as string;

  const [exam, setExam] = useState<Exam | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [assignedStudents, setAssignedStudents] = useState<string[]>([]);
  const [assignedClasses, setAssignedClasses] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState<Date>();
  const [startDate, setStartDate] = useState<Date>();
  const [allowLateSubmission, setAllowLateSubmission] = useState(false);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCreateStudent, setShowCreateStudent] = useState(false);
  const [showCreateClass, setShowCreateClass] = useState(false);

  // New student form state
  const [newStudent, setNewStudent] = useState({
    firstName: '',
    lastName: '',
    username: '',
    password: ''
  });

  // New class form state
  const [newClass, setNewClass] = useState({
    name: '',
    description: '',
    gradeLevel: ''
  });

  useEffect(() => {
    fetchData();
  }, [examId]);

  const fetchData = async () => {
    try {
      // Fetch exam details
      const examRes = await fetch(`/api/exams/${examId}`);
      if (examRes.ok) {
        const examData = await examRes.json();
        setExam(examData);
      }

      // Fetch students
      const studentsRes = await fetch('/api/users/students');
      if (studentsRes.ok) {
        const studentsData = await studentsRes.json();
        setStudents(studentsData);
      }

      // Fetch classes
      const classesRes = await fetch('/api/classes');
      if (classesRes.ok) {
        const classesData = await classesRes.json();
        setClasses(classesData);
      }

      // Fetch existing assignments
      const assignmentsRes = await fetch(`/api/exams/${examId}/assign`);
      if (assignmentsRes.ok) {
        const assignmentsData = await assignmentsRes.json();
        const studentIds = assignmentsData
          .filter((assignment: any) => assignment.studentId)
          .map((assignment: any) => assignment.studentId);
        const classIds = assignmentsData
          .filter((assignment: any) => assignment.classId && !assignment.studentId)
          .map((assignment: any) => assignment.classId);
        
        setAssignedStudents(studentIds);
        setAssignedClasses(classIds);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentToggle = (studentId: string) => {
    // Don't allow toggling already assigned students
    if (assignedStudents.includes(studentId)) {
      return;
    }
    
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleClassToggle = (classId: string) => {
    // Don't allow toggling already assigned classes
    if (assignedClasses.includes(classId)) {
      return;
    }
    
    setSelectedClasses(prev =>
      prev.includes(classId)
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };

  const handleSelectAllStudents = () => {
    const unassignedStudents = students.filter(s => !assignedStudents.includes(s.id));
    if (selectedStudents.length === unassignedStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(unassignedStudents.map(s => s.id));
    }
  };

  const handleSelectAllClasses = () => {
    const unassignedClasses = classes.filter(c => !assignedClasses.includes(c.id));
    if (selectedClasses.length === unassignedClasses.length) {
      setSelectedClasses([]);
    } else {
      setSelectedClasses(unassignedClasses.map(c => c.id));
    }
  };

  const handleCreateStudent = async () => {
    try {
      const res = await fetch('/api/users/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStudent)
      });

      if (res.ok) {
        const student = await res.json();
        setStudents([...students, student]);
        setNewStudent({ firstName: '', lastName: '', username: '', password: '' });
        setShowCreateStudent(false);
      }
    } catch (error) {
      console.error('Error creating student:', error);
    }
  };

  const handleCreateClass = async () => {
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newClass,
          gradeLevel: newClass.gradeLevel ? parseInt(newClass.gradeLevel) : null
        })
      });

      if (res.ok) {
        const classData = await res.json();
        setClasses([...classes, classData]);
        setNewClass({ name: '', description: '', gradeLevel: '' });
        setShowCreateClass(false);
      }
    } catch (error) {
      console.error('Error creating class:', error);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const assignments = [];

      // Add individual student assignments
      for (const studentId of selectedStudents) {
        assignments.push({
          examId,
          studentId,
          dueDate,
          startDate,
          allowLateSubmission,
          maxAttempts
        });
      }

      // Add class assignments
      for (const classId of selectedClasses) {
        assignments.push({
          examId,
          classId,
          dueDate,
          startDate,
          allowLateSubmission,
          maxAttempts
        });
      }

      const res = await fetch(`/api/exams/${examId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments })
      });

      if (res.ok) {
        router.push(`/exams/${examId}`);
      }
    } catch (error) {
      console.error('Error assigning exam:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!exam && !loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">Exam not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStudentDisplayName = (student: Student) => {
    if (student.firstName || student.lastName) {
      return `${student.firstName || ''} ${student.lastName || ''}`.trim();
    }
    return student.name || student.username || student.email || 'Unknown';
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push(`/exams/${examId}`)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Exam
        </Button>
        
        <h1 className="text-3xl font-bold">Assign Exam</h1>
        <p className="text-muted-foreground mt-2">
          {loading ? (
            <Skeleton className="h-4 w-64" />
          ) : exam ? (
            `${exam.title} - ${exam.subject} (Grade ${exam.gradeLevel})`
          ) : (
            'Loading exam details...'
          )}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Assignment Settings</CardTitle>
            <CardDescription>Configure how the exam will be assigned</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Start Date (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Select start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Due Date (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : "Select due date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxAttempts">Maximum Attempts</Label>
              <Input
                id="maxAttempts"
                type="number"
                min="1"
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(parseInt(e.target.value) || 1)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="lateSubmission">Allow Late Submission</Label>
              <Switch
                id="lateSubmission"
                checked={allowLateSubmission}
                onCheckedChange={setAllowLateSubmission}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Select Recipients</CardTitle>
            <CardDescription>Choose students or classes to assign this exam to</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="students">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="students">
                  <User className="h-4 w-4 mr-2" />
                  Students
                </TabsTrigger>
                <TabsTrigger value="classes">
                  <Users className="h-4 w-4 mr-2" />
                  Classes
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="students" className="space-y-4">
                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllStudents}
                  >
                    {selectedStudents.length === students.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  <Dialog open={showCreateStudent} onOpenChange={setShowCreateStudent}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Student
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Student</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="firstName">First Name</Label>
                          <Input
                            id="firstName"
                            value={newStudent.firstName}
                            onChange={(e) => setNewStudent({...newStudent, firstName: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input
                            id="lastName"
                            value={newStudent.lastName}
                            onChange={(e) => setNewStudent({...newStudent, lastName: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="username">Username</Label>
                          <Input
                            id="username"
                            value={newStudent.username}
                            onChange={(e) => setNewStudent({...newStudent, username: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="password">Password</Label>
                          <Input
                            id="password"
                            type="password"
                            value={newStudent.password}
                            onChange={(e) => setNewStudent({...newStudent, password: e.target.value})}
                          />
                        </div>
                        <Button onClick={handleCreateStudent} className="w-full">
                          Create Student
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {loading ? (
                    <>
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center space-x-2 p-2">
                          <Skeleton className="h-4 w-4" />
                          <Skeleton className="h-4 flex-1" />
                        </div>
                      ))}
                    </>
                  ) : students.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      No students available. Create a student to get started.
                    </p>
                  ) : (
                    students.map(student => {
                      const isAssigned = assignedStudents.includes(student.id);
                      return (
                        <div key={student.id} className={`flex items-center space-x-2 p-2 hover:bg-accent rounded-lg ${isAssigned ? 'opacity-50 bg-muted' : ''}`}>
                          <Checkbox
                            checked={isAssigned || selectedStudents.includes(student.id)}
                            disabled={isAssigned}
                            onCheckedChange={() => handleStudentToggle(student.id)}
                          />
                          <label
                            htmlFor={student.id}
                            className={`flex-1 ${isAssigned ? 'cursor-default' : 'cursor-pointer'}`}
                          >
                            {getStudentDisplayName(student)}
                            {isAssigned && (
                              <span className="text-xs text-muted-foreground ml-2">
                                (Already assigned)
                              </span>
                            )}
                          </label>
                        </div>
                      );
                    })
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="classes" className="space-y-4">
                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllClasses}
                  >
                    {selectedClasses.length === classes.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  <Dialog open={showCreateClass} onOpenChange={setShowCreateClass}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Class
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Class</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="className">Class Name</Label>
                          <Input
                            id="className"
                            value={newClass.name}
                            onChange={(e) => setNewClass({...newClass, name: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="classDescription">Description</Label>
                          <Input
                            id="classDescription"
                            value={newClass.description}
                            onChange={(e) => setNewClass({...newClass, description: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="gradeLevel">Grade Level</Label>
                          <Input
                            id="gradeLevel"
                            type="number"
                            value={newClass.gradeLevel}
                            onChange={(e) => setNewClass({...newClass, gradeLevel: e.target.value})}
                          />
                        </div>
                        <Button onClick={handleCreateClass} className="w-full">
                          Create Class
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {loading ? (
                    <>
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center space-x-2 p-2">
                          <Skeleton className="h-4 w-4" />
                          <div className="flex-1">
                            <Skeleton className="h-4 w-32 mb-1" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                      ))}
                    </>
                  ) : classes.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      No classes available. Create a class to group your students.
                    </p>
                  ) : (
                    classes.map(cls => {
                      const isAssigned = assignedClasses.includes(cls.id);
                      return (
                        <div key={cls.id} className={`flex items-center space-x-2 p-2 hover:bg-accent rounded-lg ${isAssigned ? 'opacity-50 bg-muted' : ''}`}>
                          <Checkbox
                            checked={isAssigned || selectedClasses.includes(cls.id)}
                            disabled={isAssigned}
                            onCheckedChange={() => handleClassToggle(cls.id)}
                          />
                          <div className="flex-1">
                            <p className="font-medium">
                              {cls.name}
                              {isAssigned && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  (Already assigned)
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {cls.students.length} students
                              {cls.gradeLevel && ` • Grade ${cls.gradeLevel}`}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex justify-end gap-4">
        <Button
          variant="outline"
          onClick={() => router.push(`/exams/${examId}`)}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={submitting || (selectedStudents.length === 0 && selectedClasses.length === 0)}
        >
          {submitting ? 'Assigning...' : 'Assign Exam'}
        </Button>
      </div>
    </div>
  );
}