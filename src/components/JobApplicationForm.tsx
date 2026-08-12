import { useState } from 'react';
import { JobApplicationFormData, JobApplication, ApplicationQA, ApplicationBenefit, ApplicationInterviewQuestion } from '@/types/jobApplication';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { X, Plus, Edit, FileText, Copy, Wand2, MessageCircleQuestion, Trash2, Save, Handshake, ExternalLink, Search, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ApplicationActionLog } from '@/components/ApplicationActionLog';
import { ApplicationBenefits } from '@/components/ApplicationBenefits';
import { CompanyResearchPanel } from '@/components/CompanyResearchPanel';
import { FormattedText } from '@/components/FormattedText';
import { JobInsights } from '@/components/JobInsights';


const STEPS = ['Company', 'Role', 'Compensation', 'Application', 'Questions', 'Interview questions', 'Action log'];

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
  const [isAnalyzingJob, setIsAnalyzingJob] = useState(false);
  const [jobAnalysis, setJobAnalysis] = useState<string>(editingApplication?.jobInsights || '');
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
  const [benefits, setBenefits] = useState<ApplicationBenefit[]>(
    editingApplication?.benefits || []
  );
  const [interviewQuestions, setInterviewQuestions] = useState<ApplicationInterviewQuestion[]>(
    editingApplication?.interviewQuestions || []
  );
  const [newInterviewQuestion, setNewInterviewQuestion] = useState('');
  const [editableAnswer, setEditableAnswer] = useState('');
  const [editableOfferDiscussion, setEditableOfferDiscussion] = useState('');
  const [step, setStep] = useState(editingApplication ? 1 : 0);
  const [isResearching, setIsResearching] = useState(false);
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companyResearchText, setCompanyResearchText] = useState<string | null>(null);

  const [formData, setFormData] = useState<JobApplicationFormData>({
    company: editingApplication?.company || '',
    role: editingApplication?.role || '',
    recruiterName: editingApplication?.recruiterName || '',
    hiringManagerName: editingApplication?.hiringManagerName || '',
    hiringManagerLinkedIn: editingApplication?.hiringManagerLinkedIn || '',
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
      benefits,
      interviewQuestions,
      jobInsights: jobAnalysis || undefined,
    });
  };


  const handleChange = (field: keyof JobApplicationFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddInterviewQuestions = () => {
    const lines = newInterviewQuestion
      .split('\n')
      .map(l => l.replace(/^[-*•\d.)\s]+/, '').trim())
      .filter(Boolean);
    if (lines.length === 0) return;
    setInterviewQuestions(prev => [
      ...prev,
      ...lines.map(question => ({
        id: crypto.randomUUID(),
        question,
        createdAt: new Date().toISOString(),
      })),
    ]);
    setNewInterviewQuestion('');
  };

  const handleUpdateInterviewQuestion = (id: string, question: string) => {
    setInterviewQuestions(prev => prev.map(q => (q.id === id ? { ...q, question } : q)));
  };

  const handleRemoveInterviewQuestion = (id: string) => {
    setInterviewQuestions(prev => prev.filter(q => q.id !== id));
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

  const handleAnalyzeJob = async () => {
    if (!formData.jobContent) {
      toast({ title: "Error", description: "Job description is required", variant: "destructive" });
      return;
    }
    setIsAnalyzingJob(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-job', {
        body: { jobContent: formData.jobContent, role: formData.role, company: formData.company },
      });
      if (error) throw new Error(error.message);
      const answer = data?.answer || data?.response || data?.output || data?.text || data?.message || '';
      setJobAnalysis(answer || 'No response received from the webhook.');
    } catch (error) {
      console.error('Error analyzing job description:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Could not analyze the job description.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzingJob(false);
    }
  };

  const handleResetJobAnalysis = () => {
    setJobAnalysis('');
    toast({ title: "Analysis reset", description: "Stored job insights cleared. Click Update to save the change." });
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

  const handleResearchCompany = async () => {
    const company = formData.company.trim();
    if (!company) return;
    setStep(0);
    setIsResearching(true);
    setCompanyResearchText(null);
    try {
      const companyKey = company.toLowerCase();
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Use stored research if it already exists for this company
      if (user) {
        const { data: cached } = await supabase
          .from('company_research')
          .select('research_text')
          .eq('user_id', user.id)
          .eq('company_key', companyKey)
          .maybeSingle();

        if (cached?.research_text) {
          setCompanyResearchText(cached.research_text);
          toast({ title: 'Loaded saved research', description: `Showing stored research for ${company}.` });
          return;
        }
      }

      // 2. Otherwise call the webhook
      const { data, error } = await supabase.functions.invoke('research-company', {
        body: { company, website: companyWebsite.trim() || undefined },
      });
      if (error) throw error;
      if (typeof data?.text !== 'string') throw new Error('No research data returned');
      setCompanyResearchText(data.text);

      // 3. Save it for next time
      if (user && data.text.trim()) {
        await supabase.from('company_research').upsert(
          {
            user_id: user.id,
            company,
            company_key: companyKey,
            website: companyWebsite.trim() || null,
            research_text: data.text,
          },
          { onConflict: 'user_id,company_key' },
        );
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Could not research company.',
        variant: 'destructive',
      });
    } finally {
      setIsResearching(false);
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
          <ol className="mb-6 flex flex-wrap items-center gap-2 text-xs">
            {STEPS.map((label, i) => (
              <li key={label} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep(i)}
                  disabled={i > 0 && !formData.company.trim()}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1 transition-colors ${
                    i === step
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="font-semibold">{i + 1}</span>
                  <span>{label}</span>
                </button>
                {i < STEPS.length - 1 && <span className="text-muted-foreground">›</span>}
              </li>
            ))}
          </ol>

          <form onSubmit={handleSubmit} className="space-y-6">
            {step === 0 && (
              <>
            <div className="space-y-2">
              <Label htmlFor="company">Company *</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => handleChange('company', e.target.value)}
                placeholder="e.g. Google, Microsoft..."
                required
                maxLength={120}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyWebsite">Company website</Label>
              <div className="flex gap-2">
                <Input
                  id="companyWebsite"
                  type="url"
                  value={companyWebsite}
                  onChange={(e) => setCompanyWebsite(e.target.value)}
                  placeholder="https://company.com"
                  maxLength={300}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResearchCompany}
                  disabled={!formData.company.trim() || isResearching}
                  className="shrink-0"
                >
                  <Search className="h-4 w-4 mr-2" />
                  {isResearching ? 'Researching...' : 'Research company'}
                </Button>
              </div>
            </div>


            <CompanyResearchPanel
              company={formData.company}
              isLoading={isResearching}
              text={companyResearchText}
            />

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                className="flex-1 bg-gradient-primary"
                onClick={() => setStep(1)}
                disabled={!formData.company.trim()}
              >
                Continue to role
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
              </>
            )}

            {step === 1 && (
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
              <Label htmlFor="jobLink">Job Link</Label>
              <div className="flex gap-2">
                <Input
                  id="jobLink"
                  type="url"
                  value={formData.jobLink}
                  onChange={(e) => handleChange('jobLink', e.target.value)}
                  placeholder="https://..."
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={!formData.jobLink}
                  asChild
                >
                  <a
                    href={formData.jobLink || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open job posting"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>


            <div className="space-y-2">
              <Label htmlFor="jobContent">Job Description</Label>
              <Textarea
                id="jobContent"
                value={formData.jobContent}
                onChange={(e) => handleChange('jobContent', e.target.value)}
                placeholder="Paste the full job description here: requirements, benefits, responsibilities..."
                rows={6}
                className="min-h-[120px]"
              />
              {(
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 mt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full min-h-10 h-auto whitespace-normal px-3 text-center"
                    onClick={handleGenerateCoverLetter}
                    disabled={isGeneratingCoverLetter || !formData.jobContent}
                  >
                    {isGeneratingCoverLetter ? 'Generating...' : '✉️ Create Cover Letter'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full min-h-10 h-auto whitespace-normal px-3 text-center"
                    onClick={handleTailorCV}
                    disabled={isTailoringCV || !formData.jobContent}
                  >
                    {isTailoringCV ? 'Tailoring...' : (
                      <>
                        <Wand2 className="h-4 w-4 mr-2" />
                        Tailor my CV
                      </>
                    )}
                  </Button>



                  <Dialog open={isDiscussOfferOpen} onOpenChange={(open) => {
                    setIsDiscussOfferOpen(open);
                    if (!open) { setOfferTopic(''); setOfferDiscussionResult(null); setEditableOfferDiscussion(''); }
                  }}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" className="w-full min-h-10 h-auto whitespace-normal px-3 text-center">
                        <Handshake className="h-4 w-4 mr-2" />
                        Discuss the Offer
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Handshake className="h-5 w-5" />
                          Discuss the Offer
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 mt-2">
                        <p className="text-sm text-muted-foreground">
                          Describe what you'd like to discuss or negotiate about this offer. We'll use your CV and the position details to draft a professional response.
                        </p>
                        <div className="space-y-2">
                          <Label>Topic</Label>
                          <Textarea
                            value={offerTopic}
                            onChange={(e) => setOfferTopic(e.target.value)}
                            placeholder="e.g. I'd like to negotiate a higher salary or ask about the start date and benefits package..."
                            rows={3}
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={handleDiscussOffer}
                          disabled={isDiscussingOffer || !offerTopic.trim()}
                          className="w-full bg-gradient-primary"
                        >
                          {isDiscussingOffer ? 'Drafting response...' : 'Draft Response'}
                        </Button>
                        {(offerDiscussionResult || editableOfferDiscussion) && (
                          <div className="space-y-2">
                            <Label>Response (editable)</Label>
                            <Textarea
                              value={editableOfferDiscussion}
                              onChange={(e) => setEditableOfferDiscussion(e.target.value)}
                              rows={8}
                              className="min-h-[160px]"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full"
                              onClick={() => {
                                navigator.clipboard.writeText(editableOfferDiscussion);
                                toast({ title: "Copied", description: "Response copied to clipboard" });
                              }}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copy to Clipboard
                            </Button>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="jobAnalysis">Job description insights</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAnalyzeJob}
                  disabled={isAnalyzingJob || !formData.jobContent || !!jobAnalysis}
                >
                  {isAnalyzingJob ? 'Analyzing...' : jobAnalysis ? (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Analyzed
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Analyze job description
                    </>
                  )}
                </Button>
              </div>
              {jobAnalysis ? (
                <div className="rounded-md border bg-muted/30 p-4">
                  <JobInsights text={jobAnalysis} />
                </div>
              ) : (
                <Textarea
                  id="jobAnalysis"
                  value={jobAnalysis}
                  onChange={(e) => setJobAnalysis(e.target.value)}
                  placeholder="Click 'Analyze job description' to get insights here."
                  rows={6}
                  className="min-h-[120px]"
                />
              )}
              {jobAnalysis && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(jobAnalysis);
                      toast({ title: "Copied", description: "Insights copied to clipboard" });
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResetJobAnalysis}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Reset analysis
                  </Button>
                </div>
              )}

            </div>

            

            
            {generatedCoverLetter && (
              <div className="mt-4 p-4 bg-gradient-card border rounded-lg">
                <h4 className="font-semibold mb-2 text-foreground">Generated Cover Letter</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Your cover letter has been generated successfully.
                </p>
                <Sheet open={isCoverLetterOpen} onOpenChange={setIsCoverLetterOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <FileText className="h-4 w-4 mr-2" />
                      View Cover Letter
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[500px] sm:w-[600px]">
                    <SheetHeader>
                      <SheetTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Cover Letter for {formData.company}
                      </SheetTitle>
                    </SheetHeader>
                    <div className="mt-6">
                      <div className="bg-background border rounded-lg p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                        <pre className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">
                          {generatedCoverLetter}
                        </pre>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            navigator.clipboard.writeText(generatedCoverLetter);
                            toast({ title: "Copied", description: "Cover letter copied to clipboard" });
                          }}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy to Clipboard
                        </Button>
                        <Button variant="outline" onClick={() => setIsCoverLetterOpen(false)}>
                          Close
                        </Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            )}

            {tailoringResult && (
              <Sheet open={isTailoringResultOpen} onOpenChange={setIsTailoringResultOpen}>
                <SheetTrigger asChild>
                  <div className="mt-4 p-4 bg-gradient-card border rounded-lg cursor-pointer">
                    <h4 className="font-semibold mb-2 text-foreground">CV Tailoring Recommendations</h4>
                    <p className="text-sm text-muted-foreground mb-3">Your recommendations are ready.</p>
                    <Button variant="outline" className="w-full" type="button">
                      <Wand2 className="h-4 w-4 mr-2" />
                      View Recommendations
                    </Button>
                  </div>
                </SheetTrigger>
                <SheetContent side="right" className="w-[500px] sm:w-[600px]">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <Wand2 className="h-5 w-5" />
                      CV Recommendations for {formData.company}
                    </SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <div className="bg-background border rounded-lg p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">
                        {tailoringResult}
                      </pre>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        className="flex-1"
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(tailoringResult);
                          toast({ title: "Copied", description: "Recommendations copied to clipboard" });
                        }}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy to Clipboard
                      </Button>
                      <Button variant="outline" type="button" onClick={() => setIsTailoringResultOpen(false)}>
                        Close
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>

              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Additional comments about the application..."
                rows={3}
              />
            </div>

            <div className="flex flex-wrap gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setStep(0)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                type="button"
                className="flex-1 bg-gradient-primary"
                onClick={() => setStep(2)}
                disabled={!formData.role.trim()}
              >
                Continue to benefits
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button type="submit" variant="outline">
                {editingApplication ? 'Update' : 'Save'} Application
              </Button>
            </div>
              </>
            )}

            {step === 2 && (
              <>
                <ApplicationBenefits benefits={benefits} onChange={setBenefits} />

                <div className="flex flex-wrap gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 bg-gradient-primary"
                    onClick={() => setStep(3)}
                  >
                    Continue to application
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                  <Button type="submit" variant="outline">
                    {editingApplication ? 'Update' : 'Save'} Application
                  </Button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="recruiterName">Recruiter / Contact</Label>
                  <Input
                    id="recruiterName"
                    value={formData.recruiterName}
                    onChange={(e) => handleChange('recruiterName', e.target.value)}
                    placeholder="Recruiter name"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hiringManagerName">Hiring Manager</Label>
                    <Input
                      id="hiringManagerName"
                      value={formData.hiringManagerName || ''}
                      onChange={(e) => handleChange('hiringManagerName', e.target.value)}
                      placeholder="Hiring manager name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hiringManagerLinkedIn">Hiring Manager LinkedIn</Label>
                    <div className="flex gap-2">
                      <Input
                        id="hiringManagerLinkedIn"
                        type="url"
                        value={formData.hiringManagerLinkedIn || ''}
                        onChange={(e) => handleChange('hiringManagerLinkedIn', e.target.value)}
                        placeholder="https://linkedin.com/in/..."
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={!formData.hiringManagerLinkedIn}
                        asChild
                      >
                        <a
                          href={formData.hiringManagerLinkedIn || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Open hiring manager LinkedIn"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="submitted">📤 Submitted</SelectItem>
                        <SelectItem value="in-progress">⏳ In Progress</SelectItem>
                        <SelectItem value="interview">💼 HR Interview</SelectItem>
                        <SelectItem value="technical-interview">🧪 Technical Interview</SelectItem>
                        <SelectItem value="offer">🎉 Offer</SelectItem>
                        <SelectItem value="rejected">❌ Rejected</SelectItem>
                        <SelectItem value="no-response">⏸️ No Response</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={formData.priority} onValueChange={(value) => handleChange('priority', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">🔴 High</SelectItem>
                        <SelectItem value="medium">🟡 Medium</SelectItem>
                        <SelectItem value="low">🟢 Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="applicationDate">Application Date</Label>
                    <Input
                      id="applicationDate"
                      type="date"
                      value={formData.applicationDate}
                      onChange={(e) => handleChange('applicationDate', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setStep(2)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 bg-gradient-primary"
                    onClick={() => setStep(4)}
                  >
                    Continue to questions
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                  <Button type="submit" variant="outline">
                    {editingApplication ? 'Update' : 'Save'} Application
                  </Button>
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <p className="text-sm text-muted-foreground">
                  Draft and store the questions the employer asked in the application form.
                </p>

                <Dialog open={isAnswerOpen} onOpenChange={(open) => {
                  setIsAnswerOpen(open);
                  if (!open) { setEmployerQuestion(''); setAnswerResult(null); setEditableAnswer(''); }
                }}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" className="w-full">
                      <MessageCircleQuestion className="h-4 w-4 mr-2" />
                      Answer Application Question
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <MessageCircleQuestion className="h-5 w-5" />
                        Answer an employer question
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-2">
                      <p className="text-sm text-muted-foreground">
                        Paste a question from the application form. We'll use your CV and this position's details to draft an answer. You can edit the answer before saving it to this application.
                      </p>
                      <div className="space-y-2">
                        <Label>Question</Label>
                        <Textarea
                          value={employerQuestion}
                          onChange={(e) => setEmployerQuestion(e.target.value)}
                          placeholder="e.g. Why are you interested in this role? Describe a time you led a project..."
                          rows={3}
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={handleAnswerQuestion}
                        disabled={isAnswering || !employerQuestion.trim()}
                        className="w-full bg-gradient-primary"
                      >
                        {isAnswering ? 'Generating answer...' : 'Generate Answer'}
                      </Button>
                      {(answerResult || editableAnswer) && (
                        <div className="space-y-2">
                          <Label>Answer (editable)</Label>
                          <Textarea
                            value={editableAnswer}
                            onChange={(e) => setEditableAnswer(e.target.value)}
                            rows={8}
                            className="min-h-[160px]"
                          />
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              className="flex-1"
                              onClick={() => {
                                navigator.clipboard.writeText(editableAnswer);
                                toast({ title: "Copied", description: "Answer copied to clipboard" });
                              }}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copy
                            </Button>
                            <Button
                              type="button"
                              className="flex-1 bg-gradient-primary"
                              onClick={handleSaveQuestion}
                              disabled={!employerQuestion.trim() || !editableAnswer.trim()}
                            >
                              <Save className="h-4 w-4 mr-2" />
                              Save to Application
                            </Button>
                          </div>
                        </div>
                      )}
                      <div className="pt-2">
                        <p className="text-xs text-muted-foreground">
                          You can also skip generation and paste your own answer above, then click Save to Application.
                        </p>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {savedQuestions.length > 0 ? (
                  <div className="space-y-2">
                    <Label>Saved Questions & Answers ({savedQuestions.length})</Label>
                    <div className="space-y-3">
                      {savedQuestions.map((qa, idx) => (
                        <div key={qa.id} className="border rounded-lg p-3 bg-background/50 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-foreground flex-1">
                              Q{idx + 1}. {qa.question}
                            </p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteQuestion(qa.id)}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              aria-label="Delete question"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <Textarea
                            value={qa.answer}
                            onChange={(e) =>
                              setSavedQuestions(prev =>
                                prev.map(q => (q.id === qa.id ? { ...q, answer: e.target.value } : q))
                              )
                            }
                            rows={4}
                            className="text-sm"
                          />
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(qa.answer);
                                toast({ title: "Copied", description: "Answer copied to clipboard" });
                              }}
                            >
                              <Copy className="h-3.5 w-3.5 mr-1" />
                              Copy answer
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No questions saved yet.</p>
                )}

                <div className="flex flex-wrap gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setStep(3)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 bg-gradient-primary"
                    onClick={() => setStep(5)}
                  >
                    Continue to interview questions
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                  <Button type="submit" variant="outline">
                    {editingApplication ? 'Update' : 'Save'} Application
                  </Button>
                </div>
              </>
            )}

            {step === 5 && (
              <>
                <p className="text-sm text-muted-foreground">
                  Write the questions you want to ask them during the interview.
                </p>

                <div className="space-y-2">
                  <Label htmlFor="newInterviewQuestion">Add questions (one per line)</Label>
                  <Textarea
                    id="newInterviewQuestion"
                    value={newInterviewQuestion}
                    onChange={(e) => setNewInterviewQuestion(e.target.value)}
                    onBlur={handleAddInterviewQuestions}
                    placeholder={'How is success measured in this role?\nWhat does the team structure look like?'}
                    rows={4}
                  />
                  <Button type="button" variant="outline" onClick={handleAddInterviewQuestions}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add questions
                  </Button>
                </div>

                <div className="space-y-3">
                  <Label>My questions for the interview</Label>
                  {interviewQuestions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No interview questions yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {interviewQuestions.map((q, index) => (
                        <div key={q.id} className="flex items-start gap-2">
                          <span className="mt-2 text-sm text-muted-foreground w-5 shrink-0">{index + 1}.</span>
                          <Textarea
                            value={q.question}
                            onChange={(e) => handleUpdateInterviewQuestion(q.id, e.target.value)}
                            rows={2}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveInterviewQuestion(q.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setStep(4)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 bg-gradient-primary"
                    onClick={() => setStep(6)}
                  >
                    Continue to action log
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                  <Button type="submit" variant="outline">
                    {editingApplication ? 'Update' : 'Save'} Application
                  </Button>
                </div>
              </>
            )}

            {step === 6 && (
              <>
                {editingApplication && user ? (
                  <ApplicationActionLog
                    applicationId={editingApplication.id}
                    userId={user.id}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Save this application first — the action log starts tracking dates automatically once it exists.
                  </p>
                )}

                <div className="flex flex-wrap gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setStep(5)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
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
