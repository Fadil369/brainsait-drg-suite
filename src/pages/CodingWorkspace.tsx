import React from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Send } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
// Mock data for demonstration purposes
const mockSuggestedCodes = [
  { code: 'J18.9', desc: 'Pneumonia, unspecified organism', confidence: 0.85, type: 'ICD-10' },
  { code: 'R05', desc: 'Cough', confidence: 0.95, type: 'ICD-10' },
  { code: 'R50.9', desc: 'Fever, unspecified', confidence: 0.98, type: 'ICD-10' },
  { code: '139', desc: 'Pneumonia, Simple & Pleurisy Age >17 w/o CC', confidence: 0.82, type: 'APR-DRG' },
];
const mockEncounterDetails = {
  patientName: 'Abdullah Al-Farsi',
  mrn: 'MRN789012',
  admissionDate: '2024-08-15',
  encounterType: 'Inpatient',
};
const defaultClinicalNote = "Patient presents with fever and cough. Chest X-ray confirms pneumonia. Vital signs stable. Plan to start antibiotics.";
export function CodingWorkspace() {
  const location = useLocation();
  const clinicalNote = location.state?.clinicalNote || defaultClinicalNote;
  return (
    <div className="h-screen w-screen flex flex-col bg-muted/40">
      <ThemeToggle className="fixed top-4 right-4 z-50" />
      <header className="flex items-center justify-between p-4 border-b bg-background shadow-sm">
        <div>
          <h1 className="text-xl font-bold font-display">BrainSAIT Coding Workspace</h1>
          <p className="text-sm text-muted-foreground">
            {mockEncounterDetails.patientName} (MRN: {mockEncounterDetails.mrn}) - Admitted: {mockEncounterDetails.admissionDate}
          </p>
        </div>
        <Button className="bg-[#0E5FFF] hover:bg-[#0E5FFF]/90 text-white shadow-md">
          <Send className="mr-2 h-4 w-4" />
          Submit Claim to nphies
        </Button>
      </header>
      <main className="flex-1 p-4 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full w-full rounded-lg border">
          <ResizablePanel defaultSize={50}>
            <Card className="h-full flex flex-col border-0 rounded-none">
              <CardHeader>
                <CardTitle>Clinical Note</CardTitle>
                <CardDescription>Source document for coding analysis.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden">
                <ScrollArea className="h-full pr-4">
                  <p className="text-base leading-relaxed whitespace-pre-wrap">{clinicalNote}</p>
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
                      {mockSuggestedCodes.map((item) => (
                        <TableRow key={item.code} className="hover:bg-muted/50">
                          <TableCell className="font-medium">
                            {item.code}
                            <Badge variant="outline" className="ml-2">{item.type}</Badge>
                          </TableCell>
                          <TableCell>{item.desc}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={item.confidence > 0.9 ? 'default' : 'secondary'}>
                              {(item.confidence * 100).toFixed(0)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button variant="ghost" size="icon" className="text-green-600 hover:text-green-700">
                              <CheckCircle className="h-5 w-5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700">
                              <XCircle className="h-5 w-5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  );
}