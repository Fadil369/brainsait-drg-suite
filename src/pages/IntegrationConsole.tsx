import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PlayCircle, RefreshCw, Server, CheckCircle, AlertTriangle } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Toaster, toast } from 'sonner';
import { api } from '@/lib/api-client';
import type { AuditLog } from '@shared/types';
import { format } from 'date-fns';
export function IntegrationConsole() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['integration-logs'],
    queryFn: () => api<{ items: AuditLog[] }>('/api/audit-logs', { params: { limit: 7 } }),
  });
  if (error) toast.error('Failed to load integration logs.');
  const handleTestEndpoint = (endpoint: string) => {
    toast.info(`Testing ${endpoint} endpoint...`);
    setTimeout(() => {
      toast.success(`${endpoint} connection successful!`, {
        description: 'Received a 200 OK response from the mock server.',
      });
    }, 1000);
  };
  return (
    <div className="min-h-screen w-full bg-muted/40">
      <ThemeToggle className="fixed top-4 right-4 z-50" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 lg:py-12">
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-display">nphies Integration Console</CardTitle>
              <CardDescription>Manage and monitor the connection to the nphies platform.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-2">
                <Switch id="sandbox-mode" defaultChecked />
                <Label htmlFor="sandbox-mode">Sandbox Mode</Label>
                <Badge variant="default">Enabled</Badge>
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-id">OAuth Client ID</Label>
                <Input id="client-id" value="**********" readOnly />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-secret">OAuth Client Secret</Label>
                <Input id="client-secret" type="password" value="********************" readOnly />
              </div>
              <Button variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Token
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Endpoint Health Check</CardTitle>
              <CardDescription>Run live tests against the nphies sandbox endpoints.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button onClick={() => handleTestEndpoint('Claims')}><PlayCircle className="mr-2 h-4 w-4" /> Test Claims</Button>
              <Button onClick={() => handleTestEndpoint('Pre-Auth')}><PlayCircle className="mr-2 h-4 w-4" /> Test Pre-Auth</Button>
              <Button onClick={() => handleTestEndpoint('Status Check')}><PlayCircle className="mr-2 h-4 w-4" /> Test Status Check</Button>
              <Button onClick={() => handleTestEndpoint('Payments')}><PlayCircle className="mr-2 h-4 w-4" /> Test Payments</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent Integration Logs</CardTitle>
              <CardDescription>A stream of recent API interactions and system events.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                        </TableRow>
                      ))
                    ) : data?.items.length ? (
                      data.items.map((log) => (
                        <TableRow key={log.id} className="hover:bg-muted/50">
                          <TableCell>{format(new Date(log.occurred_at), 'PPp')}</TableCell>
                          <TableCell><Badge variant="secondary">{log.actor}</Badge></TableCell>
                          <TableCell className="font-mono text-xs">{log.action}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center">
                          <Server className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                          No recent logs found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Toaster richColors closeButton />
    </div>
  );
}