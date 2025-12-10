import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, FileText, Lightbulb, Scale, Settings } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { api } from '@/lib/api-client';
import type { Claim, CodingJob, Nudge } from '@shared/types';
import { useAuth } from '@/hooks/use-auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Breadcrumbs } from '@/components/Breadcrumbs';
const StatCard = ({ title, value, icon, isLoading, linkTo }: { title: string; value: string | number; icon: React.ReactNode; isLoading?: boolean; linkTo?: string }) => {
  const cardContent = (
    <Card className="hover:shadow-lg transition-shadow">
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
  return linkTo ? <Link to={linkTo} className="focus:outline-none focus:ring-2 focus:ring-ring rounded-lg">{cardContent}</Link> : cardContent;
};
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
  const user = useAuth(s => s.user);
  const { data: claimsData, isLoading: isLoadingClaims, error: claimsError } = useQuery({
    queryKey: ['claims', { limit: 5 }],
    queryFn: () => api<{ items: Claim[] }>('/api/claims', { params: { limit: 5 } }),
  });
  const { data: jobsData, isLoading: isLoadingJobs, error: jobsError } = useQuery({
    queryKey: ['coding-jobs', { limit: 5 }],
    queryFn: () => api<{ items: CodingJob[] }>('/api/coding-jobs', { params: { limit: 5 } }),
  });
  const { data: nudgesData, isLoading: isLoadingNudges, error: nudgesError } = useQuery({
    queryKey: ['nudges'],
    queryFn: () => api<{ items: Nudge[] }>('/api/nudges'),
  });
  if (claimsError) toast.error('Failed to load claims data.');
  if (jobsError) toast.error('Failed to load coding jobs.');
  if (nudgesError) toast.error('Failed to load CDI nudges.');
  const totalClaims = claimsData?.items?.length ?? 0;
  const pendingJobs = jobsData?.items?.filter(j => j.status === 'NEEDS_REVIEW').length ?? 0;
  const activeNudges = nudgesData?.items?.filter(n => n.status === 'active').length ?? 0;
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 lg:py-12">
        <Breadcrumbs />
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <StatCard title="Recent Claims" value={totalClaims} icon={<FileText className="h-4 w-4 text-muted-foreground" />} isLoading={isLoadingClaims} linkTo="/claims-manager" />
          <StatCard title="Pending Coding Jobs" value={pendingJobs} icon={<Clock className="h-4 w-4 text-muted-foreground" />} isLoading={isLoadingJobs} linkTo="/coding-workspace" />
          <StatCard title="Active CDI Nudges" value={activeNudges} icon={<Lightbulb className="h-4 w-4 text-muted-foreground" />} isLoading={isLoadingNudges} linkTo="/cdi-nudges" />
        </div>
        <div className="grid gap-8 md:grid-cols-2 mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Recent Claims</CardTitle>
              <CardDescription>A view of the latest claims processed by the system.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
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
                    ) : claimsData?.items && claimsData.items.length > 0 ? (
                      claimsData.items.map(claim => (
                        <TableRow key={claim.id}>
                          <TableCell className="font-medium">{claim.claim_number}</TableCell>
                          <TableCell><Badge variant={getStatusVariant(claim.status)}>{claim.status}</Badge></TableCell>
                          <TableCell>SAR {claim.amount.toLocaleString()}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow><TableCell colSpan={3} className="text-center h-24">No recent claims found.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Quick Access</CardTitle>
              <CardDescription>Navigate to key system modules.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4">
                <Button variant="outline" className="w-full justify-start" asChild><Link to="/cdi-nudges"><Lightbulb className="mr-2 h-4 w-4" /> CDI Nudges Console</Link></Button>
                {user?.role === 'admin' && (
                  <>
                    <Button variant="outline" className="w-full justify-start" asChild><Link to="/audit-reconciliation"><Scale className="mr-2 h-4 w-4" /> Audit & Reconciliation</Link></Button>
                    <Button variant="outline" className="w-full justify-start" asChild><Link to="/integration"><Settings className="mr-2 h-4 w-4" /> Integration Console</Link></Button>
                  </>
                )}
            </CardContent>
          </Card>
        </div>
      </div>
      <Toaster richColors closeButton />
    </AppLayout>
  );
}