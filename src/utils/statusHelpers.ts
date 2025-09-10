import { ApplicationStatus, Priority } from '@/types/jobApplication';

export const getStatusConfig = (status: ApplicationStatus) => {
  const configs = {
    'applied': {
      label: 'Postulada',
      color: 'bg-pending text-pending-foreground',
      icon: '📤'
    },
    'in-progress': {
      label: 'En Proceso',
      color: 'bg-warning text-warning-foreground',
      icon: '⏳'
    },
    'interview': {
      label: 'Entrevista',
      color: 'bg-success text-success-foreground',
      icon: '💼'
    },
    'offer': {
      label: 'Oferta',
      color: 'bg-success text-success-foreground',
      icon: '🎉'
    },
    'rejected': {
      label: 'Rechazada',
      color: 'bg-rejected text-rejected-foreground',
      icon: '❌'
    },
    'no-response': {
      label: 'Sin Respuesta',
      color: 'bg-muted text-muted-foreground',
      icon: '⏸️'
    }
  };

  return configs[status];
};

export const getPriorityConfig = (priority: Priority) => {
  const configs = {
    'high': {
      label: 'Alta',
      color: 'border-l-priority-high',
      badge: 'bg-priority-high/10 text-priority-high'
    },
    'medium': {
      label: 'Media',
      color: 'border-l-priority-medium',
      badge: 'bg-priority-medium/10 text-priority-medium'
    },
    'low': {
      label: 'Baja',
      color: 'border-l-priority-low',
      badge: 'bg-priority-low/10 text-priority-low'
    }
  };

  return configs[priority];
};

export const formatCurrency = (amount?: string): string => {
  if (!amount) return '';
  
  // Remove any non-numeric characters except decimal point
  const numericAmount = amount.replace(/[^\d.,]/g, '');
  
  if (!numericAmount) return amount;
  
  // Format as currency
  try {
    const number = parseFloat(numericAmount.replace(',', '.'));
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(number);
  } catch {
    return amount;
  }
};

export const formatDate = (dateString: string): string => {
  try {
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
};