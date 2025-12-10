import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, XCircle, Send, ThumbsUp } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Toaster, toast } from 'sonner';
import { api } from '@/lib/api-client';
import type { CodingJob } from '@shared/types';
import { motion, AnimatePresence } from 'framer-motion';
const mockEncounterDetails = {
  patientName: 'Abdullah Al-Farsi',
  mrn: 'MRN789012',
  admissionDate: '2024-08-15',
  encounterType: 'Inpatient',
};
export function CodingWorkspace() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [codingJob, setCodingJob] = useState<CodingJob | null>(location.state?.codingJob || null);
  const { data: latestJobData, isLoading: isLoadingLatestJob } = useQuery({
    queryKey: ['coding-jobs', { limit: 1 }],
    queryFn: () => api<{ items: CodingJob[] }>('/api/coding-jobs', { params: { limit: 1 } }),
    enabled: !codingJob, // Only fetch if no job was passed in state
  });
  useEffect(() => {
    if (!codingJob && latestJobData?.items?.[0]) {
      setCodingJob(latestJobData.items[0]);
    }
  }, [latestJobData, codingJob]);
  const acceptCodesMutation = useMutation({
    mutationFn: (jobId: string) => api(`/api/coding-jobs/${jobId}/accept`, { method: 'POST' }),
    onSuccess: (data, jobId) => {
      toast.success('Codes accepted!', { description: 'Job status updated to AUTO_DROP.' });
      setCodingJob(prev => prev ? { ...prev, status: 'AUTO_DROP' } : null);
      queryClient.invalidateQueries({ queryKey: ['coding-jobs'] });
    },
    onError: (error) => {
      toast.error('Failed to accept codes.', { description: error.message });
    },
  });
  const isLoading = isLoadingLatestJob && !codingJob;
  return (
    <div className="h-screen w-screen flex flex-col bg-muted/40">
      <ThemeToggle className="fixed top-4 right-4 z-50" />
      <header className="flex items-center justify-between p-4 border-b bg-background shadow-sm flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold font-display">BrainSAIT Coding Workspace</h1>
          <p className="text-sm text-muted-foreground">
            {mockEncounterDetails.patientName} (MRN: {mockEncounterDetails.mrn}) - Admitted: {mockEncounterDetails.admissionDate}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {codingJob && (
            <Button 
              variant="outline"
              onClick={() => acceptCodesMutation.mutate(codingJob.id)}
              disabled={acceptCodesMutation.isPending || codingJob.status !== 'NEEDS_REVIEW'}
            >
              <ThumbsUp className="mr-2 h-4 w-4" />
              {codingJob.status === 'AUTO_DROP' ? 'Codes Accepted' : 'Accept All Codes'}
            </Button>
          )}
          <Button className="bg-[#0E5FFF] hover:bg-[#0E5FFF]/90 text-white shadow-md">
            <Send className="mr-2 h-4 w-4" />
            Submit Claim to nphies
          </Button>
        </div>
      </header>
      <main className="flex-1 p-4 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full w-full rounded-lg border bg-background">
          <ResizablePanel defaultSize={50}>
            <Card className="h-full flex flex-col border-0 rounded-none">
              <CardHeader>
                <CardTitle>Clinical Note</CardTitle>
                <CardDescription>Source document for coding analysis.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden">
                <ScrollArea className="h-full pr-4">
                  {isLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  ) : (
                    <p className="text-base leading-relaxed whitespace-pre-wrap">
                      {codingJob?.source_text || "No clinical note available for this job."}
                    </p>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={50}>
            <Card className="h-full flex flex-col border-0 rounded-none">
              <CardHeader>
                <CardTitle>AI-Suggested Codes</CardTitle>
                <CardDescription>Review and validate the codes suggested by the Coding Engine.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-center">Confidence</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {isLoading ? (
                          Array.from({ length: 4 }).map((_, i) => (
                            <TableRow key={i}>
                              <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                              <TableCell className="text-center"><Skeleton className="h-6 w-16 mx-auto" /></TableCell>
                              <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                            </TableRow>
                          ))
                        ) : codingJob?.suggested_codes?.length ? (
                          codingJob.suggested_codes.map((item, index) => (
                            <motion.tr
                              key={item.code}
                              layout
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: index * 0.05 }}
                              className="hover:bg-muted/50"
                            >
                              <TableCell className="font-medium">
                                {item.code}
                              </TableCell>
                              <TableCell>{item.desc}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant={item.confidence > 0.9 ? 'default' : 'secondary'}>
                                  {(item.confidence * 100).toFixed(0)}%
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right space-x-2">
                                <Button variant="ghost" size="icon" className="text-green-600 hover:text-green-700 hover:scale-110 transition-transform">
                                  <CheckCircle className="h-5 w-5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700 hover:scale-110 transition-transform">
                                  <XCircle className="h-5 w-5" />
                                </Button>
                              </TableCell>
                            </motion.tr>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">No codes suggested.</TableCell>
                          </TableRow>
                        )}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
      <Toaster richColors closeButton />
    </div>
  );
}