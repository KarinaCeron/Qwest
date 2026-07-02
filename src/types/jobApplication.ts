export type ApplicationStatus = 
  | 'applied' 
  | 'in-progress' 
  | 'rejected' 
  | 'no-response'
  | 'interview'
  | 'offer';

export type Priority = 'high' | 'medium' | 'low';

export interface JobApplication {
  id: string;
  company: string;
  role: string;
  recruiterName?: string;
  salary?: string;
  jobLink?: string;
  status: ApplicationStatus;
  priority: Priority;
  applicationDate: string;
  notes?: string;
  jobContent?: string;
  coverLetter?: string;
  createdAt: string;
  updatedAt: string;
  statusChangedAt: string;
}

export interface JobApplicationFormData {
  company: string;
  role: string;
  recruiterName?: string;
  salary?: string;
  jobLink?: string;
  status: ApplicationStatus;
  priority: Priority;
  applicationDate: string;
  notes?: string;
  jobContent?: string;
  coverLetter?: string;
}