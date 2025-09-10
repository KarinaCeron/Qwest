import { JobApplication, JobApplicationFormData } from '@/types/jobApplication';

const STORAGE_KEY = 'job_applications';

export const jobApplicationStorage = {
  getAll: (): JobApplication[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading job applications:', error);
      return [];
    }
  },

  save: (applications: JobApplication[]): void => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
    } catch (error) {
      console.error('Error saving job applications:', error);
    }
  },

  add: (formData: JobApplicationFormData): JobApplication => {
    const applications = jobApplicationStorage.getAll();
    const now = new Date().toISOString();
    
    const newApplication: JobApplication = {
      id: crypto.randomUUID(),
      ...formData,
      createdAt: now,
      updatedAt: now,
    };

    applications.push(newApplication);
    jobApplicationStorage.save(applications);
    return newApplication;
  },

  update: (id: string, updates: Partial<JobApplicationFormData>): JobApplication | null => {
    const applications = jobApplicationStorage.getAll();
    const index = applications.findIndex(app => app.id === id);
    
    if (index === -1) return null;

    const updatedApplication = {
      ...applications[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    applications[index] = updatedApplication;
    jobApplicationStorage.save(applications);
    return updatedApplication;
  },

  delete: (id: string): boolean => {
    const applications = jobApplicationStorage.getAll();
    const filteredApplications = applications.filter(app => app.id !== id);
    
    if (filteredApplications.length === applications.length) return false;
    
    jobApplicationStorage.save(filteredApplications);
    return true;
  },

  exportToCSV: (): string => {
    const applications = jobApplicationStorage.getAll();
    if (applications.length === 0) return '';

    const headers = [
      'Empresa',
      'Rol',
      'Recruiter',
      'Salario',
      'Link',
      'Estado',
      'Prioridad',
      'Fecha Postulación',
      'Notas',
      'Fecha Creación'
    ];

    const csvContent = [
      headers.join(','),
      ...applications.map(app => [
        `"${app.company}"`,
        `"${app.role}"`,
        `"${app.recruiterName || ''}"`,
        `"${app.salary || ''}"`,
        `"${app.jobLink || ''}"`,
        `"${app.status}"`,
        `"${app.priority}"`,
        `"${app.applicationDate}"`,
        `"${app.notes || ''}"`,
        `"${new Date(app.createdAt).toLocaleDateString()}"`
      ].join(','))
    ].join('\n');

    return csvContent;
  }
};