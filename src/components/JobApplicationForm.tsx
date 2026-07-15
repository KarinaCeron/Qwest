import { useState } from 'react';
import { JobApplicationFormData, JobApplication } from '@/types/jobApplication';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { X, Plus, Edit, FileText, Copy, Wand2, MessageCircleQuestion } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

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
  const [generatedCoverLetter, setGeneratedCoverLetter] = useState<string | null>(
    editingApplication?.coverLetter || null
  );
  const [isCoverLetterOpen, setIsCoverLetterOpen] = useState(false);
  const [formData, setFormData] = useState<JobApplicationFormData>({
    company: editingApplication?.company || '',
    role: editingApplication?.role || '',
    recruiterName: editingApplication?.recruiterName || '',
    salary: editingApplication?.salary || '',
    salaryOffered: editingApplication?.salaryOffered ?? false,
    requestedSalary: editingApplication?.requestedSalary || '',
    salaryCurrency: editingApplication?.salaryCurrency || 'USD',
    salaryPeriod: editingApplication?.salaryPeriod || 'annual',
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
      coverLetter: generatedCoverLetter || undefined
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company">Company *</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => handleChange('company', e.target.value)}
                  placeholder="e.g. Google, Microsoft..."
                  required
                />
              </div>
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salaryOffered">Salary included in the offer?</Label>
                <Select
                  value={formData.salaryOffered ? 'yes' : 'no'}
                  onValueChange={(value) => handleChange('salaryOffered', value === 'yes')}
                >
                  <SelectTrigger id="salaryOffered">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="yes">Yes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.salaryOffered && (
                <div className="space-y-2">
                  <Label htmlFor="salary">Offered Salary (USD)</Label>
                  <Input
                    id="salary"
                    type="number"
                    value={formData.salary}
                    onChange={(e) => handleChange('salary', e.target.value)}
                    placeholder="45000"
                    min="0"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="requestedSalary">Requested Salary (USD)</Label>
                <Input
                  id="requestedSalary"
                  type="number"
                  value={formData.requestedSalary}
                  onChange={(e) => handleChange('requestedSalary', e.target.value)}
                  placeholder="What you are asking for"
                  min="0"
                />
              </div>
            </div>


            <div className="space-y-2">
              <Label htmlFor="jobLink">Job Link</Label>
              <Input
                id="jobLink"
                type="url"
                value={formData.jobLink}
                onChange={(e) => handleChange('jobLink', e.target.value)}
                placeholder="https://..."
              />
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
              {formData.jobContent && (
                <div className="flex flex-wrap gap-2 mt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1 min-w-[180px]"
                    onClick={handleGenerateCoverLetter}
                    disabled={isGeneratingCoverLetter}
                  >
                    {isGeneratingCoverLetter ? 'Generating...' : '✉️ Create Cover Letter'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 min-w-[180px]"
                    onClick={handleTailorCV}
                    disabled={isTailoringCV}
                  >
                    {isTailoringCV ? 'Tailoring...' : (
                      <>
                        <Wand2 className="h-4 w-4 mr-2" />
                        Tailor my CV
                      </>
                    )}
                  </Button>
                  <Dialog open={isAnswerOpen} onOpenChange={(open) => {
                    setIsAnswerOpen(open);
                    if (!open) { setEmployerQuestion(''); setAnswerResult(null); }
                  }}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" className="flex-1 min-w-[180px]">
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
                          Paste a question from the application form. We'll use your CV and this position's details to draft an answer.
                        </p>
                        <Textarea
                          value={employerQuestion}
                          onChange={(e) => setEmployerQuestion(e.target.value)}
                          placeholder="e.g. Why are you interested in this role? Describe a time you led a project..."
                          rows={4}
                        />
                        <Button
                          type="button"
                          onClick={handleAnswerQuestion}
                          disabled={isAnswering || !employerQuestion.trim()}
                          className="w-full bg-gradient-primary"
                        >
                          {isAnswering ? 'Generating answer...' : 'Generate Answer'}
                        </Button>
                        {answerResult && (
                          <div className="space-y-2">
                            <Label>Suggested Answer</Label>
                            <div className="bg-background border rounded-lg p-4 max-h-[40vh] overflow-y-auto">
                              <pre className="whitespace-pre-wrap text-sm text-foreground leading-relaxed font-sans">
                                {answerResult}
                              </pre>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full"
                              onClick={() => {
                                navigator.clipboard.writeText(answerResult);
                                toast({ title: "Copied", description: "Answer copied to clipboard" });
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

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1 bg-gradient-primary">
                {editingApplication ? 'Update' : 'Save'} Application
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
