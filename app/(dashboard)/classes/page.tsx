'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Users, Edit, Trash2, UserPlus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';

interface Student {
  id: string;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  username: string | null;
  email: string | null;
}

interface Class {
  id: string;
  name: string;
  description: string | null;
  gradeLevel: number | null;
  subject: string | null;
  students: { student: Student }[];
  teacher: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

export default function ClassesPage() {
  const { data: session } = useSession();
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [showAddStudents, setShowAddStudents] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  
  const [newClass, setNewClass] = useState({
    name: '',
    description: '',
    gradeLevel: '',
    subject: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch classes
      const classesRes = await fetch('/api/classes');
      if (classesRes.ok) {
        const classesData = await classesRes.json();
        setClasses(classesData);
      }

      // Fetch all students
      const studentsRes = await fetch('/api/users/students');
      if (studentsRes.ok) {
        const studentsData = await studentsRes.json();
        setStudents(studentsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
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
        setNewClass({ name: '', description: '', gradeLevel: '', subject: '' });
        setShowCreateClass(false);
      }
    } catch (error) {
      console.error('Error creating class:', error);
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm('Are you sure you want to delete this class?')) return;

    try {
      const res = await fetch(`/api/classes/${classId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setClasses(classes.filter(c => c.id !== classId));
      }
    } catch (error) {
      console.error('Error deleting class:', error);
    }
  };

  const handleAddStudentsToClass = async () => {
    if (!selectedClass || selectedStudents.length === 0) return;

    try {
      const res = await fetch(`/api/classes/${selectedClass.id}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: selectedStudents })
      });

      if (res.ok) {
        await fetchData();
        setSelectedStudents([]);
        setShowAddStudents(false);
      }
    } catch (error) {
      console.error('Error adding students to class:', error);
    }
  };

  const handleRemoveStudentFromClass = async (classId: string, studentId: string) => {
    try {
      const res = await fetch(`/api/classes/${classId}/students/${studentId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error('Error removing student from class:', error);
    }
  };

  const getStudentDisplayName = (student: Student) => {
    if (student.firstName || student.lastName) {
      return `${student.firstName || ''} ${student.lastName || ''}`.trim();
    }
    return student.name || student.username || student.email || 'Unknown';
  };

  const getAvailableStudents = () => {
    if (!selectedClass) return students;
    
    const classStudentIds = selectedClass.students.map(s => s.student.id);
    return students.filter(s => !classStudentIds.includes(s.id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Classes</h1>
          <p className="text-muted-foreground">Manage your classes and students</p>
        </div>
        
        <Dialog open={showCreateClass} onOpenChange={setShowCreateClass}>
          <DialogTrigger asChild>
            <Button>
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
                  placeholder="e.g., Math 101"
                />
              </div>
              <div>
                <Label htmlFor="classDescription">Description</Label>
                <Input
                  id="classDescription"
                  value={newClass.description}
                  onChange={(e) => setNewClass({...newClass, description: e.target.value})}
                  placeholder="Optional description"
                />
              </div>
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={newClass.subject}
                  onChange={(e) => setNewClass({...newClass, subject: e.target.value})}
                  placeholder="e.g., Mathematics"
                />
              </div>
              <div>
                <Label htmlFor="gradeLevel">Grade Level</Label>
                <Input
                  id="gradeLevel"
                  type="number"
                  value={newClass.gradeLevel}
                  onChange={(e) => setNewClass({...newClass, gradeLevel: e.target.value})}
                  placeholder="e.g., 5"
                />
              </div>
              <Button onClick={handleCreateClass} className="w-full">
                Create Class
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {classes.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              No classes yet. Create your first class to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => (
            <Card key={cls.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{cls.name}</CardTitle>
                    <CardDescription>
                      {cls.subject && `${cls.subject} • `}
                      {cls.gradeLevel && `Grade ${cls.gradeLevel}`}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setSelectedClass(cls);
                        setShowAddStudents(true);
                      }}
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteClass(cls.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {cls.description && (
                  <p className="text-sm text-muted-foreground mb-4">{cls.description}</p>
                )}
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4" />
                    <span>{cls.students.length} students</span>
                  </div>
                  
                  {cls.students.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">Students:</p>
                      <div className="space-y-1">
                        {cls.students.slice(0, 3).map(({ student }) => (
                          <div key={student.id} className="flex justify-between items-center text-sm">
                            <span>{getStudentDisplayName(student)}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveStudentFromClass(cls.id, student.id)}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                        {cls.students.length > 3 && (
                          <p className="text-xs text-muted-foreground">
                            and {cls.students.length - 3} more...
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Students Dialog */}
      <Dialog open={showAddStudents} onOpenChange={setShowAddStudents}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Add Students to {selectedClass?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="max-h-96 overflow-y-auto space-y-2">
              {getAvailableStudents().length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  All students are already in this class.
                </p>
              ) : (
                getAvailableStudents().map(student => (
                  <div key={student.id} className="flex items-center space-x-2 p-2 hover:bg-accent rounded-lg">
                    <Checkbox
                      checked={selectedStudents.includes(student.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedStudents([...selectedStudents, student.id]);
                        } else {
                          setSelectedStudents(selectedStudents.filter(id => id !== student.id));
                        }
                      }}
                    />
                    <label className="flex-1 cursor-pointer">
                      {getStudentDisplayName(student)}
                    </label>
                  </div>
                ))
              )}
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddStudents(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddStudentsToClass}
                disabled={selectedStudents.length === 0}
              >
                Add Students
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}