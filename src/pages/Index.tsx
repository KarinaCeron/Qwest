import { useState, useEffect, useMemo } from 'react';
import { JobApplication, JobApplicationFormData, ApplicationStatus, Priority } from '@/types/jobApplication';
import { jobApplicationStorage } from '@/lib/storage';
import { JobApplicationCard } from '@/components/JobApplicationCard';
import { JobApplicationForm } from '@/components/JobApplicationForm';
import { JobApplicationFilters } from '@/components/JobApplicationFilters';
import { AppHeader } from '@/components/AppHeader';

import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Briefcase, Clock, MessageSquare, Gift, X, FileX, FlaskConical } from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import emptyStateImage from '@/assets/empty-state.jpg';

import type { FiltersState as JobApplicationFiltersState } from '@/components/JobApplicationFilters';

type DateField = 'created' | 'statusChanged';

interface FiltersState extends JobApplicationFiltersState {}

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingApplication, setEditingApplication] = useState<JobApplication | null>(null);
  
  const [loadingData, setLoadingData] = useState(true);
  const [filters, setFilters] = useState<FiltersState>({
    search: '',
    status: [],
    priority: 'all',
    company: '',
    dateField: 'created',
    dateFrom: '',
    dateTo: '',
  });

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Load applications from Supabase when user is authenticated
  useEffect(() => {
    const loadApplications = async () => {
      if (user) {
        setLoadingData(true);
        const apps = await jobApplicationStorage.getAll();
        setApplications(apps);
        setLoadingData(false);
      }
    };
    
    loadApplications();
  }, [user]);

  // Open application from ?open=<id> query param
  useEffect(() => {
    const openId = searchParams.get('open');
    if (!openId || applications.length === 0) return;
    const app = applications.find((a) => a.id === openId);
    if (app) {
      setEditingApplication(app);
      setShowForm(true);
    }
    searchParams.delete('open');
    setSearchParams(searchParams, { replace: true });
  }, [applications, searchParams, setSearchParams]);


  // Filter applications
  const filteredApplications = useMemo(() => {
    const fromTs = filters.dateFrom ? new Date(filters.dateFrom).getTime() : null;
    const toTs = filters.dateTo ? new Date(filters.dateTo).getTime() + 24 * 60 * 60 * 1000 - 1 : null;

    return applications.filter(app => {
      const matchesSearch = !filters.search ||
        app.company.toLowerCase().includes(filters.search.toLowerCase()) ||
        app.role.toLowerCase().includes(filters.search.toLowerCase()) ||
        app.recruiterName?.toLowerCase().includes(filters.search.toLowerCase());

      const matchesStatus = filters.status.length === 0 || filters.status.includes(app.status);
      const matchesPriority = filters.priority === 'all' || app.priority === filters.priority;
      const matchesCompany = !filters.company || app.company === filters.company;

      const dateStr = filters.dateField === 'statusChanged' ? app.statusChangedAt : app.createdAt;
      const dateTs = dateStr ? new Date(dateStr).getTime() : null;
      const matchesDate =
        (fromTs === null || (dateTs !== null && dateTs >= fromTs)) &&
        (toTs === null || (dateTs !== null && dateTs <= toTs));

      return matchesSearch && matchesStatus && matchesPriority && matchesCompany && matchesDate;
    }).sort((a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime());
  }, [applications, filters]);

  // Get unique companies for filter
  const companies = useMemo(() => {
    return [...new Set(applications.map(app => app.company))].sort();
  }, [applications]);

  // Stats by status — respect date/search/priority/company filters (ignore status filter itself)
  const statsSource = useMemo(() => {
    const fromTs = filters.dateFrom ? new Date(filters.dateFrom).getTime() : null;
    const toTs = filters.dateTo ? new Date(filters.dateTo).getTime() + 24 * 60 * 60 * 1000 - 1 : null;

    return applications.filter(app => {
      const matchesSearch = !filters.search ||
        app.company.toLowerCase().includes(filters.search.toLowerCase()) ||
        app.role.toLowerCase().includes(filters.search.toLowerCase()) ||
        app.recruiterName?.toLowerCase().includes(filters.search.toLowerCase());
      const matchesPriority = filters.priority === 'all' || app.priority === filters.priority;
      const matchesCompany = !filters.company || app.company === filters.company;

      const dateStr = filters.dateField === 'statusChanged' ? app.statusChangedAt : app.createdAt;
      const dateTs = dateStr ? new Date(dateStr).getTime() : null;
      const matchesDate =
        (fromTs === null || (dateTs !== null && dateTs >= fromTs)) &&
        (toTs === null || (dateTs !== null && dateTs <= toTs));

      return matchesSearch && matchesPriority && matchesCompany && matchesDate;
    });
  }, [applications, filters.search, filters.priority, filters.company, filters.dateField, filters.dateFrom, filters.dateTo]);

  const statusStats = useMemo(() => {
    return {
      submitted: statsSource.filter(app => app.status === 'submitted').length,
      inProgress: statsSource.filter(app => app.status === 'in-progress').length,
      interview: statsSource.filter(app => app.status === 'interview').length,
      technicalInterview: statsSource.filter(app => app.status === 'technical-interview').length,
      offer: statsSource.filter(app => app.status === 'offer').length,
      rejected: statsSource.filter(app => app.status === 'rejected').length,
      noResponse: statsSource.filter(app => app.status === 'no-response').length,
    };
  }, [statsSource]);

  const statusCards: Array<{
    key: ApplicationStatus;
    label: string;
    description: string;
    icon: typeof Briefcase;
    iconColor: string;
    ringColor: string;
    count: number;
  }> = [
    { key: 'submitted', label: 'Submitted', description: 'You submitted the job application.', icon: Briefcase, iconColor: 'text-blue-500', ringColor: 'ring-blue-500', count: statusStats.submitted },
    { key: 'in-progress', label: 'In Progress', description: 'The company confirmed receipt and your CV is being reviewed.', icon: Clock, iconColor: 'text-yellow-500', ringColor: 'ring-yellow-500', count: statusStats.inProgress },
    { key: 'interview', label: 'HR Interview', description: 'You got the first interview with HR.', icon: MessageSquare, iconColor: 'text-purple-500', ringColor: 'ring-purple-500', count: statusStats.interview },
    { key: 'technical-interview', label: 'Technical Interview', description: 'You moved on to the technical interview stage.', icon: FlaskConical, iconColor: 'text-indigo-500', ringColor: 'ring-indigo-500', count: statusStats.technicalInterview },
    { key: 'offer', label: 'Offer', description: 'You received an offer.', icon: Gift, iconColor: 'text-green-500', ringColor: 'ring-green-500', count: statusStats.offer },
    { key: 'rejected', label: 'Rejected', description: 'You received a No as an answer.', icon: X, iconColor: 'text-red-500', ringColor: 'ring-red-500', count: statusStats.rejected },
    { key: 'no-response', label: 'No Response', description: 'No news for over a month. Applications land here automatically after 30 days without a status change.', icon: FileX, iconColor: 'text-gray-500', ringColor: 'ring-gray-500', count: statusStats.noResponse },
  ];

  const handleStatusFilter = (status: ApplicationStatus | 'all') => {
    setFilters({
      search: '',
      status: filters.status === status ? 'all' : status,
      priority: 'all',
      company: '',
      dateField: filters.dateField,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    });
  };

  const handleDragStart = (e: React.DragEvent, application: JobApplication) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ id: application.id }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e: React.DragEvent, newStatus: ApplicationStatus) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      const app = applications.find(a => a.id === data.id);
      if (!app || app.status === newStatus) return;

      const formData = {
        company: app.company,
        role: app.role,
        recruiterName: app.recruiterName,
        salary: app.salary,
        jobLink: app.jobLink,
        status: newStatus,
        priority: app.priority,
        applicationDate: app.applicationDate,
        notes: app.notes,
        jobContent: app.jobContent,
        coverLetter: app.coverLetter,
      };

      const updated = await jobApplicationStorage.update(app.id, formData);
      if (updated) {
        setApplications(prev => prev.map(a => a.id === updated.id ? updated : a));
        toast({
          title: "✅ Status updated",
          description: `${app.role} at ${app.company} moved to ${newStatus}`,
        });
      }
    } catch (err) {
      console.error('Drop failed', err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleAddApplication = async (formData: JobApplicationFormData) => {
    const newApp = await jobApplicationStorage.add(formData);
    if (newApp) {
      setApplications(prev => [newApp, ...prev]);
      setShowForm(false);
      toast({
        title: "✅ Application added",
        description: `Added application for ${formData.role} at ${formData.company}`,
      });
    } else {
      toast({
        title: "❌ Error",
        description: "Could not add the application",
        variant: "destructive",
      });
    }
  };

  const handleEditApplication = (application: JobApplication) => {
    setEditingApplication(application);
    setShowForm(true);
  };

  const handleUpdateApplication = async (formData: JobApplicationFormData) => {
    if (!editingApplication) return;
    
    const updated = await jobApplicationStorage.update(editingApplication.id, formData);
    if (updated) {
      setApplications(prev => prev.map(app => app.id === updated.id ? updated : app));
      setShowForm(false);
      setEditingApplication(null);
      toast({
        title: "✅ Application updated",
        description: `Updated application for ${formData.role} at ${formData.company}`,
      });
    } else {
      toast({
        title: "❌ Error",
        description: "Could not update the application",
        variant: "destructive",
      });
    }
  };

  const handleDeleteApplication = async (id: string) => {
    if (confirm('Are you sure you want to delete this application?')) {
      const success = await jobApplicationStorage.delete(id);
      if (success) {
        setApplications(prev => prev.filter(app => app.id !== id));
        toast({
          title: "🗑️ Application deleted",
          description: "The application was deleted successfully",
        });
      } else {
        toast({
          title: "❌ Error",
          description: "Could not delete the application",
          variant: "destructive",
        });
      }
    }
  };

  const handleExport = async () => {
    const csv = await jobApplicationStorage.exportToCSV();
    if (!csv) {
      toast({
        title: "⚠️ No data to export",
        description: "There are no applications to export",
        variant: "destructive",
      });
      return;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `applications_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast({
      title: "📊 Export completed",
      description: "The CSV file was downloaded successfully",
    });
  };

  const handleFormSubmit = (formData: JobApplicationFormData) => {
    if (editingApplication) {
      handleUpdateApplication(formData);
    } else {
      handleAddApplication(formData);
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingApplication(null);
  };

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        subtitle="Manage all your job applications"
        actions={(
          <Button onClick={() => setShowForm(true)} size="lg" className="bg-gradient-primary shadow-card">
            <Plus className="mr-2 h-5 w-5" />
            New Application
          </Button>
        )}
      />

      <main className="container mx-auto px-4 py-8">
        {/* Loading state */}
        {loadingData ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading applications...</p>
          </div>
        ) : (
          <>
            {/* Status Cards */}
            {applications.length > 0 && (
              <div className="grid grid-cols-7 gap-2 md:gap-4 mb-8">
                {statusCards.map(({ key, label, description, icon: Icon, iconColor, ringColor, count }) => (
                  <Tooltip key={key}>
                    <TooltipTrigger asChild>
                      <Card
                        className={`bg-gradient-card cursor-pointer transition-all hover:shadow-lg ${
                          filters.status === key ? `ring-2 ${ringColor} shadow-lg` : ''
                        }`}
                        onClick={() => handleStatusFilter(key)}
                        onDrop={(e) => handleDrop(e, key)}
                        onDragOver={handleDragOver}
                      >
                        <CardContent className="p-4 text-center">
                          <Icon className={`h-8 w-8 mx-auto mb-2 ${iconColor}`} />
                          <p className="text-2xl font-bold text-foreground">{count}</p>
                          <p className="text-sm text-muted-foreground">{label}</p>
                        </CardContent>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p className="font-semibold">{label}</p>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            )}



            {/* Filters */}
            {applications.length > 0 && (
              <div className="mb-8">
                <JobApplicationFilters
                  filters={filters}
                  onFiltersChange={setFilters}
                  onExport={handleExport}
                  companies={companies}
                />
              </div>
            )}

            {/* Applications Grid */}
            {filteredApplications.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredApplications.map((application) => (
                  <JobApplicationCard
                    key={application.id}
                    application={application}
                    onEdit={handleEditApplication}
                    onDelete={handleDeleteApplication}
                    onDragStart={handleDragStart}
                  />
                ))}
              </div>
            ) : applications.length > 0 ? (
              <Card className="bg-gradient-card">
                <CardContent className="p-8 text-center">
                  <h3 className="text-lg font-semibold mb-2">No applications found</h3>
                  <p className="text-muted-foreground">Try adjusting the search filters</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-gradient-card max-w-2xl mx-auto">
                <CardContent className="p-8 text-center">
                  <div className="mb-6">
                    <img 
                      src={emptyStateImage} 
                      alt="Start your job search" 
                      className="w-48 h-48 mx-auto rounded-lg object-cover shadow-md"
                    />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Start your job search!</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Organize all your applications in one place. Add your first application to start tracking your professional progress.
                  </p>
                  <Button 
                    onClick={() => setShowForm(true)}
                    size="lg"
                    className="bg-gradient-primary shadow-card"
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    Add First Application
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>

      {/* Form Modal */}
      {showForm && (
        <JobApplicationForm
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          editingApplication={editingApplication}
        />
      )}


    </div>
  );
};

export default Index;
