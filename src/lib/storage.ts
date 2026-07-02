import { JobApplication, JobApplicationFormData } from '@/types/jobApplication';
import { supabase } from '@/integrations/supabase/client';

export const jobApplicationStorage = {
  getAll: async (): Promise<JobApplication[]> => {
    try {
      const { data, error } = await supabase
        .from('job_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading job applications:', error);
        return [];
      }

      return data?.map(app => ({
        id: app.id,
        company: app.company,
        role: app.role,
        recruiterName: app.recruiter_name,
        salary: app.salary,
        jobLink: app.job_link,
        status: app.status as JobApplication['status'],
        priority: app.priority as JobApplication['priority'],
        applicationDate: app.application_date,
        notes: app.notes,
        jobContent: app.job_content,
        coverLetter: app.cover_letter,
        createdAt: app.created_at,
        updatedAt: app.updated_at,
        statusChangedAt: (app as any).status_changed_at ?? app.updated_at,
      })) || [];
    } catch (error) {
      console.error('Error loading job applications:', error);
      return [];
    }
  },

  // Remove save method as we'll save directly to Supabase

  add: async (formData: JobApplicationFormData): Promise<JobApplication | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('User not authenticated');
        return null;
      }

      const { data, error } = await supabase
        .from('job_applications')
        .insert({
          user_id: user.id,
          company: formData.company,
          role: formData.role,
          recruiter_name: formData.recruiterName,
          salary: formData.salary,
          job_link: formData.jobLink,
          status: formData.status,
          priority: formData.priority,
          application_date: formData.applicationDate,
          notes: formData.notes,
          job_content: formData.jobContent,
          cover_letter: formData.coverLetter
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding job application:', error);
        return null;
      }

      return {
        id: data.id,
        company: data.company,
        role: data.role,
        recruiterName: data.recruiter_name,
        salary: data.salary,
        jobLink: data.job_link,
        status: data.status as JobApplication['status'],
        priority: data.priority as JobApplication['priority'],
        applicationDate: data.application_date,
        notes: data.notes,
        jobContent: data.job_content,
        coverLetter: data.cover_letter,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        statusChangedAt: (data as any).status_changed_at ?? data.updated_at,
      };
    } catch (error) {
      console.error('Error adding job application:', error);
      return null;
    }
  },

  update: async (id: string, updates: Partial<JobApplicationFormData>): Promise<JobApplication | null> => {
    try {
      const updateData: Record<string, any> = {};
      if (updates.company !== undefined) updateData.company = updates.company;
      if (updates.role !== undefined) updateData.role = updates.role;
      if (updates.recruiterName !== undefined) updateData.recruiter_name = updates.recruiterName;
      if (updates.salary !== undefined) updateData.salary = updates.salary;
      if (updates.jobLink !== undefined) updateData.job_link = updates.jobLink;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.priority !== undefined) updateData.priority = updates.priority;
      if (updates.applicationDate !== undefined) updateData.application_date = updates.applicationDate;
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      if (updates.jobContent !== undefined) updateData.job_content = updates.jobContent;
      if (updates.coverLetter !== undefined) updateData.cover_letter = updates.coverLetter;

      console.log('Updating job application:', id, 'with data:', updateData);
      
      const { data, error } = await supabase
        .from('job_applications')
        .update(updateData)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) {
        console.error('Error updating job application:', error);
        return null;
      }

      if (!data) {
        console.error('No data returned from update - possible RLS issue or record not found');
        return null;
      }

      return {
        id: data.id,
        company: data.company,
        role: data.role,
        recruiterName: data.recruiter_name,
        salary: data.salary,
        jobLink: data.job_link,
        status: data.status as JobApplication['status'],
        priority: data.priority as JobApplication['priority'],
        applicationDate: data.application_date,
        notes: data.notes,
        jobContent: data.job_content,
        coverLetter: data.cover_letter,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        statusChangedAt: (data as any).status_changed_at ?? data.updated_at,
      };
    } catch (error) {
      console.error('Error updating job application:', error);
      return null;
    }
  },

  delete: async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('job_applications')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting job application:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting job application:', error);
      return false;
    }
  },

  exportToCSV: async (): Promise<string> => {
    const applications = await jobApplicationStorage.getAll();
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