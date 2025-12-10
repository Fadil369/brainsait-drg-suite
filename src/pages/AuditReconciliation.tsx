import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, Bot, FileArchive } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Toaster, toast } from 'sonner';
import { api } from '@/lib/api-client';
import type { Payment, AuditLog } from '@shared/types';
import { format } from 'date-fns';
export function AuditReconciliation() {
  const queryClient = useQueryClient();
  const [isReconciling, setIsReconciling] = useState(false);
  const [progress, setProgress] = useState(0);
  const { data: paymentsData, isLoading: isLoadingPayments } = useQuery({
    queryKey: ['payments'],
    queryFn: () => api<{ items: Payment[] }>('/api/payments'),
  });
  const { data: auditData, isLoading: isLoadingAudits } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => api<{ items: AuditLog[] }>('/api/audit-logs'),
  });
  const reconcileMutation = useMutation({
    mutationFn: () => api('/api/reconcile-batch', { method: 'POST' }),
    onSuccess: () => {
      toast.success('Batch reconciliation completed!');
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
    onError: () => {
      toast.error('Batch reconciliation failed.');
    },
    onSettled: () => {
      setIsReconciling(false);
      setProgress(0);
    },
  });
  const handleBatchReconcile = () => {
    setIsReconciling(true);
    setProgress(10);
    const interval = setInterval(() => {
      setProgress(p => (p < 90 ? p + 10 : p));
    }, 150);
    reconcileMutation.mutate();
    setTimeout(() => clearInterval(interval), 1500);
  };
  return (
    <div className="min-h-screen w-full bg-muted/40">
      <ThemeToggle className="fixed top-4 right-4 z-50" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Payments Reconciliation</CardTitle>
                  <CardDescription>Match incoming payments to submitted claims.</CardDescription>
                </div>
                <Button onClick={handleBatchReconcile} disabled={isReconciling}>
                  <Bot className="mr-2 h-4 w-4" />
                  {isReconciling ? 'Reconciling...' : 'Run Batch Reconciliation'}
                </Button>
              </div>
              {isReconciling && <Progress value={progress} className="w-full mt-4" />}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Claim ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingPayments ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                      </TableRow>
                    ))
                  ) : paymentsData?.items.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.claim_id}</TableCell>
                      <TableCell>SAR {p.amount.toLocaleString()}</TableCell>
                      <TableCell>{format(new Date(p.received_at), 'PP')}</TableCell>
                      <TableCell>
                        <Badge variant={p.reconciled ? 'default' : 'secondary'}>
                          {p.reconciled ? <CheckCircle className="mr-1 h-3 w-3" /> : <Clock className="mr-1 h-3 w-3" />}
                          {p.reconciled ? 'Reconciled' : 'Pending'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>System Audit Logs</CardTitle>
              <CardDescription>A general-purpose audit trail for SOC2 compliance.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoadingAudits ? (
                  Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
                ) : auditData?.items.map(log => (
                  <div key={log.id} className="flex items-center">
                    <FileArchive className="h-5 w-5 text-muted-foreground" />
                    <div className="ml-4 flex-1">
                      <p className="text-sm font-medium">{log.action}</p>
                      <p className="text-xs text-muted-foreground">by {log.actor} on {log.object_type}:{log.object_id}</p>
                    </div>
                    <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(log.occurred_at), { addSuffix: true })}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Toaster richColors closeButton />
    </div>
  );
}