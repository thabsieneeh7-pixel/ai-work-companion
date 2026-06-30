import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider, DEFAULT_MODEL } from "./ai-gateway.server";

const BASE_SYSTEM = `You are the AI Workplace Productivity Assistant. You help working professionals draft communication, summarize meetings, and plan tasks.
Rules you MUST follow:
- Be concise, professional, and clearly structured. Use markdown headings and bullet lists where helpful.
- Match any requested tone and audience exactly.
- Never invent dates, names, owners, deadlines, or numbers. If a detail is missing, write "Not specified".
- Do not include sensitive personal data, credentials, or speculation about private individuals.
- Output suggestions only. Remind the user to review before sending or committing to decisions when relevant.
- Use the exact section headings requested by the task template.`;

function getProvider() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return createLovableAiGatewayProvider(key);
}

async function runPrompt(system: string, prompt: string) {
  const gateway = getProvider();
  const { text } = await generateText({
    model: gateway(DEFAULT_MODEL),
    system: `${BASE_SYSTEM}\n\n${system}`,
    prompt,
  });
  return { text };
}

// ----------------- Email Generator -----------------
const EmailInput = z.object({
  recipientName: z.string().trim().max(120).default(""),
  audience: z.enum(["Client", "Manager", "Team", "Other"]),
  purpose: z.enum(["request", "follow-up", "apology", "invitation", "other"]),
  tone: z.enum(["Formal", "Informal", "Persuasive"]),
  keyPoints: z.string().trim().min(1).max(4000),
  deadline: z.string().trim().max(200).optional().default(""),
});

export const generateEmail = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => EmailInput.parse(d))
  .handler(async ({ data }) => {
    const system = `You draft professional emails.
Output format (markdown, in this exact order):

**Subject:** <one short subject line>

**Email:**
<full email body with greeting, body paragraphs, and sign-off>

**Reasoning:**
- Brief bullet list (3-5 items) of the key inputs used (recipient, audience, purpose, tone, key points, deadline). Do not include any sensitive personal data.`;

    const prompt = `Draft an email with these parameters:
- Recipient name: ${data.recipientName || "Not specified"}
- Audience type: ${data.audience}
- Purpose: ${data.purpose}
- Tone: ${data.tone}
- Deadline/date: ${data.deadline || "Not specified"}
- Key points from the user:
"""
${data.keyPoints}
"""`;
    return runPrompt(system, prompt);
  });

// ----------------- Meeting Summarizer -----------------
const MeetingInput = z.object({
  notes: z.string().trim().min(1).max(20000),
});

export const summarizeMeeting = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => MeetingInput.parse(d))
  .handler(async ({ data }) => {
    const system = `You summarize meeting notes for busy professionals.
Output format (markdown, in this exact order, using these exact headings):

## Summary
- 3 to 5 concise bullet points.

## Decisions Made
- Bullet list of explicit decisions. If none, write "None identified".

## Action Items
- For each: **Task** — Owner: <name or "Not specified"> — Due: <date or "Not specified">

## Deadlines & Risks
- Bullet list of any deadlines, blockers, or risks mentioned. Write "None identified" if absent.

## Validation Checklist
- [ ] All action items have the correct owner.
- [ ] All deadlines match the source notes.
- [ ] No decision was invented.
- [ ] Sensitive info has been removed before sharing.

Do NOT invent details. Use "Not specified" when an owner or date is absent.`;
    return runPrompt(system, `Meeting notes:\n"""\n${data.notes}\n"""`);
  });

// ----------------- Task Planner -----------------
const PlannerInput = z.object({
  goal: z.string().trim().min(1).max(1000),
  tasks: z.string().trim().min(1).max(4000),
  priorityMode: z.enum(["urgency", "importance", "balanced"]),
  availableHours: z.number().int().min(1).max(16),
});

export const planTasks = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => PlannerInput.parse(d))
  .handler(async ({ data }) => {
    const system = `You build realistic personal work plans.
Output format (markdown, in this exact order, using these exact headings):

## Prioritized Plan
1. **Task** — Priority: High/Medium/Low — Estimate: <minutes>
(Rank all tasks. Briefly justify the top 3 priorities in one short line each.)

## Suggested Time Blocks
- HH:MM – HH:MM — Task (using a 9:00 AM start by default unless the user implies otherwise). Fit within the available time. Include short breaks if the day is >= 4h.

## Time Optimization Tips
- 2 to 3 bullet, concrete tips tailored to the tasks above.

Be realistic: do not pack more work than the available hours. If tasks exceed the budget, defer the lowest-priority items and clearly call out which ones are deferred.`;

    const prompt = `Plan parameters:
- Goal: ${data.goal}
- Available time today: ${data.availableHours} hours
- Prioritization preference: ${data.priorityMode}
- Tasks list (free text from user):
"""
${data.tasks}
"""`;
    return runPrompt(system, prompt);
  });