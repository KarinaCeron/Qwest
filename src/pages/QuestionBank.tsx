import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Search, Sparkles } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Question = {
  category: string;
  question: string;
  answerFocus: string;
  tags: string[];
};

const QUESTIONS: Question[] = [
  {
    category: 'Motivation',
    question: 'Tell me about yourself.',
    answerFocus: 'Connect your current role, strongest achievements, and the type of impact you want to make next.',
    tags: ['intro', 'screening'],
  },
  {
    category: 'Motivation',
    question: 'Why are you interested in this role?',
    answerFocus: 'Mention the responsibilities that match your skills and the problems you are excited to solve.',
    tags: ['fit', 'screening'],
  },
  {
    category: 'Motivation',
    question: 'Why do you want to work at this company?',
    answerFocus: 'Reference the company mission, product, market, or culture with one specific reason.',
    tags: ['company', 'culture'],
  },
  {
    category: 'Motivation',
    question: 'What are you looking for in your next opportunity?',
    answerFocus: 'Keep it positive and align your answer with growth, scope, team, and contribution.',
    tags: ['career goals'],
  },
  {
    category: 'Experience',
    question: 'Walk me through your most relevant experience for this job.',
    answerFocus: 'Select two or three experiences that map directly to the job description.',
    tags: ['cv', 'role fit'],
  },
  {
    category: 'Experience',
    question: 'What achievement are you most proud of?',
    answerFocus: 'Use a measurable result and explain your personal contribution.',
    tags: ['impact', 'metrics'],
  },
  {
    category: 'Experience',
    question: 'Describe a project where you had to learn something quickly.',
    answerFocus: 'Show your learning process, resources used, and the outcome.',
    tags: ['adaptability'],
  },
  {
    category: 'Experience',
    question: 'What tools, systems, or methods do you use most confidently?',
    answerFocus: 'Prioritize the tools named in the job post and add context about how you used them.',
    tags: ['skills', 'technical'],
  },
  {
    category: 'Behavioral',
    question: 'Tell me about a time you handled a difficult stakeholder.',
    answerFocus: 'Use situation, action, result; emphasize listening, alignment, and follow-through.',
    tags: ['STAR', 'communication'],
  },
  {
    category: 'Behavioral',
    question: 'Tell me about a time you made a mistake.',
    answerFocus: 'Own the mistake, explain the fix, and describe what changed afterward.',
    tags: ['ownership', 'learning'],
  },
  {
    category: 'Behavioral',
    question: 'How do you prioritize when everything feels urgent?',
    answerFocus: 'Explain how you assess impact, deadlines, dependencies, and communicate trade-offs.',
    tags: ['prioritization'],
  },
  {
    category: 'Behavioral',
    question: 'Describe a conflict you had at work and how you resolved it.',
    answerFocus: 'Avoid blame; show how you clarified goals and reached a practical agreement.',
    tags: ['conflict', 'teamwork'],
  },
  {
    category: 'Strengths',
    question: 'What are your greatest strengths?',
    answerFocus: 'Pick strengths that matter for the role and support each one with evidence.',
    tags: ['self-awareness'],
  },
  {
    category: 'Strengths',
    question: 'What is one area you are working to improve?',
    answerFocus: 'Choose a real but non-critical area and describe your improvement plan.',
    tags: ['growth'],
  },
  {
    category: 'Strengths',
    question: 'How would your teammates describe you?',
    answerFocus: 'Use traits that show reliability, collaboration, and delivery.',
    tags: ['teamwork'],
  },
  {
    category: 'Logistics',
    question: 'What are your salary expectations?',
    answerFocus: 'Give a researched range, mention flexibility, and anchor it to role scope.',
    tags: ['compensation'],
  },
  {
    category: 'Logistics',
    question: 'When could you start?',
    answerFocus: 'Be clear about notice period, transition needs, and realistic availability.',
    tags: ['availability'],
  },
  {
    category: 'Logistics',
    question: 'Are you interviewing with other companies?',
    answerFocus: 'Be honest at a high level and reinforce your interest in this role.',
    tags: ['process'],
  },
  {
    category: 'Logistics',
    question: 'Why are you leaving your current role?',
    answerFocus: 'Stay professional and focus on what you are moving toward.',
    tags: ['transition'],
  },
  {
    category: 'Closing',
    question: 'Do you have any questions for us?',
    answerFocus: 'Ask about success metrics, team priorities, hiring timeline, or current challenges.',
    tags: ['candidate questions'],
  },
  {
    category: 'Closing',
    question: 'What would success look like in the first 90 days?',
    answerFocus: 'Use this as a question to ask the interviewer and learn their expectations.',
    tags: ['ask interviewer'],
  },
  {
    category: 'Closing',
    question: 'What are the biggest challenges facing the team right now?',
    answerFocus: 'Use this as a question to uncover priorities and position your experience.',
    tags: ['ask interviewer'],
  },
];

const categories = ['All', ...Array.from(new Set(QUESTIONS.map((q) => q.category)))];

export default function QuestionBank() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [loading, user, navigate]);

  const filteredQuestions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return QUESTIONS.filter((item) => {
      const matchesCategory = category === 'All' || item.category === category;
      const matchesSearch =
        !term ||
        item.question.toLowerCase().includes(term) ||
        item.answerFocus.toLowerCase().includes(term) ||
        item.tags.some((tag) => tag.toLowerCase().includes(term));
      return matchesCategory && matchesSearch;
    });
  }, [category, search]);

  const copyQuestion = async (question: string) => {
    await navigator.clipboard.writeText(question);
    toast({ title: '📋 Question copied' });
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader subtitle="Question Bank" />

      <main className="container mx-auto max-w-5xl px-4 py-8">
        <Card className="bg-gradient-card">
          <CardHeader className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-secondary p-2 text-secondary-foreground">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-2xl">Common job application questions</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Search by topic, copy a question, and prepare a focused answer before each application or interview.
                </p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_220px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search questions, tags, or answer focus..."
                  className="pl-9"
                />
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {filteredQuestions.length === 0 ? (
              <div className="rounded-lg border p-8 text-center text-muted-foreground">
                No questions match your search.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredQuestions.map((item) => (
                  <article key={`${item.category}-${item.question}`} className="rounded-lg border bg-card p-4 shadow-sm">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <Badge variant="secondary">{item.category}</Badge>
                      <Button variant="ghost" size="icon" onClick={() => copyQuestion(item.question)} title="Copy question">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <h2 className="text-base font-semibold leading-snug text-foreground">{item.question}</h2>
                    <p className="mt-3 text-sm text-muted-foreground">{item.answerFocus}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {item.tags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}