'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Sparkles, 
  BookOpen, 
  Target,
  Loader2,
  ChevronRight,
  Brain,
  Trophy,
  Zap,
  Heart,
  Star
} from 'lucide-react';

export default function CreateStudyModulePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    topic: '',
    subject: 'Mathematics',
    gradeLevel: 5,
    numberOfLessons: 10,
    notes: '',
    country: 'US'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.topic) {
      toast.error('Please enter a topic');
      return;
    }

    setLoading(true);
    toast.info('Creating your study module... This may take up to 90 seconds while AI generates comprehensive content.');
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second timeout
      
      const response = await fetch('/api/study-modules/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          title: formData.title || `${formData.topic} Learning Journey`
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        toast.success('Study module created successfully!');
        router.push(`/study/modules/${data.moduleId}`);
      } else {
        throw new Error('Failed to create study module');
      }
    } catch (error: any) {
      console.error('Error:', error);
      if (error.name === 'AbortError') {
        toast.error('Request timed out. Please try again with a simpler topic.');
      } else {
        toast.error('Failed to create study module. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const subjects = [
    'Mathematics', 'English', 'Science', 'History', 
    'Geography', 'Computer Science', 'Art', 'Music',
    'Physical Education', 'Foreign Language'
  ];

  const countries = [
    { code: 'US', name: 'United States (Common Core)' },
    { code: 'UK', name: 'United Kingdom (National Curriculum)' },
    { code: 'AU', name: 'Australia (ACARA)' },
    { code: 'CA', name: 'Canada (Provincial Standards)' },
    { code: 'IN', name: 'India (CBSE/ICSE)' },
    { code: 'SG', name: 'Singapore (MOE)' }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-white/20 p-3 rounded-xl">
            <Sparkles className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Create Interactive Study Module</h1>
            <p className="text-purple-100 mt-1">
              AI-powered learning experiences like Duolingo
            </p>
          </div>
        </div>
        
        {/* Features */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <Brain className="h-6 w-6 mx-auto mb-1" />
            <span className="text-sm">AI Generated</span>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <Heart className="h-6 w-6 mx-auto mb-1" />
            <span className="text-sm">3 Lives System</span>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <Trophy className="h-6 w-6 mx-auto mb-1" />
            <span className="text-sm">XP & Badges</span>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <Zap className="h-6 w-6 mx-auto mb-1" />
            <span className="text-sm">Interactive</span>
          </div>
        </div>
      </div>

      {/* Creation Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Module Details
          </CardTitle>
          <CardDescription>
            Just enter the topic - AI will create everything else!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Main Topic - Most Important */}
            <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
              <Label htmlFor="topic" className="text-lg font-semibold text-blue-900">
                What do you want to teach? *
              </Label>
              <Input
                id="topic"
                placeholder="e.g., Simple Present Tense, Multiplication Tables, Solar System"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                className="mt-2 text-lg"
                required
              />
              <p className="text-sm text-blue-600 mt-1">
                This is all you need! AI will create complete lessons based on curriculum standards.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Subject */}
              <div>
                <Label htmlFor="subject">Subject</Label>
                <select
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {subjects.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>

              {/* Grade Level */}
              <div>
                <Label htmlFor="gradeLevel">Grade Level</Label>
                <select
                  id="gradeLevel"
                  value={formData.gradeLevel}
                  onChange={(e) => setFormData({ ...formData, gradeLevel: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(grade => (
                    <option key={grade} value={grade}>Grade {grade}</option>
                  ))}
                </select>
              </div>

              {/* Number of Lessons */}
              <div>
                <Label htmlFor="numberOfLessons">Number of Lessons</Label>
                <select
                  id="numberOfLessons"
                  value={formData.numberOfLessons}
                  onChange={(e) => setFormData({ ...formData, numberOfLessons: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value={5}>5 Lessons (Quick)</option>
                  <option value={10}>10 Lessons (Standard)</option>
                  <option value={15}>15 Lessons (Comprehensive)</option>
                  <option value={20}>20 Lessons (Deep Dive)</option>
                </select>
              </div>

              {/* Curriculum Standards */}
              <div>
                <Label htmlFor="country">Curriculum Standards</Label>
                <select
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {countries.map(country => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Optional Title */}
            <div>
              <Label htmlFor="title">
                Custom Title (Optional)
                <span className="text-gray-500 text-sm ml-2">
                  Leave blank for AI-generated title
                </span>
              </Label>
              <Input
                id="title"
                placeholder="e.g., Grammar Adventures, Math Masters"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            {/* Optional Notes */}
            <div>
              <Label htmlFor="notes">
                Additional Notes (Optional)
                <span className="text-gray-500 text-sm ml-2">
                  Any specific requirements or focus areas
                </span>
              </Label>
              <Textarea
                id="notes"
                placeholder="e.g., Focus on irregular verbs, Include word problems, Use real-world examples"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            {/* What Will Be Created */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
              <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                <Star className="h-5 w-5" />
                What AI Will Create For You:
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 text-purple-600 mt-0.5" />
                  <span>{formData.numberOfLessons} Progressive Lessons</span>
                </div>
                <div className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 text-purple-600 mt-0.5" />
                  <span>5 Interactive Steps per Lesson</span>
                </div>
                <div className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 text-purple-600 mt-0.5" />
                  <span>Theory with Visual Examples</span>
                </div>
                <div className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 text-purple-600 mt-0.5" />
                  <span>Practice Questions (Easy → Hard)</span>
                </div>
                <div className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 text-purple-600 mt-0.5" />
                  <span>Instant Feedback & Explanations</span>
                </div>
                <div className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 text-purple-600 mt-0.5" />
                  <span>Gamification (XP, Lives, Badges)</span>
                </div>
                <div className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 text-purple-600 mt-0.5" />
                  <span>Progress Tracking & Analytics</span>
                </div>
                <div className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 text-purple-600 mt-0.5" />
                  <span>Based on {formData.country} Standards</span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !formData.topic}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    AI is generating {formData.numberOfLessons} lessons... (90s)
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Create Study Module
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}