import { useState } from 'react';
import { JobApplicationFormData, JobApplication, ApplicationQA } from '@/types/jobApplication';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { X, Plus, Edit, FileText, Copy, Wand2, MessageCircleQuestion, Trash2, Save, Handshake, ExternalLink, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ApplicationActionLog } from '@/components/ApplicationActionLog';

interface JobApplicationFormProps {
  onSubmit: (data: JobApplicationFormData) => void;
  onCancel: () => void;
  editingApplication?: JobApplication | null;
}

export function JobApplicationForm({ onSubmit, onCancel, editingApplication }: JobApplicationFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);
  const [isTailoringCV, setIsTailoringCV] = useState(false);
  const [tailoringResult, setTailoringResult] = useState<string | null>(null);
  const [isTailoringResultOpen, setIsTailoringResultOpen] = useState(false);
  const [isAnswerOpen, setIsAnswerOpen] = useState(false);
  const [employerQuestion, setEmployerQuestion] = useState('');
  const [isAnswering, setIsAnswering] = useState(false);
  const [answerResult, setAnswerResult] = useState<string | null>(null);
  const [isDiscussOfferOpen, setIsDiscussOfferOpen] = useState(false);
  const [offerTopic, setOfferTopic] = useState('');
  const [isDiscussingOffer, setIsDiscussingOffer] = useState(false);
  const [offerDiscussionResult, setOfferDiscussionResult] = useState<string | null>(null);
  const [generatedCoverLetter, setGeneratedCoverLetter] = useState<string | null>(
    editingApplication?.coverLetter || null
  );
  const [isCoverLetterOpen, setIsCoverLetterOpen] = useState(false);
  const [savedQuestions, setSavedQuestions] = useState<ApplicationQA[]>(
    editingApplication?.questions || []
  );
  const [editableAnswer, setEditableAnswer] = useState('');
  const [editableOfferDiscussion, setEditableOfferDiscussion] = useState('');
  const [showFullForm, setShowFullForm] = useState(!!editingApplication);
  const [formData, setFormData] = useState<JobApplicationFormData>({
    company: editingApplication?.company || '',
    role: editingApplication?.role || '',
    recruiterName: editingApplication?.recruiterName || '',
    salary: editingApplication?.salary || '',
    salaryOffered: editingApplication?.salaryOffered ?? false,
    requestedSalary: editingApplication?.requestedSalary || '',
    salaryCurrency: editingApplication?.salaryCurrency || 'USD',
    salaryPeriod: editingApplication?.salaryPeriod || 'monthly',
    jobLink: editingApplication?.jobLink || '',
    status: editingApplication?.status || 'submitted',
    priority: editingApplication?.priority || 'medium',
    applicationDate: editingApplication?.applicationDate || new Date().toISOString().split('T')[0],
    notes: editingApplication?.notes || '',
    jobContent: editingApplication?.jobContent || '',
    coverLetter: editingApplication?.coverLetter || '',
  });


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company.trim() || !formData.role.trim()) return;
    onSubmit({
      ...formData,
      coverLetter: generatedCoverLetter || undefined,
      questions: savedQuestions,
    });
  };


  const handleChange = (field: keyof JobApplicationFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerateCoverLetter = async () => {
    if (!formData.jobContent) {
      toast({
        title: "Error",
        description: "Job content is required",
        variant: "destructive",
      });
      return;
    }
    if (!user?.email) {
      toast({
        title: "Error",
        description: "Could not get user email",
        variant: "destructive",
      });
      return;
    }
    setIsGeneratingCoverLetter(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-cover-letter', {
        body: { jobContent: formData.jobContent },
      });
      if (error) throw new Error(error.message);
      console.log('generate-cover-letter response:', data);
      const coverLetter = (
        data?.["Cover letter"] ??
        data?.coverLetter ??
        data?.data?.["Cover letter"] ??
        (Array.isArray(data) ? data.find((x: any) => x?.["Cover letter"])?.["Cover letter"] : undefined)
      );
      if (coverLetter) {
        setGeneratedCoverLetter(coverLetter);
        setIsCoverLetterOpen(true);
        toast({ title: "Cover Letter generated", description: "Cover letter created successfully!" });
      } else {
        throw new Error("No cover letter received");
      }
    } catch (error) {
      console.error('Error generating cover letter:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Could not generate the cover letter.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingCoverLetter(false);
    }
  };

  const handleTailorCV = async () => {
    if (!formData.jobContent) {
      toast({
        title: "Error",
        description: "Job content is required to tailor your CV",
        variant: "destructive",
      });
      return;
    }
    setIsTailoringCV(true);
    try {
      const { data, error } = await supabase.functions.invoke('tailor-cv', {
        body: { jobContent: formData.jobContent, role: formData.role, company: formData.company },
      });
      if (error) throw new Error(error.message);
      const answer = data?.answer || data?.response || data?.output || data?.text || data?.message || 'No recommendations received';
      setTailoringResult(answer);
      setIsTailoringResultOpen(true);
      toast({ title: "CV Tailoring Complete", description: "Your recommendations are ready!" });
    } catch (error) {
      console.error('Error tailoring CV:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Could not tailor your CV.",
        variant: "destructive",
      });
    } finally {
      setIsTailoringCV(false);
    }
  };

  const handleAnswerQuestion = async () => {
    if (!employerQuestion.trim()) {
      toast({ title: "Error", description: "Please enter a question", variant: "destructive" });
      return;
    }
    setIsAnswering(true);
    setAnswerResult(null);
    setEditableAnswer('');
    try {
      const { data, error } = await supabase.functions.invoke('answer-question', {
        body: {
          question: employerQuestion,
          role: formData.role,
          company: formData.company,
          jobContent: formData.jobContent,
        },
      });
      if (error) throw new Error(error.message);
      const answer = data?.answer || data?.response || data?.output || data?.text || data?.message || 'No answer received';
      setAnswerResult(answer);
      setEditableAnswer(answer);
    } catch (error) {
      console.error('Error answering question:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Could not generate answer.",
        variant: "destructive",
      });
    } finally {
      setIsAnswering(false);
    }
  };

  const handleDiscussOffer = async () => {
    if (!offerTopic.trim()) {
      toast({ title: "Error", description: "Please enter a topic to discuss", variant: "destructive" });
      return;
    }
    setIsDiscussingOffer(true);
    setOfferDiscussionResult(null);
    setEditableOfferDiscussion('');
    try {
      const { data, error } = await supabase.functions.invoke('discuss-offer', {
        body: {
          topic: offerTopic,
          role: formData.role,
          company: formData.company,
          jobContent: formData.jobContent,
          salary: formData.salary,
          requestedSalary: formData.requestedSalary,
          salaryCurrency: formData.salaryCurrency,
          salaryPeriod: formData.salaryPeriod,
        },
      });
      if (error) throw new Error(error.message);
      const answer = data?.answer || data?.response || data?.output || data?.text || data?.message || 'No response received';
      setOfferDiscussionResult(answer);
      setEditableOfferDiscussion(answer);
    } catch (error) {
      console.error('Error discussing offer:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Could not discuss the offer.",
        variant: "destructive",
      });
    } finally {
      setIsDiscussingOffer(false);
    }
  };

  const handleSaveQuestion = () => {
    const q = employerQuestion.trim();
    const a = editableAnswer.trim();
    if (!q || !a) {
      toast({ title: "Missing info", description: "Both question and answer are required.", variant: "destructive" });
      return;
    }
    const entry: ApplicationQA = {
      id: (globalThis.crypto?.randomUUID?.() ?? String(Date.now())),
      question: q,
      answer: a,
      createdAt: new Date().toISOString(),
    };
    setSavedQuestions(prev => [...prev, entry]);
    toast({ title: "Saved", description: "Question and answer added to this application." });
    setEmployerQuestion('');
    setAnswerResult(null);
    setEditableAnswer('');
    setIsAnswerOpen(false);
  };

  const handleDeleteQuestion = (id: string) => {
    setSavedQuestions(prev => prev.filter(q => q.id !== id));
  };


  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto bg-gradient-card">
        <CardHeader className="border-b bg-gradient-primary text-primary-foreground">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {editingApplication ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              {editingApplication ? 'Edit Application' : 'New Application'}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-primary-foreground hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="company">Company *</Label>
              <div className="flex gap-2">
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => handleChange('company', e.target.value)}
                  placeholder="e.g. Google, Microsoft..."
                  required
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowFullForm(true)}
                  disabled={!formData.company.trim()}
                  className="shrink-0"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Research company
                </Button>
              </div>
            </div>

            {showFullForm && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="role">Role / Position *</Label>
                  <Input
                    id="role"
                    value={formData.role}
                    onChange={(e) => handleChange('role', e.target.value)}
                    placeholder="e.g. Frontend Developer..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recruiterName">Recruiter / Contact</Label>
                  <Input
                    id="recruiterName"
                    value={formData.recruiterName}
                    onChange={(e) => handleChange('recruiterName', e.target.value)}
                    placeholder="Recruiter name"
                  />
                </div>

                ...

                <div className="flex gap-3 pt-4">
                  <Button type="submit" className="flex-1 bg-gradient-primary">
                    {editingApplication ? 'Update' : 'Save'} Application
                  </Button>
                  <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
