import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider, DEFAULT_MODEL } from "@/lib/ai-gateway.server";

const CHAT_SYSTEM = `You are the AI Workplace Productivity Assistant chatbot.
You answer workplace and productivity questions: writing, meetings, planning, prioritization, communication coaching, and quick drafts.
Rules:
- Be concise (under ~200 words unless asked), professional, and structured.
- Never invent specific dates, names, owners, or numbers. Say "Not specified" when missing.
- Do not request or store sensitive personal/confidential information; if the user pastes any, advise them to remove it.
- Provide suggestions only. Remind the user to confirm final decisions and review AI output before sending.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as { messages?: unknown };
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway(DEFAULT_MODEL),
          system: CHAT_SYSTEM,
          messages: await convertToModelMessages(messages as UIMessage[]),
        });
        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
        });
      },
    },
  },
});