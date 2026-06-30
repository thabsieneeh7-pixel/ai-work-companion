import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Copy, Check, Sparkles, Mail, ClipboardList, CalendarClock, MessageCircle, ShieldAlert, BookOpen, Send, Sun, Moon, Contrast, ThumbsUp, ThumbsDown, Heart, PartyPopper, LayoutDashboard, TrendingUp, Zap, Clock } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { generateEmail, summarizeMeeting, planTasks } from "@/lib/ai.functions";
import {
  SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter,
  SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger,
} from "@/components/ui/sidebar";

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

type View = "dashboard" | "email" | "meeting" | "planner" | "chat";

interface ToolItem {
  id: Exclude<View, "dashboard">;
  title: string;
  icon: typeof Mail;
  desc: string;
  color: string;
}

const tools: ToolItem[] = [
  { id: "email", title: "Email Generator", icon: Mail, desc: "Draft a polished email.", color: "bg-sky-500/10 text-sky-400" },
  { id: "meeting", title: "Meeting Summarizer", icon: ClipboardList, desc: "Turn notes into action items.", color: "bg-amber-500/10 text-amber-400" },
  { id: "planner", title: "Task Planner", icon: CalendarClock, desc: "Prioritize and time-block your day.", color: "bg-emerald-500/10 text-emerald-400" },
  { id: "chat", title: "Workplace Chat", icon: MessageCircle, desc: "Ask anything, get a quick answer.", color: "bg-violet-500/10 text-violet-400" },
];

const sidebarItems: { id: View; title: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", title: "Dashboard", icon: LayoutDashboard },
  ...tools.map((t) => ({ id: t.id as View, title: t.title, icon: t.icon })),
];

function Index() {
  const [view, setView] = useState<View>("dashboard");
  const current = sidebarItems.find((i) => i.id === view)!;

  return (
    <SidebarProvider>
      <Toaster richColors position="top-right" />
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar collapsible="icon">
          <SidebarHeader className="border-b border-sidebar-border px-3 py-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 shrink-0 rounded-lg bg-primary text-primary-foreground grid place-items-center shadow-[var(--shadow-elegant)]">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="text-sm font-semibold leading-tight truncate" style={{ fontFamily: "var(--font-display)" }}>Workplace AI</p>
                <p className="text-[11px] text-sidebar-foreground/60">Productivity Suite</p>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {sidebarItems.map((it) => (
                    <SidebarMenuItem key={it.id}>
                      <SidebarMenuButton
                        isActive={view === it.id}
                        tooltip={it.title}
                        onClick={() => setView(it.id)}
                      >
                        <it.icon className="h-4 w-4" />
                        <span>{it.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t border-sidebar-border p-3">
            <div className="text-[11px] text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
              Powered by Lovable AI · Gemini 3 Flash
            </div>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border bg-card/70 backdrop-blur flex items-center gap-3 px-4 sticky top-0 z-10">
            <SidebarTrigger />
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-semibold leading-tight truncate">{current.title}</h1>
              {view !== "dashboard" && (
                <p className="text-xs text-muted-foreground truncate">
                  {tools.find((t) => t.id === view)?.desc}
                </p>
              )}
            </div>
            <ThemeSwitcher />
            <DocsDialog />
          </header>

          <main className="flex-1 px-4 sm:px-6 py-6 sm:py-8">
            {view === "dashboard" && <Dashboard onSelectTool={setView} />}
            {view === "email" && <EmailTab />}
            {view === "meeting" && <MeetingTab />}
            {view === "planner" && <PlannerTab />}
            {view === "chat" && <ChatTab />}
          </main>

          <ResponsibleAINotice />
          <Footer />
        </div>
      </div>
    </SidebarProvider>
  );
}

// ============== DASHBOARD ==============
function Dashboard({ onSelectTool }: { onSelectTool: (v: View) => void }) {
  const stats = [
    { label: "Emails Drafted", value: "24", change: "+12%", icon: Mail, tone: "text-sky-400" },
    { label: "Meetings", value: "8", change: "+3 this week", icon: ClipboardList, tone: "text-amber-400" },
    { label: "Tasks Planned", value: "47", change: "+8 today", icon: CalendarClock, tone: "text-emerald-400" },
    { label: "Chat Sessions", value: "156", change: "+24%", icon: MessageCircle, tone: "text-violet-400" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Welcome back</h2>
          <p className="text-sm text-muted-foreground mt-1">Here is what is happening with your productivity today.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="border-border/60">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold">{s.value}</p>
                </div>
                <div className={`h-9 w-9 rounded-lg grid place-items-center ${s.tone.replace("text-", "bg-").replace("400", "500/10")} ${s.tone}`}>
                  <s.icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs">
                <TrendingUp className="h-3 w-3 text-emerald-400" />
                <span className="text-emerald-400 font-medium">{s.change}</span>
                <span className="text-muted-foreground">vs last week</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tools Grid */}
      <div>
        <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--font-display)" }}>Quick Access</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tools.map((tool) => (
            <Card
              key={tool.id}
              className="cursor-pointer hover:border-primary/40 transition-all hover:shadow-[var(--shadow-elegant)] group"
              onClick={() => onSelectTool(tool.id)}
            >
              <CardContent className="p-5 flex items-start gap-4">
                <div className={`h-10 w-10 shrink-0 rounded-xl grid place-items-center ${tool.color}`}>
                  <tool.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold group-hover:text-primary transition-colors">{tool.title}</h4>
                  <p className="text-sm text-muted-foreground mt-0.5">{tool.desc}</p>
                  <div className="mt-3 flex items-center gap-1 text-xs text-primary font-medium">
                    <Zap className="h-3 w-3" />
                    Open tool
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
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
          <DialogDescription>What it does, how it is built, and known risks.</DialogDescription>
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
              <li>Tone &amp; audience parameters are passed as explicit fields, not buried in prose, so the model follows them reliably.</li>
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

// ============== Theme Switcher ==============
type Theme = "light" | "dark" | "hc";
function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    const saved = (localStorage.getItem("theme") as Theme | null) ?? "light";
    applyTheme(saved);
    setTheme(saved);
  }, []);
  const applyTheme = (t: Theme) => {
    const root = document.documentElement;
    root.classList.remove("dark", "hc");
    if (t === "dark") root.classList.add("dark");
    if (t === "hc") root.classList.add("hc");
    localStorage.setItem("theme", t);
  };
  const choose = (t: Theme) => { setTheme(t); applyTheme(t); };
  const opts: { id: Theme; icon: typeof Sun; label: string }[] = [
    { id: "light", icon: Sun, label: "Light" },
    { id: "dark", icon: Moon, label: "Dark" },
    { id: "hc", icon: Contrast, label: "High contrast" },
  ];
  return (
    <div role="group" aria-label="Theme" className="hidden sm:inline-flex items-center rounded-md border border-border bg-card p-0.5">
      {opts.map((o) => {
        const active = theme === o.id;
        return (
          <button
            key={o.id}
            type="button"
            aria-label={o.label}
            aria-pressed={active}
            onClick={() => choose(o.id)}
            className={`h-7 w-7 grid place-items-center rounded-sm transition-colors ${
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <o.icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}

// ============== Reactions ==============
function Reactions() {
  const [picked, setPicked] = useState<string | null>(null);
  const items: { id: string; icon: typeof ThumbsUp; label: string }[] = [
    { id: "up", icon: ThumbsUp, label: "Helpful" },
    { id: "down", icon: ThumbsDown, label: "Not helpful" },
    { id: "love", icon: Heart, label: "Love it" },
    { id: "wow", icon: PartyPopper, label: "Brilliant" },
  ];
  const onPick = (id: string, label: string) => {
    setPicked(id);
    toast.success(`Thanks for the feedback: ${label}`);
  };
  return (
    <div className="flex items-center gap-1.5 pt-3 mt-3 border-t border-border">
      <span className="text-xs text-muted-foreground mr-1">React:</span>
      {items.map((it) => {
        const active = picked === it.id;
        return (
          <button
            key={it.id}
            type="button"
            aria-label={it.label}
            aria-pressed={active}
            onClick={() => onPick(it.id, it.label)}
            className={`h-8 w-8 grid place-items-center rounded-full border transition-all ${
              active
                ? "border-primary bg-primary/10 text-primary scale-110"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <it.icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
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
    <Card>
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
          <>
            <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed text-foreground">{text}</pre>
            <Reactions />
          </>
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
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
        </CardContent>
      </Card>
      <OutputPanel text={output} loading={loading} />
    </div>
  );
}

// ============== MEETING TAB ==============
const MEETING_SAMPLE = `Project Atlas weekly sync — Oct 14
Attendees: Sarah (PM), Diego (Eng), Mei (Design), Tom (QA)

- Sarah confirmed the Phase 2 launch is locked to Nov 5. Marketing needs final assets by Oct 28.
- Diego flagged a risk: the auth migration is blocked on the vendor key rotation, expected by Oct 22.
- Decision: we will ship the read-only dashboard first and gate write-features behind a flag.
- Mei will deliver the updated Figma prototype by Oct 18.
- Tom raised that regression coverage for billing flows is low; he will draft a test plan this week.
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
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
        </CardContent>
      </Card>
      <OutputPanel text={output} loading={loading} />
    </div>
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
      <Card>
        <CardHeader>
          <CardTitle>AI Task Planner</CardTitle>
          <CardDescription>Turn a messy todo list into a prioritized plan with time blocks.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Today&apos;s goal</Label>
            <Input value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} placeholder="What does success look like today?" />
          </div>
          <div className="space-y-1.5">
            <Label>Tasks (one per line)</Label>
            <Textarea rows={6} value={form.tasks} onChange={(e) => setForm({ ...form, tasks: e.target.value })} placeholder="- Review PRs\n- Write release notes\n- Inbox triage" />
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
        </CardContent>
      </Card>
      <OutputPanel text={output} loading={loading} />
    </div>
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Workplace Chatbot</CardTitle>
          <CardDescription>Ask anything about writing, planning, meetings, or workplace communication.</CardDescription>
        </CardHeader>
        <CardContent>
          <div ref={scrollRef} className="h-[420px] overflow-y-auto rounded-md border border-border bg-secondary/30 p-4 space-y-4">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground text-center pt-16">
                Try: &quot;Help me decline a meeting politely&quot; or &quot;Draft a 3-line standup update&quot;.
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

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Quick Prompts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              "Help me decline a meeting politely",
              "Draft a 3-line standup update",
              "Summarize this email thread",
              "Prioritize my tasks for today",
            ].map((prompt) => (
              <button
                key={prompt}
                onClick={() => { setInput(prompt); }}
                className="w-full text-left text-sm px-3 py-2 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
              >
                {prompt}
              </button>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tips</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Be specific about audience and tone for better results.</p>
            <p>Paste raw notes instead of summaries for meeting help.</p>
            <p>List tasks one per line for the best planner output.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
