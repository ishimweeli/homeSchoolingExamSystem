'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BookOpen, 
  FileText, 
  Video, 
  Download, 
  Search,
  Plus,
  Folder,
  File
} from 'lucide-react';

export default function MaterialsPage() {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState('');

  const materials = [
    { id: 1, title: 'Mathematics Workbook', type: 'PDF', subject: 'Math', grade: '6th' },
    { id: 2, title: 'Science Video Series', type: 'Video', subject: 'Science', grade: '7th' },
    { id: 3, title: 'History Timeline', type: 'Interactive', subject: 'History', grade: '8th' },
    { id: 4, title: 'English Grammar Guide', type: 'PDF', subject: 'English', grade: '5th' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Study Materials</h1>
        <p className="text-gray-600 mt-2">Access educational resources and learning materials</p>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search materials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        {session?.user?.role !== 'STUDENT' && (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Upload Material
          </Button>
        )}
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Materials</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="videos">Videos</TabsTrigger>
          <TabsTrigger value="interactive">Interactive</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {materials.map((material) => (
              <Card key={material.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {material.type === 'PDF' ? (
                        <FileText className="h-5 w-5 text-red-500" />
                      ) : material.type === 'Video' ? (
                        <Video className="h-5 w-5 text-blue-500" />
                      ) : (
                        <BookOpen className="h-5 w-5 text-green-500" />
                      )}
                      <CardTitle className="text-lg">{material.title}</CardTitle>
                    </div>
                  </div>
                  <CardDescription>
                    {material.subject} • {material.grade} Grade
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">{material.type}</span>
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="documents">
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Document materials will appear here</p>
          </div>
        </TabsContent>

        <TabsContent value="videos">
          <div className="text-center py-8">
            <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Video materials will appear here</p>
          </div>
        </TabsContent>

        <TabsContent value="interactive">
          <div className="text-center py-8">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Interactive materials will appear here</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}