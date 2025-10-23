import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { Card } from "../components/ui/Card";
import { Label } from "../components/ui/Label";
import { Plus, ArrowLeft, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "../services/api";
import { useAuthStore } from "../stores/authStore";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";


interface LessonContent {
    theory: string;
    tips: string[];
    keyTerms: string[];
    objectives: string[];
    feedbackMessages: string[];
    curriculumAlignment: {
        description: string;
        standardCode: string;
    }[];
}

interface Lesson {
    id: string;
    title: string;
    type: "video" | "text" | "quiz" | "exercise";
    duration: number;
    content: LessonContent;
}

interface Module {
    id: string;
    title: string;
    description: string;
    difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
    estimatedHours: number;
    lessons: Lesson[];
    status: "DRAFT" | "PUBLISHED";
}

const ModuleEdit = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();

    const [module, setModule] = useState<Module | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchModule();
    }, [id]);

    const fetchModule = async () => {
        try {
            const response = await api.get(`/study-modules/${id}`);
            const data = response.data?.data || response.data;

            const lessons: Lesson[] = (data.lessons || []).map((l: any) => {
                const content: any = typeof l.content === "string" ? JSON.parse(l.content) : l.content || {};
                return {
                    ...l,
                    content: {
                        theory: content.theory || "",
                        tips: Array.isArray(content.tips) ? content.tips : [],
                        keyTerms: Array.isArray(content.keyTerms) ? content.keyTerms : [],
                        objectives: Array.isArray(content.objectives) ? content.objectives : [],
                        feedbackMessages: Array.isArray(content.feedbackMessages) ? content.feedbackMessages : [],
                        curriculumAlignment: Array.isArray(content.curriculumAlignment) ? content.curriculumAlignment : [],
                    },
                };
            });

            data.lessons = lessons;
            setModule(data);
        } catch (error) {
            console.error("Error fetching module:", error);
            toast.error("Failed to load module");
            navigate("/modules");
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field: keyof Module, value: any) => {
        if (!module) return;
        setModule({ ...module, [field]: value });
    };

    const handleLessonChange = (index: number, field: keyof Lesson, value: any) => {
        if (!module) return;
        const updatedLessons = [...module.lessons];
        updatedLessons[index] = { ...updatedLessons[index], [field]: value };
        setModule({ ...module, lessons: updatedLessons });
    };

    const handleContentChange = (lessonIndex: number, field: keyof LessonContent, value: any) => {
        if (!module) return;
        const updatedLessons = [...module.lessons];
        updatedLessons[lessonIndex] = {
            ...updatedLessons[lessonIndex],
            content: {
                ...updatedLessons[lessonIndex].content,
                [field]: value,
            },
        };
        setModule({ ...module, lessons: updatedLessons });
    };

    const addArrayItem = (lessonIndex: number, field: keyof LessonContent) => {
        if (!module) return;
        const lesson = module.lessons[lessonIndex];
        const currentArray = lesson.content[field] as any[];

        if (field === "curriculumAlignment") {
            handleContentChange(lessonIndex, field, [...currentArray, { description: "", standardCode: "" }]);
        } else {
            handleContentChange(lessonIndex, field, [...currentArray, ""]);
        }
    };

    const updateArrayItem = (lessonIndex: number, field: keyof LessonContent, itemIndex: number, value: any) => {
        if (!module) return;
        const lesson = module.lessons[lessonIndex];
        const currentArray = [...(lesson.content[field] as any[])];
        currentArray[itemIndex] = value;
        handleContentChange(lessonIndex, field, currentArray);
    };

    const removeArrayItem = (lessonIndex: number, field: keyof LessonContent, itemIndex: number) => {
        if (!module) return;
        const lesson = module.lessons[lessonIndex];
        const currentArray = lesson.content[field] as any[];
        handleContentChange(
            lessonIndex,
            field,
            currentArray.filter((_, i) => i !== itemIndex)
        );
    };

    const addLesson = () => {
        if (!module) return;
        const newLesson: Lesson = {
            id: crypto.randomUUID(),
            title: "",
            type: "text",
            duration: 10,
            content: {
                theory: "",
                tips: [],
                keyTerms: [],
                objectives: [],
                feedbackMessages: [],
                curriculumAlignment: [],
            },
        };
        setModule({ ...module, lessons: [...module.lessons, newLesson] });
    };

    const removeLesson = (index: number) => {
        if (!module) return;
        if (module.lessons.length === 1) {
            toast.error("A module must have at least one lesson");
            return;
        }
        setModule({ ...module, lessons: module.lessons.filter((_, i) => i !== index) });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!module) return;

        if (!module.title.trim()) {
            toast.error("Please enter a module title");
            return;
        }
        if (module.lessons.some((l) => !l.title.trim())) {
            toast.error("All lessons must have titles");
            return;
        }

        try {
            const payload = {
                ...module,
                lessons: module.lessons.map((l) => ({ ...l, content: JSON.stringify(l.content) })),
            };
            console.log("Submitting module update with payload:", payload); // 👈 Add this
            await api.put(`/study-modules/${id}`, payload);
            toast.success("Module updated successfully!");
            navigate(`/modules/${id}`);
        } catch (error) {
            console.error("Error updating module:", error);
            toast.error("Failed to update module");
        }
    };

    if (loading)
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin h-12 w-12 border-b-2 border-primary rounded-full"></div>
            </div>
        );

    if (!module)
        return (
            <div className="flex flex-col items-center justify-center h-screen text-center">
                <h2 className="text-2xl font-bold mb-4">Module not found</h2>
                <Button onClick={() => navigate("/modules")}>Back to Modules</Button>
            </div>
        );

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <Button variant="ghost" className="mb-4 flex items-center gap-2" onClick={() => navigate("/modules")}>
                <ArrowLeft size={18} /> Back to Modules
            </Button>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Module Title */}
                <Card className="p-4 bg-white">
                    <Label htmlFor="title">Module Title</Label>
                    <Input
                        id="title"
                        value={module.title}
                        onChange={(e) => handleInputChange("title", e.target.value)}
                        placeholder="Enter module title"
                    />
                </Card>

                {/* Module Description */}
                <Card className="p-4 bg-white">
                    <Label>Module Description</Label>
                    <Textarea
                        value={module.description}
                        onChange={(e) => handleInputChange("description", e.target.value)}
                        placeholder="Enter module description"
                    />
                </Card>

                {/* Lessons */}
                <div className="space-y-6">
                    {module.lessons.map((lesson, lessonIndex) => (
                        <Card key={lesson.id} className="p-6 bg-white">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-semibold">Lesson {lessonIndex + 1}</h3>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => removeLesson(lessonIndex)}
                                    type="button"
                                >
                                    <Trash2 size={16} />
                                </Button>
                            </div>

                            {/* Lesson Title */}
                            <div className="mb-4">
                                <Label>Lesson Title</Label>
                                <Input
                                    value={lesson.title}
                                    onChange={(e) => handleLessonChange(lessonIndex, "title", e.target.value)}
                                    placeholder="Lesson title"
                                />
                            </div>

                            {/* Theory / Description Content */}
                            <div className="mb-4">
                                <Label>Lesson Content</Label>
                                <ReactQuill
                                    theme="snow"
                                    value={lesson.content.theory}
                                    onChange={(content) => {
                                        if (content !== lesson.content.theory) {
                                            handleContentChange(lessonIndex, "theory", content);
                                        }
                                    }}
                                    placeholder="Write your lesson content here..."
                                />

                            </div>

                            {/* Objectives */}
                            <div className="mb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <Label>Learning Objectives</Label>
                                    <Button type="button" size="sm" variant="outline" onClick={() => addArrayItem(lessonIndex, "objectives")}>
                                        <Plus size={16} /> Add Objective
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    {lesson.content.objectives.map((objective, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <Input
                                                value={objective}
                                                onChange={(e) => updateArrayItem(lessonIndex, "objectives", idx, e.target.value)}
                                                placeholder={`Objective ${idx + 1}`}
                                            />
                                            <Button type="button" variant="ghost" size="sm" onClick={() => removeArrayItem(lessonIndex, "objectives", idx)}>
                                                <X size={16} />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Tips */}
                            <div className="mb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <Label>Tips</Label>
                                    <Button type="button" size="sm" variant="outline" onClick={() => addArrayItem(lessonIndex, "tips")}>
                                        <Plus size={16} /> Add Tip
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    {lesson.content.tips.map((tip, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <Input
                                                value={tip}
                                                onChange={(e) => updateArrayItem(lessonIndex, "tips", idx, e.target.value)}
                                                placeholder={`Tip ${idx + 1}`}
                                            />
                                            <Button type="button" variant="ghost" size="sm" onClick={() => removeArrayItem(lessonIndex, "tips", idx)}>
                                                <X size={16} />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Key Terms */}
                            <div className="mb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <Label>Key Terms</Label>
                                    <Button type="button" size="sm" variant="outline" onClick={() => addArrayItem(lessonIndex, "keyTerms")}>
                                        <Plus size={16} /> Add Term
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    {lesson.content.keyTerms.map((term, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <Input
                                                value={term}
                                                onChange={(e) => updateArrayItem(lessonIndex, "keyTerms", idx, e.target.value)}
                                                placeholder={`Key term ${idx + 1}`}
                                            />
                                            <Button type="button" variant="ghost" size="sm" onClick={() => removeArrayItem(lessonIndex, "keyTerms", idx)}>
                                                <X size={16} />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Feedback Messages */}
                            <div className="mb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <Label>Feedback Messages</Label>
                                    <Button type="button" size="sm" variant="outline" onClick={() => addArrayItem(lessonIndex, "feedbackMessages")}>
                                        <Plus size={16} /> Add Message
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    {lesson.content.feedbackMessages.map((message, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <Input
                                                value={message}
                                                onChange={(e) => {
                                                    if (e.target.value !== message) {
                                                        updateArrayItem(lessonIndex, "feedbackMessages", idx, e.target.value)
                                                    }
                                                }
                                                }
                                                placeholder={`Feedback message ${idx + 1}`}
                                            />
                                            <Button type="button" variant="ghost" size="sm" onClick={() => removeArrayItem(lessonIndex, "feedbackMessages", idx)}>
                                                <X size={16} />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Curriculum Alignment */}
                            <div className="mb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <Label>Curriculum Alignment</Label>
                                    <Button type="button" size="sm" variant="outline" onClick={() => addArrayItem(lessonIndex, "curriculumAlignment")}>
                                        <Plus size={16} /> Add Alignment
                                    </Button>
                                </div>
                                <div className="space-y-3">
                                    {lesson.content.curriculumAlignment.map((alignment, idx) => (
                                        <Card key={idx} className="p-3">
                                            <div className="flex justify-between items-start mb-2">
                                                <Label className="text-sm">Alignment {idx + 1}</Label>
                                                <Button type="button" variant="ghost" size="sm" onClick={() => removeArrayItem(lessonIndex, "curriculumAlignment", idx)}>
                                                    <X size={16} />
                                                </Button>
                                            </div>
                                            <div className="space-y-2">
                                                <Input
                                                    value={alignment.standardCode}
                                                    onChange={(e) =>
                                                        updateArrayItem(lessonIndex, "curriculumAlignment", idx, { ...alignment, standardCode: e.target.value })
                                                    }
                                                    placeholder="Standard code (e.g., CCSS.MATH.1.OA.A.1)"
                                                />
                                                <ReactQuill
                                                    theme="snow"
                                                    value={alignment.description}
                                                    onChange={(content) => {
                                                        if (content !== alignment.description) {
                                                            updateArrayItem(
                                                                lessonIndex,
                                                                "curriculumAlignment",
                                                                idx,
                                                                { ...alignment, description: content }
                                                            );
                                                        }
                                                    }}
                                                    placeholder="Description of how this lesson aligns with the standard"
                                                />
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>

                <div  className="flex justify-between items-center">
                    {/* Add Lesson Button */}
                    <Button type="button" onClick={addLesson} className="bg-gray-700 text-white flex items-center gap-2">
                        <Plus size={16} /> Add Lesson
                    </Button>

                    {/* Save Module Button */}
                    <Button type="submit" className="bg-gray-700 text-white flex items-center gap-2">
                        Save Module
                    </Button>
                </div>

            </form>
        </div>
    );
};

export default ModuleEdit;