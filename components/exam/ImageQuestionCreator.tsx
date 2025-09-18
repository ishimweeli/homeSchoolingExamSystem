'use client';

import { useState } from 'react';
import { UploadButton, UploadDropzone } from '@/lib/uploadthing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Image, 
  X, 
  Upload,
  FileText,
  Camera
} from 'lucide-react';

interface ImageQuestionCreatorProps {
  onQuestionCreate: (question: any) => void;
  onClose: () => void;
}

export default function ImageQuestionCreator({
  onQuestionCreate,
  onClose
}: ImageQuestionCreatorProps) {
  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState('SHORT_ANSWER');
  const [marks, setMarks] = useState(5);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = (files: any[]) => {
    if (files && files[0]) {
      setImageUrl(files[0].url);
    }
  };

  const handleAttachmentUpload = (files: any[]) => {
    const newAttachments = files.map(file => file.url);
    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const removeAttachment = (urlToRemove: string) => {
    setAttachments(prev => prev.filter(url => url !== urlToRemove));
  };

  const removeImage = () => {
    setImageUrl(null);
  };

  const handleCreate = () => {
    if (!questionText.trim()) return;

    const question = {
      type: questionType,
      question: questionText,
      correctAnswer,
      marks,
      imageUrl,
      attachments,
      aiGenerated: false
    };

    onQuestionCreate(question);
    onClose();
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Create Image-Based Question
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Question Image Upload */}
        <div>
          <Label className="text-sm font-medium mb-2 block">
            Question Image/Diagram
          </Label>
          {imageUrl ? (
            <div className="relative">
              <img 
                src={imageUrl} 
                alt="Question" 
                className="max-w-full h-auto rounded-lg border"
              />
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={removeImage}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <UploadDropzone
              endpoint="questionImage"
              onClientUploadComplete={handleImageUpload}
              onUploadError={(error) => {
                console.error("Image upload error:", error);
              }}
              className="ut-button:bg-blue-600 ut-button:text-white ut-allowed-content:text-gray-600"
            />
          )}
        </div>

        {/* Question Text */}
        <div>
          <Label htmlFor="questionText" className="text-sm font-medium mb-2 block">
            Question Text
          </Label>
          <Textarea
            id="questionText"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="Enter the question text (e.g., 'Based on the image above, what process is being shown?')"
            rows={4}
            className="w-full"
          />
        </div>

        {/* Question Type & Marks */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="questionType" className="text-sm font-medium mb-2 block">
              Question Type
            </Label>
            <select
              id="questionType"
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="MULTIPLE_CHOICE">Multiple Choice</option>
              <option value="SHORT_ANSWER">Short Answer</option>
              <option value="LONG_ANSWER">Long Answer</option>
              <option value="TRUE_FALSE">True/False</option>
            </select>
          </div>
          <div>
            <Label htmlFor="marks" className="text-sm font-medium mb-2 block">
              Marks
            </Label>
            <Input
              id="marks"
              type="number"
              min="1"
              max="20"
              value={marks}
              onChange={(e) => setMarks(parseInt(e.target.value))}
            />
          </div>
        </div>

        {/* Correct Answer */}
        <div>
          <Label htmlFor="correctAnswer" className="text-sm font-medium mb-2 block">
            Expected Answer/Guidelines
          </Label>
          <Textarea
            id="correctAnswer"
            value={correctAnswer}
            onChange={(e) => setCorrectAnswer(e.target.value)}
            placeholder="Enter the expected answer or grading guidelines..."
            rows={3}
          />
        </div>

        {/* Additional Attachments */}
        <div>
          <Label className="text-sm font-medium mb-2 block">
            Additional Resources (Optional)
          </Label>
          
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {attachments.map((url, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  Attachment {index + 1}
                  <button
                    onClick={() => removeAttachment(url)}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          <UploadButton
            endpoint="studyMaterial"
            onClientUploadComplete={handleAttachmentUpload}
            onUploadError={(error) => {
              console.error("Attachment upload error:", error);
            }}
            className="ut-button:bg-gray-600 ut-button:text-white"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate}
            disabled={!questionText.trim() || uploading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Upload className="h-4 w-4 mr-2" />
            Create Question
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}