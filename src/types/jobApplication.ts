export type ApplicationStatus =
  | 'submitted'
  | 'in-progress'
  | 'interview'
  | 'technical-interview'
  | 'offer'
  | 'rejected'
  | 'no-response';

export type Priority = 'high' | 'medium' | 'low';

export interface JobApplication {
  id: string;
  company: string;
  role: string;
  recruiterName?: string;
  salary?: string;
  salaryOffered?: boolean;
  requestedSalary?: string;
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
  salaryOffered?: boolean;
  requestedSalary?: string;
  jobLink?: string;
  status: ApplicationStatus;
  priority: Priority;
  applicationDate: string;
  notes?: string;
  jobContent?: string;
  coverLetter?: string;
}