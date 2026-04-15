import { createAnthropic } from "@ai-sdk/anthropic";
import { streamText, UIMessage } from "ai";
import { killDesktop } from "@/lib/sandbox/utils";
import { bashTool, computerTool } from "@/lib/sandbox/tool";
import { prunedMessages } from "@/lib/utils";

const anthropic = createAnthropic({
  baseURL: process.env.ANTHROPIC_BASE_URL,
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Allow streaming responses up to 30 seconds
export const maxDuration = 300;

export async function POST(req: Request) {
  const {
    messages,
    sandboxId,
  }: { messages: UIMessage[]; sandboxId?: string | null } = await req.json();
  try {
    const result = streamText({
      model: anthropic("claude-sonnet-4-5-20250929"), // Using Sonnet for computer use
      system:
        "You are a helpful assistant with access to a computer. " +
        "Use the computer tool to help the user with their requests. " +
        "Use the bash tool to execute commands on the computer. You can create files and folders using the bash tool. Always prefer the bash tool where it is viable for the task. " +
        "Be sure to advise the user when waiting is necessary. " +
        "If the browser opens with a setup wizard, YOU MUST IGNORE IT and move straight to the next step (e.g. input the url in the search bar).",
      messages: prunedMessages(messages),
      tools: { computer: computerTool(sandboxId), bash: bashTool(sandboxId) },
      providerOptions: {
        anthropic: { cacheControl: { type: "ephemeral" } },
      },
    });

    return result.toDataStreamResponse({
      getErrorMessage(error: unknown) {
        console.error(error);
        return error instanceof Error ? error.message : "Unknown error";
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);

    if (sandboxId) {
      await killDesktop(sandboxId);
    }

    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
