export type ApplicationStatus =
  | 'submitted'
  | 'in-progress'
  | 'interview'
  | 'technical-interview'
  | 'offer'
  | 'rejected'
  | 'no-response';

export type Priority = 'high' | 'medium' | 'low';

export type SalaryCurrency = 'USD' | 'COP';
export type SalaryPeriod = 'annual' | 'monthly';

export interface ApplicationQA {
  id: string;
  question: string;
  answer: string;
  createdAt: string;
}

export interface JobApplication {
  id: string;
  company: string;
  role: string;
  recruiterName?: string;
  hiringManagerName?: string;
  hiringManagerLinkedIn?: string;
  salary?: string;
  salaryOffered?: boolean;
  requestedSalary?: string;
  salaryCurrency?: SalaryCurrency;
  salaryPeriod?: SalaryPeriod;
  jobLink?: string;
  status: ApplicationStatus;
  priority: Priority;
  applicationDate: string;
  notes?: string;
  jobContent?: string;
  coverLetter?: string;
  questions?: ApplicationQA[];
  createdAt: string;
  updatedAt: string;
  statusChangedAt: string;
}

export interface JobApplicationFormData {
  company: string;
  role: string;
  recruiterName?: string;
  hiringManagerName?: string;
  hiringManagerLinkedIn?: string;
  salary?: string;
  salaryOffered?: boolean;
  requestedSalary?: string;
  salaryCurrency?: SalaryCurrency;
  salaryPeriod?: SalaryPeriod;
  jobLink?: string;
  status: ApplicationStatus;
  priority: Priority;
  applicationDate: string;
  notes?: string;
  jobContent?: string;
  coverLetter?: string;
  questions?: ApplicationQA[];
}
