import { ApplicationStatus, Priority } from '@/types/jobApplication';

export const getStatusConfig = (status: ApplicationStatus) => {
  const configs = {
    'submitted': {
      label: 'Submitted',
      color: 'bg-pending text-pending-foreground',
      icon: '📤',
      description: 'You submitted the job application.',
    },
    'in-progress': {
      label: 'In Progress',
      color: 'bg-warning text-warning-foreground',
      icon: '⏳',
      description: 'The company confirmed receipt of your application and your CV is being reviewed.',
    },
    'interview': {
      label: 'HR Interview',
      color: 'bg-success text-success-foreground',
      icon: '💼',
      description: 'You got the first interview with HR.',
    },
    'technical-interview': {
      label: 'Technical Interview',
      color: 'bg-success text-success-foreground',
      icon: '🧪',
      description: 'You moved on to the technical interview stage.',
    },
    'offer': {
      label: 'Offer',
      color: 'bg-success text-success-foreground',
      icon: '🎉',
      description: 'You received an offer.',
    },
    'rejected': {
      label: 'Rejected',
      color: 'bg-rejected text-rejected-foreground',
      icon: '❌',
      description: 'You received a No as an answer.',
    },
    'no-response': {
      label: 'No Response',
      color: 'bg-muted text-muted-foreground',
      icon: '⏸️',
      description: 'No news for over a month. Applications are moved here automatically after 30 days without a status change.',
    },
  } as const;
  return configs[status];
};

export const getPriorityConfig = (priority: Priority) => {
  const configs = {
    'high': { label: 'High', color: 'border-l-priority-high', badge: 'bg-priority-high/10 text-priority-high' },
    'medium': { label: 'Medium', color: 'border-l-priority-medium', badge: 'bg-priority-medium/10 text-priority-medium' },
    'low': { label: 'Low', color: 'border-l-priority-low', badge: 'bg-priority-low/10 text-priority-low' }
  };
  return configs[priority];
};

export const formatCurrency = (amount?: string): string => {
  if (!amount) return '';
  const numericAmount = amount.replace(/[^\d.,]/g, '');
  if (!numericAmount) return amount;
  try {
    const number = parseFloat(numericAmount.replace(',', '.'));
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(number);
  } catch { return amount; }
};

export const formatDate = (dateString: string): string => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      day: 'numeric', month: 'short', year: 'numeric'
    }).format(new Date(dateString));
  } catch { return dateString; }
};
