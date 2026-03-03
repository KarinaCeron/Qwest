import { useState, useEffect, useMemo } from 'react';
import { JobApplication, JobApplicationFormData, ApplicationStatus, Priority } from '@/types/jobApplication';
import { jobApplicationStorage } from '@/lib/storage';
import { JobApplicationCard } from '@/components/JobApplicationCard';
import { JobApplicationForm } from '@/components/JobApplicationForm';
import { JobApplicationFilters } from '@/components/JobApplicationFilters';

import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Briefcase, Clock, MessageSquare, Gift, X, FileX, LogOut, Compass, FileText } from 'lucide-react';
import { CVManager } from '@/components/CVManager';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import emptyStateImage from '@/assets/empty-state.jpg';
import qwestLogo from '@/assets/qwest-logo.png';

interface FiltersState {
  search: string;
  status: ApplicationStatus | 'all';
  priority: Priority | 'all';
  company: string;
}

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingApplication, setEditingApplication] = useState<JobApplication | null>(null);
  const [showCVManager, setShowCVManager] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [filters, setFilters] = useState<FiltersState>({
    search: '',
    status: 'all',
    priority: 'all',
    company: '',
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

  // Filter applications
  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      const matchesSearch = !filters.search || 
        app.company.toLowerCase().includes(filters.search.toLowerCase()) ||
        app.role.toLowerCase().includes(filters.search.toLowerCase()) ||
        app.recruiterName?.toLowerCase().includes(filters.search.toLowerCase());
      
      const matchesStatus = filters.status === 'all' || app.status === filters.status;
      const matchesPriority = filters.priority === 'all' || app.priority === filters.priority;
      const matchesCompany = !filters.company || app.company === filters.company;

      return matchesSearch && matchesStatus && matchesPriority && matchesCompany;
    }).sort((a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime());
  }, [applications, filters]);

  // Get unique companies for filter
  const companies = useMemo(() => {
    return [...new Set(applications.map(app => app.company))].sort();
  }, [applications]);

  // Stats by status
  const statusStats = useMemo(() => {
    return {
      applied: applications.filter(app => app.status === 'applied').length,
      inProgress: applications.filter(app => app.status === 'in-progress').length,
      interview: applications.filter(app => app.status === 'interview').length,
      offer: applications.filter(app => app.status === 'offer').length,
      rejected: applications.filter(app => app.status === 'rejected').length,
      noResponse: applications.filter(app => app.status === 'no-response').length,
    };
  }, [applications]);

  const handleStatusFilter = (status: ApplicationStatus | 'all') => {
    setFilters({
      search: '',
      status: filters.status === status ? 'all' : status,
      priority: 'all',
      company: '',
    });
  };

  const handleAddApplication = async (formData: JobApplicationFormData) => {
    const newApp = await jobApplicationStorage.add(formData);
    if (newApp) {
      setApplications(prev => [newApp, ...prev]);
      setShowForm(false);
      toast({
        title: "✅ Postulación agregada",
        description: `Se agregó la postulación para ${formData.role} en ${formData.company}`,
      });
    } else {
      toast({
        title: "❌ Error",
        description: "No se pudo agregar la postulación",
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
        title: "✅ Postulación actualizada",
        description: `Se actualizó la postulación para ${formData.role} en ${formData.company}`,
      });
    } else {
      toast({
        title: "❌ Error",
        description: "No se pudo actualizar la postulación",
        variant: "destructive",
      });
    }
  };

  const handleDeleteApplication = async (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta postulación?')) {
      const success = await jobApplicationStorage.delete(id);
      if (success) {
        setApplications(prev => prev.filter(app => app.id !== id));
        toast({
          title: "🗑️ Postulación eliminada",
          description: "La postulación se eliminó correctamente",
        });
      } else {
        toast({
          title: "❌ Error",
          description: "No se pudo eliminar la postulación",
          variant: "destructive",
        });
      }
    }
  };

  const handleExport = async () => {
    const csv = await jobApplicationStorage.exportToCSV();
    if (!csv) {
      toast({
        title: "⚠️ Sin datos para exportar",
        description: "No hay postulaciones para exportar",
        variant: "destructive",
      });
      return;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `postulaciones_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast({
      title: "📊 Exportación completada",
      description: "El archivo CSV se descargó correctamente",
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

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-gradient-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center shadow-lg">
                <Compass className="h-7 w-7 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Qwest</h1>
                <p className="text-muted-foreground">Gestiona todas tus postulaciones de empleo</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => setShowForm(true)} 
                size="lg"
                className="bg-gradient-primary shadow-card"
              >
                <Plus className="mr-2 h-5 w-5" />
                Nueva Postulación
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCVManager(true)}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Mi CV
              </Button>
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Loading state */}
        {loadingData ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Cargando postulaciones...</p>
          </div>
        ) : (
          <>
            {/* Status Cards */}
            {applications.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                <Card 
                  className={`bg-gradient-card cursor-pointer transition-all hover:shadow-lg ${
                    filters.status === 'applied' ? 'ring-2 ring-blue-500 shadow-lg' : ''
                  }`}
                  onClick={() => handleStatusFilter('applied')}
                >
                  <CardContent className="p-4 text-center">
                    <Briefcase className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                    <p className="text-2xl font-bold text-foreground">{statusStats.applied}</p>
                    <p className="text-sm text-muted-foreground">Postulada</p>
                  </CardContent>
                </Card>
                <Card 
                  className={`bg-gradient-card cursor-pointer transition-all hover:shadow-lg ${
                    filters.status === 'in-progress' ? 'ring-2 ring-yellow-500 shadow-lg' : ''
                  }`}
                  onClick={() => handleStatusFilter('in-progress')}
                >
                  <CardContent className="p-4 text-center">
                    <Clock className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                    <p className="text-2xl font-bold text-foreground">{statusStats.inProgress}</p>
                    <p className="text-sm text-muted-foreground">En Proceso</p>
                  </CardContent>
                </Card>
                <Card 
                  className={`bg-gradient-card cursor-pointer transition-all hover:shadow-lg ${
                    filters.status === 'interview' ? 'ring-2 ring-purple-500 shadow-lg' : ''
                  }`}
                  onClick={() => handleStatusFilter('interview')}
                >
                  <CardContent className="p-4 text-center">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                    <p className="text-2xl font-bold text-foreground">{statusStats.interview}</p>
                    <p className="text-sm text-muted-foreground">Entrevista</p>
                  </CardContent>
                </Card>
                <Card 
                  className={`bg-gradient-card cursor-pointer transition-all hover:shadow-lg ${
                    filters.status === 'offer' ? 'ring-2 ring-green-500 shadow-lg' : ''
                  }`}
                  onClick={() => handleStatusFilter('offer')}
                >
                  <CardContent className="p-4 text-center">
                    <Gift className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <p className="text-2xl font-bold text-foreground">{statusStats.offer}</p>
                    <p className="text-sm text-muted-foreground">Oferta</p>
                  </CardContent>
                </Card>
                <Card 
                  className={`bg-gradient-card cursor-pointer transition-all hover:shadow-lg ${
                    filters.status === 'rejected' ? 'ring-2 ring-red-500 shadow-lg' : ''
                  }`}
                  onClick={() => handleStatusFilter('rejected')}
                >
                  <CardContent className="p-4 text-center">
                    <X className="h-8 w-8 mx-auto mb-2 text-red-500" />
                    <p className="text-2xl font-bold text-foreground">{statusStats.rejected}</p>
                    <p className="text-sm text-muted-foreground">Rechazada</p>
                  </CardContent>
                </Card>
                <Card 
                  className={`bg-gradient-card cursor-pointer transition-all hover:shadow-lg ${
                    filters.status === 'no-response' ? 'ring-2 ring-gray-500 shadow-lg' : ''
                  }`}
                  onClick={() => handleStatusFilter('no-response')}
                >
                  <CardContent className="p-4 text-center">
                    <FileX className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                    <p className="text-2xl font-bold text-foreground">{statusStats.noResponse}</p>
                    <p className="text-sm text-muted-foreground">Sin Respuesta</p>
                  </CardContent>
                </Card>
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
                  />
                ))}
              </div>
            ) : applications.length > 0 ? (
              <Card className="bg-gradient-card">
                <CardContent className="p-8 text-center">
                  <h3 className="text-lg font-semibold mb-2">No se encontraron postulaciones</h3>
                  <p className="text-muted-foreground">Intenta ajustar los filtros de búsqueda</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-gradient-card max-w-2xl mx-auto">
                <CardContent className="p-8 text-center">
                  <div className="mb-6">
                    <img 
                      src={emptyStateImage} 
                      alt="Comienza tu búsqueda de empleo" 
                      className="w-48 h-48 mx-auto rounded-lg object-cover shadow-md"
                    />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">¡Comienza tu búsqueda de empleo!</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Organiza todas tus postulaciones en un solo lugar. Registra tu primera postulación para empezar a hacer seguimiento de tu progreso profesional.
                  </p>
                  <Button 
                    onClick={() => setShowForm(true)}
                    size="lg"
                    className="bg-gradient-primary shadow-card"
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    Agregar Primera Postulación
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

      <CVManager open={showCVManager} onClose={() => setShowCVManager(false)} />
    </div>
  );
};

export default Index;