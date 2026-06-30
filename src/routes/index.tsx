import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Copy, Check, Sparkles, Mail, ClipboardList, CalendarClock, MessageCircle, ShieldAlert, BookOpen, Send } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { generateEmail, summarizeMeeting, planTasks } from "@/lib/ai.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Workplace Productivity Assistant" },
      { name: "description", content: "Draft emails, summarize meetings, and plan your day with an AI workplace assistant." },
      { property: "og:title", content: "AI Workplace Productivity Assistant" },
      { property: "og:description", content: "Draft emails, summarize meetings, and plan your day with an AI workplace assistant." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Toaster richColors position="top-right" />
      <Header />
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-8">
        <Tabs defaultValue="email" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto gap-1 bg-secondary/60 p-1">
            <TabsTrigger value="email" className="data-[state=active]:bg-card gap-2 py-2">
              <Mail className="h-4 w-4" /> Email
            </TabsTrigger>
            <TabsTrigger value="meeting" className="data-[state=active]:bg-card gap-2 py-2">
              <ClipboardList className="h-4 w-4" /> Meeting
            </TabsTrigger>
            <TabsTrigger value="planner" className="data-[state=active]:bg-card gap-2 py-2">
              <CalendarClock className="h-4 w-4" /> Planner
            </TabsTrigger>
            <TabsTrigger value="chat" className="data-[state=active]:bg-card gap-2 py-2">
              <MessageCircle className="h-4 w-4" /> Chat
            </TabsTrigger>
          </TabsList>
          <TabsContent value="email" className="mt-6"><EmailTab /></TabsContent>
          <TabsContent value="meeting" className="mt-6"><MeetingTab /></TabsContent>
          <TabsContent value="planner" className="mt-6"><PlannerTab /></TabsContent>
          <TabsContent value="chat" className="mt-6"><ChatTab /></TabsContent>
        </Tabs>
      </main>
      <ResponsibleAINotice />
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="border-b border-border bg-card/70 backdrop-blur">
      <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground grid place-items-center shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">AI Workplace Productivity Assistant</h1>
            <p className="text-xs text-muted-foreground">Draft. Summarize. Plan. Responsibly.</p>
          </div>
        </div>
        <DocsDialog />
      </div>
    </header>
  );
}

function DocsDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <BookOpen className="h-4 w-4" /> About
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>About this assistant</DialogTitle>
          <DialogDescription>What it does, how it's built, and known risks.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 text-sm">
          <section>
            <h3 className="font-semibold mb-1">The three core features</h3>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><b>Smart Email Generator</b> — produces a subject line, full draft, and a reasoning summary of inputs used.</li>
              <li><b>Meeting Notes Summarizer</b> — extracts summary, decisions, action items (with owner/due), risks, and a validation checklist.</li>
              <li><b>AI Task Planner</b> — prioritizes tasks, builds time blocks within your available hours, and offers optimization tips.</li>
            </ul>
          </section>
          <section>
            <h3 className="font-semibold mb-1">User flow</h3>
            <p className="text-muted-foreground">Pick a tab → fill the form (or click <i>Sample Input</i>) → press Generate → review the structured output → copy what you need. The chatbot tab is for free-form workplace help.</p>
          </section>
          <section>
            <h3 className="font-semibold mb-1">Prompt engineering (high level)</h3>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>A shared system prompt enforces a professional, concise voice and forbids inventing dates, owners, or numbers (uses "Not specified" instead).</li>
              <li>Each feature has its own task template that fixes the section headings and output format, so results are predictable.</li>
              <li>Tone & audience parameters are passed as explicit fields, not buried in prose, so the model follows them reliably.</li>
            </ul>
          </section>
          <section>
            <h3 className="font-semibold mb-1">Risks &amp; mitigations</h3>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><b>Hallucinated details</b> → templates require "Not specified" for missing data; the meeting tab includes a manual validation checklist.</li>
              <li><b>Sensitive data exposure</b> → in-app warnings instruct users not to paste confidential information; the API key stays server-side.</li>
              <li><b>Over-reliance on AI</b> → outputs are marked as suggestions; the Responsible AI notice requires user confirmation for final decisions.</li>
              <li><b>Tone mismatch</b> → explicit tone/audience fields plus regeneration; users should always re-read before sending.</li>
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ResponsibleAINotice() {
  return (
    <div className="border-t border-border bg-secondary/40">
      <div className="mx-auto max-w-5xl px-4 py-5">
        <Alert className="border-accent/50 bg-card">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Responsible AI Notice</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-muted-foreground">
              <li>AI drafts may contain errors. Please review before sending.</li>
              <li>Do not enter sensitive personal or confidential information.</li>
              <li>User confirmation is required for final decisions.</li>
              <li>The assistant provides suggestions only.</li>
            </ul>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-5xl px-4 py-4 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2">
        <span>Powered by Lovable AI · Gemini 3 Flash</span>
        <span>© {new Date().getFullYear()} Workplace Assistant</span>
      </div>
    </footer>
  );
}

// ============== Shared Output Panel ==============
function OutputPanel({ text, loading }: { text: string; loading: boolean }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Output</CardTitle>
        <Button variant="outline" size="sm" onClick={onCopy} disabled={!text || loading} className="gap-2">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </CardHeader>
      <CardContent>
        {loading && !text ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Generating…
          </div>
        ) : text ? (
          <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed text-foreground">{text}</pre>
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">Output will appear here.</p>
        )}
      </CardContent>
    </Card>
  );
}

// ============== EMAIL TAB ==============
const EMAIL_SAMPLE = {
  recipientName: "Priya Shah",
  audience: "Client" as const,
  purpose: "follow-up" as const,
  tone: "Formal" as const,
  keyPoints: "Following up on the proposal sent last Tuesday. Want to confirm scope for Phase 1, share updated pricing of $24,500, and propose a 30-min call this week.",
  deadline: "Friday, this week",
};

function EmailTab() {
  const [form, setForm] = useState(() => ({
    recipientName: "", audience: "Client", purpose: "request", tone: "Formal",
    keyPoints: "", deadline: "",
  }));
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!form.keyPoints.trim()) { toast.error("Please add some key points."); return; }
    setLoading(true); setOutput("");
    try {
      const res = await generateEmail({ data: form as never });
      setOutput(res.text);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      toast.error(msg);
    } finally { setLoading(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Smart Email Generator</CardTitle>
        <CardDescription>Fill the fields below to draft a professional email.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Recipient name</Label>
            <Input value={form.recipientName} onChange={(e) => setForm({ ...form, recipientName: e.target.value })} placeholder="e.g. Priya Shah" />
          </div>
          <div className="space-y-1.5">
            <Label>Audience</Label>
            <Select value={form.audience} onValueChange={(v) => setForm({ ...form, audience: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Client">Client</SelectItem>
                <SelectItem value="Manager">Manager</SelectItem>
                <SelectItem value="Team">Team</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Purpose</Label>
            <Select value={form.purpose} onValueChange={(v) => setForm({ ...form, purpose: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="request">Request</SelectItem>
                <SelectItem value="follow-up">Follow-up</SelectItem>
                <SelectItem value="apology">Apology</SelectItem>
                <SelectItem value="invitation">Invitation</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tone</Label>
            <Select value={form.tone} onValueChange={(v) => setForm({ ...form, tone: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Formal">Formal</SelectItem>
                <SelectItem value="Informal">Informal</SelectItem>
                <SelectItem value="Persuasive">Persuasive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Key points</Label>
          <Textarea rows={5} value={form.keyPoints} onChange={(e) => setForm({ ...form, keyPoints: e.target.value })} placeholder="What should the email cover?" />
        </div>
        <div className="space-y-1.5">
          <Label>Deadline / date (optional)</Label>
          <Input value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} placeholder="e.g. Friday this week" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={submit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Generate Email
          </Button>
          <Button variant="ghost" onClick={() => setForm(EMAIL_SAMPLE)} disabled={loading}>Sample Input</Button>
        </div>
        <OutputPanel text={output} loading={loading} />
      </CardContent>
    </Card>
  );
}

// ============== MEETING TAB ==============
const MEETING_SAMPLE = `Project Atlas weekly sync — Oct 14
Attendees: Sarah (PM), Diego (Eng), Mei (Design), Tom (QA)

- Sarah confirmed the Phase 2 launch is locked to Nov 5. Marketing needs final assets by Oct 28.
- Diego flagged a risk: the auth migration is blocked on the vendor key rotation, expected by Oct 22.
- Decision: we will ship the read-only dashboard first and gate write-features behind a flag.
- Mei will deliver the updated Figma prototype by Oct 18.
- Tom raised that regression coverage for billing flows is low; he'll draft a test plan this week.
- Open question: do we need legal review for the new export feature? Sarah to confirm with Counsel.`;

function MeetingTab() {
  const [notes, setNotes] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!notes.trim()) { toast.error("Please paste meeting notes."); return; }
    setLoading(true); setOutput("");
    try {
      const res = await summarizeMeeting({ data: { notes } });
      setOutput(res.text);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally { setLoading(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meeting Notes Summarizer</CardTitle>
        <CardDescription>Paste raw notes — get a structured summary with a validation checklist.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea rows={10} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Paste your meeting notes here…" />
        <div className="flex flex-wrap gap-2">
          <Button onClick={submit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Summarize
          </Button>
          <Button variant="ghost" onClick={() => setNotes(MEETING_SAMPLE)} disabled={loading}>Sample Input</Button>
        </div>
        <OutputPanel text={output} loading={loading} />
      </CardContent>
    </Card>
  );
}

// ============== PLANNER TAB ==============
const PLANNER_SAMPLE = {
  goal: "Ship the v1.2 release candidate and clear inbox before EOD.",
  tasks: "- Review 4 pull requests\n- Write release notes\n- 1:1 with manager (30m)\n- Inbox triage\n- Fix the bug in /export endpoint\n- Prepare 5 slides for tomorrow's demo",
  priorityMode: "balanced" as const,
  availableHours: 6,
};

function PlannerTab() {
  const [form, setForm] = useState<{ goal: string; tasks: string; priorityMode: "urgency" | "importance" | "balanced"; availableHours: number; }>({
    goal: "", tasks: "", priorityMode: "balanced", availableHours: 4,
  });
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!form.goal.trim() || !form.tasks.trim()) { toast.error("Please add a goal and at least one task."); return; }
    setLoading(true); setOutput("");
    try {
      const res = await planTasks({ data: form });
      setOutput(res.text);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally { setLoading(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Task Planner</CardTitle>
        <CardDescription>Turn a messy todo list into a prioritized plan with time blocks.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Today's goal</Label>
          <Input value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} placeholder="What does success look like today?" />
        </div>
        <div className="space-y-1.5">
          <Label>Tasks (one per line)</Label>
          <Textarea rows={6} value={form.tasks} onChange={(e) => setForm({ ...form, tasks: e.target.value })} placeholder="- Review PRs&#10;- Write release notes&#10;- Inbox triage" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Priority preference</Label>
            <Select value={form.priorityMode} onValueChange={(v) => setForm({ ...form, priorityMode: v as typeof form.priorityMode })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="urgency">Urgency first</SelectItem>
                <SelectItem value="importance">Importance first</SelectItem>
                <SelectItem value="balanced">Balanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Available time: <span className="font-medium text-foreground">{form.availableHours}h</span></Label>
            <Slider min={1} max={12} step={1} value={[form.availableHours]} onValueChange={([v]) => setForm({ ...form, availableHours: v })} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={submit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Build Plan
          </Button>
          <Button variant="ghost" onClick={() => setForm(PLANNER_SAMPLE)} disabled={loading}>Sample Input</Button>
        </div>
        <OutputPanel text={output} loading={loading} />
      </CardContent>
    </Card>
  );
}

// ============== CHAT TAB ==============
function ChatTab() {
  const [input, setInput] = useState("");
  const transport = useRef(new DefaultChatTransport({ api: "/api/chat" }));
  const { messages, sendMessage, status } = useChat({
    transport: transport.current,
    onError: (e) => toast.error(e.message || "Chat failed"),
  }) as unknown as { messages: UIMessage[]; sendMessage: (m: { text: string }) => Promise<void>; status: string };

  const isLoading = status === "submitted" || status === "streaming";
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, status]);

  const onSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    await sendMessage({ text });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workplace Chatbot</CardTitle>
        <CardDescription>Ask anything about writing, planning, meetings, or workplace communication.</CardDescription>
      </CardHeader>
      <CardContent>
        <div ref={scrollRef} className="h-[420px] overflow-y-auto rounded-md border border-border bg-secondary/30 p-4 space-y-4">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center pt-16">
              Try: "Help me decline a meeting politely" or "Draft a 3-line standup update".
            </p>
          )}
          {messages.map((m) => {
            const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
            const isUser = m.role === "user";
            return (
              <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div className={isUser
                  ? "max-w-[85%] rounded-2xl bg-primary text-primary-foreground px-4 py-2 text-sm whitespace-pre-wrap"
                  : "max-w-[85%] text-sm whitespace-pre-wrap text-foreground"}>
                  {text || (isLoading ? <span className="text-muted-foreground italic">Thinking…</span> : null)}
                </div>
              </div>
            );
          })}
          {status === "submitted" && (
            <div className="text-sm text-muted-foreground italic">Thinking…</div>
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
            placeholder="Ask the assistant…"
            disabled={isLoading}
          />
          <Button onClick={onSend} disabled={isLoading || !input.trim()} className="gap-2">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
