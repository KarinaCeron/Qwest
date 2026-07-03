import { JobApplication } from '@/types/jobApplication';
import { getStatusConfig, getPriorityConfig, formatCurrency, formatDate } from '@/utils/statusHelpers';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Edit, Trash2, User, Calendar, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JobApplicationCardProps {
  application: JobApplication;
  onEdit: (application: JobApplication) => void;
  onDelete: (id: string) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, application: JobApplication) => void;
}

export function JobApplicationCard({ application, onEdit, onDelete, draggable = true, onDragStart }: JobApplicationCardProps) {
  const statusConfig = getStatusConfig(application.status);
  const priorityConfig = getPriorityConfig(application.priority);

  return (
    <Card 
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e, application)}
      className={cn(
        "group hover:shadow-card transition-all duration-300 border-l-4 cursor-grab active:cursor-grabbing",
        priorityConfig.color,
        "bg-gradient-card"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-lg text-foreground line-clamp-1">
                {application.role}
              </h3>
              <Badge variant="secondary" className={priorityConfig.badge}>
                {priorityConfig.label}
              </Badge>
            </div>
            <p className="text-muted-foreground font-medium">{application.company}</p>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" onClick={() => onEdit(application)} className="h-8 w-8 p-0">
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(application.id)} className="h-8 w-8 p-0 text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Badge className={statusConfig.color}>
            <span className="mr-1">{statusConfig.icon}</span>
            {statusConfig.label}
          </Badge>
          <span className="text-sm text-muted-foreground">
            <Calendar className="h-3 w-3 inline mr-1" />
            {formatDate(application.applicationDate)}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Submission date: {formatDate(application.createdAt)}</span>
          <span>Status changed: {formatDate(application.statusChangedAt)}</span>
        </div>
        {(application.recruiterName || application.salary) && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {application.recruiterName && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span className="line-clamp-1">{application.recruiterName}</span>
              </div>
            )}
            {application.salary && (
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                <span className="line-clamp-1">{formatCurrency(application.salary)}</span>
              </div>
            )}
          </div>
        )}
        {application.notes && (
          <p className="text-sm text-muted-foreground line-clamp-2 bg-muted/50 p-2 rounded-md">
            {application.notes}
          </p>
        )}
        {application.jobLink && (
          <div className="pt-2">
            <Button variant="outline" size="sm" asChild className="w-full">
              <a href={application.jobLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                View Job Posting
              </a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
