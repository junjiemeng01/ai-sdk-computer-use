import { ArrowUpRight } from "lucide-react";
import { Button } from "./ui/button";

const suggestions = [
  {
    text: "What's the weather in Dubai?",
    prompt: "What's the weather in Dubai? Please use the browser to verify it.",
  },
  {
    text: "Summarize this screen",
    prompt: "Take a screenshot of the current screen and summarize what you see.",
  },
  {
    text: "Create a notes file",
    prompt:
      "Open a text editor, create a file called notes.txt, and write 'AI Agent Dashboard challenge ready'.",
  },
  {
    text: "Open Vercel changelog",
    prompt: "Go to vercel.com/changelog and tell me the latest item on the page.",
  },
];

export const PromptSuggestions = ({
  submitPrompt,
  disabled,
}: {
  submitPrompt: (prompt: string) => void;
  disabled: boolean;
}) => {
  return (
    <div className="flex flex-wrap items-center gap-3 px-4">
      {suggestions.map((suggestion, index) => (
        <Button
          key={index}
          variant="pill"
          size="pill"
          onClick={() => submitPrompt(suggestion.prompt)}
          disabled={disabled}
        >
          <span>
            <span className="text-black text-sm">
              {suggestion.text.toLowerCase()}
            </span>
          </span>
          <ArrowUpRight className="ml-1 h-2 w-2 sm:h-3 sm:w-3 text-zinc-500 group-hover:opacity-70" />
        </Button>
      ))}
    </div>
  );
};
