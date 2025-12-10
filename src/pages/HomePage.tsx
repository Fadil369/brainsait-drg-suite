import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BotMessageSquare, FileText, Zap, ShieldCheck, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Toaster, toast } from 'sonner';
import { api } from '@/lib/api-client';
const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <Card className="text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-in-out bg-card/50 backdrop-blur-sm">
    <CardHeader>
      <div className="mx-auto bg-primary/10 text-primary rounded-lg w-12 h-12 flex items-center justify-center mb-4">
        {icon}
      </div>
      <CardTitle className="text-xl font-semibold">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);
export function HomePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const navigate = useNavigate();
  const handleAnalyze = async () => {
    if (!noteText.trim()) {
      toast.error('Please paste a clinical note to analyze.');
      return;
    }
    setIsAnalyzing(true);
    try {
      // This call "warms up" the backend and creates a new job.
      // The dashboard will then reflect this new job.
      await api('/api/ingest-note', {
        method: 'POST',
        body: JSON.stringify({ clinical_note: noteText }),
      });
      toast.success("Note ingested successfully!", {
        description: "Redirecting to the dashboard to see the results."
      });
      // Navigate to the dashboard to see the new job and overall status
      navigate('/dashboard');
    } catch (error) {
      toast.error("Failed to ingest note.", {
        description: error instanceof Error ? error.message : "An unknown error occurred."
      });
    } finally {
      setIsAnalyzing(false);
      setIsModalOpen(false);
    }
  };
  return (
    <div className="min-h-screen w-full bg-background text-foreground relative overflow-x-hidden">
      <ThemeToggle className="fixed top-4 right-4" />
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[radial-gradient(#0E5FFF_1px,transparent_1px)] [background-size:32px_32px] opacity-20"></div>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <section className="py-24 md:py-32 lg:py-40 text-center">
          <div className="animate-fade-in space-y-6">
            <h1 className="text-5xl md:text-7xl font-display font-bold text-balance leading-tight bg-clip-text text-transparent bg-gradient-to-r from-[#0E5FFF] to-[#083e9e]">
              Solventum DRG Suite
            </h1>
            <p className="text-2xl md:text-3xl font-display text-foreground/90">
              Automated DRG & ICD Coding for Saudi Healthcare
            </p>
            <p className="max-w-3xl mx-auto text-lg text-muted-foreground text-pretty">
              Leverage our SOC2+ compliant AI to streamline clinical coding, automate nphies claim submissions, and enhance revenue cycle integrity with real-time CDI nudges.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button
                size="lg"
                onClick={() => setIsModalOpen(true)}
                className="bg-[#0E5FFF] hover:bg-[#0E5FFF]/90 text-white px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
              >
                Ingest Note & Start Demo
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" asChild className="px-8 py-6 text-lg font-semibold">
                <Link to="/dashboard">View Dashboard</Link>
              </Button>
            </div>
          </div>
        </section>
        {/* Features Section */}
        <section className="py-16 md:py-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold font-display">A Phased Journey to Automation</h2>
            <p className="mt-4 max-w-2xl mx-auto text-muted-foreground">
              From computer-assisted coding to full autonomy, our platform adapts to your workflow.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<FileText className="w-6 h-6" />}
              title="Computer-Assisted Coding (CAC)"
              description="Our AI ingests clinical notes and suggests accurate ICD/DRG codes, reducing manual effort and improving coder consistency."
            />
            <FeatureCard
              icon={<Zap className="w-6 h-6" />}
              title="Semi-Autonomous Workflow"
              description="High-confidence codes are automatically queued for batch review, freeing up your team to focus on complex cases."
            />
            <FeatureCard
              icon={<BotMessageSquare className="w-6 h-6" />}
              title="Fully Autonomous Submission"
              description="For low-complexity visits with near-certainty scores, claims are automatically generated and submitted to nphies, accelerating your revenue cycle."
            />
             <FeatureCard
              icon={<ShieldCheck className="w-6 h-6" />}
              title="SOC2+ & nphies Compliant"
              description="Built on a secure AWS architecture with strict data controls and seamless integration with the Saudi national health platform."
            />
             <FeatureCard
              icon={<ArrowRight className="w-6 h-6" />}
              title="CDI 'Engage One' Nudges"
              description="Proactively prompt clinicians for greater specificity at the point of documentation, eliminating retrospective queries."
            />
             <FeatureCard
              icon={<FileText className="w-6 h-6" />}
              title="APR-DRG & EAPG Support"
              description="Our core logic is built to handle both inpatient (APR-DRG) and outpatient (EAPG) grouping requirements."
            />
          </div>
        </section>
      </main>
      <footer className="text-center py-8 border-t">
        <p className="text-muted-foreground">Built with ❤️ at Cloudflare</p>
      </footer>
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display">Ingest a Clinical Note</DialogTitle>
            <DialogDescription>
              Paste an unstructured clinical note below to see our AI in action. The system will suggest relevant codes in the coding workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="e.g., Patient presents with fever and cough. Chest X-ray confirms pneumonia..."
              className="min-h-[200px] text-base"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              disabled={isAnalyzing}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} disabled={isAnalyzing}>Cancel</Button>
            <Button type="submit" onClick={handleAnalyze} className="bg-[#0E5FFF] hover:bg-[#0E5FFF]/90 text-white" disabled={isAnalyzing}>
              {isAnalyzing ? 'Analyzing...' : 'Analyze Note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Toaster richColors closeButton />
    </div>
  );
}