import React, { useState } from 'react';
import {
  Brain, Sparkles, FileText, BookOpen, MessageSquare, Wand2,
  TrendingUp, Target, Zap, Clock, Award, Users, BarChart,
  ArrowRight, Check, Info, Play, Settings, Download, Upload
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AITool {
  id: string;
  name: string;
  description: string;
  icon: any;
  category: string;
  features: string[];
  usageCount: number;
  rating: number;
  timesSaved: string;
}

export default function AITools() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('all');

  const tools: AITool[] = [
    {
      id: 'exam-generator',
      name: 'AI Exam Generator',
      description: 'Create comprehensive exams with multiple question types in seconds',
      icon: FileText,
      category: 'Assessment',
      features: [
        '6 question types',
        'Automatic grading rubrics',
        'Difficulty balancing',
        'Topic coverage analysis'
      ],
      usageCount: 1248,
      rating: 4.8,
      timesSaved: '500+ hours'
    },
    {
      id: 'study-module-creator',
      name: 'Study Module Creator',
      description: 'Generate interactive learning modules with AI-powered content',
      icon: BookOpen,
      category: 'Learning',
      features: [
        'Interactive lessons',
        'Multimedia content',
        'Progress tracking',
        'Adaptive learning paths'
      ],
      usageCount: 892,
      rating: 4.9,
      timesSaved: '300+ hours'
    },
    {
      id: 'tutoring-assistant',
      name: 'AI Tutoring Assistant',
      description: 'Personalized tutoring support for students with instant feedback',
      icon: MessageSquare,
      category: 'Support',
      features: [
        '24/7 availability',
        'Subject expertise',
        'Step-by-step guidance',
        'Learning style adaptation'
      ],
      usageCount: 3567,
      rating: 4.7,
      timesSaved: '1000+ hours'
    },
    {
      id: 'lesson-planner',
      name: 'Lesson Plan Generator',
      description: 'Create detailed lesson plans aligned with curriculum standards',
      icon: Target,
      category: 'Planning',
      features: [
        'Curriculum alignment',
        'Activity suggestions',
        'Time management',
        'Resource recommendations'
      ],
      usageCount: 654,
      rating: 4.6,
      timesSaved: '200+ hours'
    },
    {
      id: 'progress-analyzer',
      name: 'Progress Analyzer',
      description: 'Deep insights into student learning patterns and recommendations',
      icon: TrendingUp,
      category: 'Analytics',
      features: [
        'Learning patterns',
        'Strength/weakness analysis',
        'Predictive insights',
        'Custom reports'
      ],
      usageCount: 1123,
      rating: 4.8,
      timesSaved: '400+ hours'
    },
    {
      id: 'content-enhancer',
      name: 'Content Enhancer',
      description: 'Improve and adapt existing educational content with AI',
      icon: Wand2,
      category: 'Enhancement',
      features: [
        'Content optimization',
        'Readability adjustment',
        'Visual suggestions',
        'Engagement boosters'
      ],
      usageCount: 445,
      rating: 4.5,
      timesSaved: '150+ hours'
    }
  ];

  const categories = ['all', 'Assessment', 'Learning', 'Support', 'Planning', 'Analytics', 'Enhancement'];

  const filteredTools = selectedCategory === 'all'
    ? tools
    : tools.filter(tool => tool.category === selectedCategory);

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'Assessment': 'from-blue-500 to-cyan-500',
      'Learning': 'from-purple-500 to-pink-500',
      'Support': 'from-green-500 to-emerald-500',
      'Planning': 'from-orange-500 to-red-500',
      'Analytics': 'from-indigo-500 to-purple-500',
      'Enhancement': 'from-yellow-500 to-orange-500'
    };
    return colors[category] || 'from-gray-500 to-gray-600';
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Brain className="w-8 h-8 mr-3 text-purple-600" />
              AI Tools
            </h1>
            <p className="text-gray-600 mt-2">Supercharge your teaching with AI-powered educational tools</p>
          </div>
          <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-200 flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Settings
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-8 mb-8 text-white">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">2,500+</div>
            <div className="text-purple-100">Hours Saved</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">8,479</div>
            <div className="text-purple-100">AI Generations</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">98%</div>
            <div className="text-purple-100">Success Rate</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">4.7</div>
            <div className="text-purple-100">Avg. Rating</div>
          </div>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex gap-3 mb-8 flex-wrap">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              selectedCategory === category
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-purple-50 hover:text-purple-600 border border-gray-200'
            }`}
          >
            {category === 'all' ? 'All Tools' : category}
          </button>
        ))}
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredTools.map((tool) => {
          const Icon = tool.icon;
          return (
            <div
              key={tool.id}
              className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-200 border border-gray-200 overflow-hidden group cursor-pointer"
              onClick={() => {
                if (tool.id === 'exam-generator') {
                  navigate('/exams/create');
                } else if (tool.id === 'study-module-creator') {
                  navigate('/modules/create');
                }
              }}
            >
              {/* Tool Header */}
              <div className={`h-32 bg-gradient-to-br ${getCategoryColor(tool.category)} p-6 relative`}>
                <div className="flex justify-between items-start">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                    <Sparkles className="w-4 h-4 text-yellow-300" />
                    <span className="text-white text-sm font-semibold">{tool.rating}</span>
                  </div>
                </div>
                <div className="absolute bottom-4 left-6">
                  <span className="text-white/80 text-sm">{tool.category}</span>
                </div>
              </div>

              {/* Tool Content */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                  {tool.name}
                </h3>
                <p className="text-gray-600 text-sm mb-4">{tool.description}</p>

                {/* Features */}
                <div className="space-y-2 mb-4">
                  {tool.features.slice(0, 3).map((feature, index) => (
                    <div key={index} className="flex items-center text-sm">
                      <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      <span className="text-gray-600">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Stats */}
                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-gray-500 text-xs">Uses</p>
                      <p className="text-gray-900 font-semibold">{tool.usageCount.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-500 text-xs">Saved</p>
                      <p className="text-gray-900 font-semibold">{tool.timesSaved}</p>
                    </div>
                  </div>
                  <button className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors group-hover:bg-purple-600 group-hover:text-white">
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="mt-12 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-8 border border-purple-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <Zap className="w-6 h-6 mr-2 text-yellow-500" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/exams/create')}
            className="p-4 bg-white rounded-xl border border-gray-200 hover:border-purple-400 hover:shadow-md transition-all duration-200 text-left group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-purple-600">Generate Exam</h3>
                <p className="text-sm text-gray-500 mt-1">Create a new AI-powered exam</p>
              </div>
              <FileText className="w-8 h-8 text-purple-400" />
            </div>
          </button>

          <button
            onClick={() => navigate('/modules/create')}
            className="p-4 bg-white rounded-xl border border-gray-200 hover:border-purple-400 hover:shadow-md transition-all duration-200 text-left group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-purple-600">Create Module</h3>
                <p className="text-sm text-gray-500 mt-1">Build interactive study content</p>
              </div>
              <BookOpen className="w-8 h-8 text-indigo-400" />
            </div>
          </button>

          <button className="p-4 bg-white rounded-xl border border-gray-200 hover:border-purple-400 hover:shadow-md transition-all duration-200 text-left group">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-purple-600">Get AI Help</h3>
                <p className="text-sm text-gray-500 mt-1">Chat with AI assistant</p>
              </div>
              <MessageSquare className="w-8 h-8 text-green-400" />
            </div>
          </button>
        </div>
      </div>

      {/* AI Credits Banner */}
      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Info className="w-5 h-5 text-yellow-600 mr-3" />
            <div>
              <p className="text-sm font-semibold text-gray-900">AI Credits: 850 remaining</p>
              <p className="text-xs text-gray-600 mt-1">Resets in 15 days. Upgrade for unlimited access.</p>
            </div>
          </div>
          <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium">
            Upgrade Plan
          </button>
        </div>
      </div>
    </div>
  );
}