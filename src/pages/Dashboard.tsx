import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FilePlus2, AlertCircle, CheckCircle, Clock, FileText } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Toaster, toast } from 'sonner';
import { api } from '@/lib/api-client';
import type { Claim, CodingJob } from '@shared/types';
import { formatDistanceToNow } from 'date-fns';
const StatCard = ({ title, value, icon, isLoading }: { title: string; value: string | number; icon: React.ReactNode; isLoading?: boolean }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <Skeleton className="h-8 w-1/2" />
      ) : (
        <div className="text-2xl font-bold">{value}</div>
      )}
    </CardContent>
  </Card>
);
const getStatusVariant = (status: Claim['status']) => {
  switch (status) {
    case 'FC_3': return 'default';
    case 'SENT': return 'default';
    case 'REJECTED': return 'destructive';
    case 'NEEDS_REVIEW': return 'secondary';
    case 'DRAFT': return 'outline';
    default: return 'outline';
  }
};
export function Dashboard() {
  const navigate = useNavigate();
  const { data: claimsData, isLoading: isLoadingClaims, error: claimsError } = useQuery({
    queryKey: ['claims', { limit: 5 }],
    queryFn: () => api<{ items: Claim[] }>('/api/claims', { params: { limit: 5 } }),
  });
  const { data: jobsData, isLoading: isLoadingJobs, error: jobsError } = useQuery({
    queryKey: ['coding-jobs', { limit: 5 }],
    queryFn: () => api<{ items: CodingJob[] }>('/api/coding-jobs', { params: { limit: 5 } }),
  });
  if (claimsError) toast.error('Failed to load claims data.');
  if (jobsError) toast.error('Failed to load coding jobs.');
  const totalClaims = claimsData?.items.length ?? 0;
  const pendingJobs = jobsData?.items.filter(j => j.status === 'NEEDS_REVIEW').length ?? 0;
  const rejectedClaims = claimsData?.items.filter(c => c.status === 'REJECTED').length ?? 0;
  return (
    <div className="min-h-screen w-full bg-muted/40">
      <ThemeToggle className="fixed top-4 right-4 z-50" />
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-4">
        <h1 className="text-2xl font-bold font-display">Dashboard</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="outline"><Link to="/claims-manager">Claims Manager</Link></Button>
          <Button className="bg-[#0E5FFF] hover:bg-[#0E5FFF]/90 text-white" onClick={() => navigate('/')}>
            <FilePlus2 className="mr-2 h-4 w-4" /> Ingest New Note
          </Button>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 lg:py-12">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard title="Total Claims (Recent)" value={totalClaims} icon={<FileText className="h-4 w-4 text-muted-foreground" />} isLoading={isLoadingClaims} />
          <StatCard title="Pending Coding Jobs" value={pendingJobs} icon={<Clock className="h-4 w-4 text-muted-foreground" />} isLoading={isLoadingJobs} />
          <StatCard title="Rejected Claims" value={rejectedClaims} icon={<AlertCircle className="h-4 w-4 text-muted-foreground" />} isLoading={isLoadingClaims} />
        </div>
        <div className="grid gap-8 md:grid-cols-2 mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Recent Claims</CardTitle>
              <CardDescription>A view of the latest claims processed by the system.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Claim #</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingClaims ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      </TableRow>
                    ))
                  ) : claimsData?.items.length ? (
                    claimsData.items.map(claim => (
                      <TableRow key={claim.id}>
                        <TableCell className="font-medium">{claim.claim_number}</TableCell>
                        <TableCell><Badge variant={getStatusVariant(claim.status)}>{claim.status}</Badge></TableCell>
                        <TableCell>SAR {claim.amount.toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={3} className="text-center">No recent claims found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Pending Coding Jobs</CardTitle>
              <CardDescription>Encounters awaiting manual review or processing.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingJobs ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : jobsData?.items.length ? (
                jobsData.items.map(job => (
                  <div key={job.id} className="mb-4 grid grid-cols-[25px_1fr] items-start pb-4 last:mb-0 last:pb-0">
                    <span className="flex h-2 w-2 translate-y-1 rounded-full bg-sky-500" />
                    <div className="grid gap-1">
                      <p className="text-sm font-medium leading-none">Encounter <span className="text-muted-foreground">{job.encounter_id}</span></p>
                      <p className="text-sm text-muted-foreground">
                        Phase: {job.phase} - Confidence: {(job.confidence_score * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center">No pending jobs.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Toaster richColors closeButton />
    </div>
  );
}