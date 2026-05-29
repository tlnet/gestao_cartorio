"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Smile } from "lucide-react";

const EMOJIS = [
  "😀", "😁", "😂", "🤣", "😊", "😍", "😘", "😉",
  "😎", "🤩", "🥳", "😇", "🙂", "🙃", "😌", "😴",
  "👍", "👎", "👏", "🙏", "💪", "🤝", "👋", "🤙",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🔥", "✨",
  "🎉", "✅", "❌", "⚠️", "❓", "❗", "💯", "📌",
  "😢", "😭", "😡", "😱", "🤔", "😅", "😬", "🤗",
  "📎", "📄", "📅", "⏰", "💰", "🏠", "📞", "📧",
];

export function EmojiPicker({
  onSelect,
  disabled,
}: {
  onSelect: (emoji: string) => void;
  disabled?: boolean;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          className="text-gray-500"
        >
          <Smile className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <div className="grid max-h-56 grid-cols-8 gap-1 overflow-y-auto">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => onSelect(e)}
              className="rounded p-1 text-xl transition-colors hover:bg-gray-100"
            >
              {e}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
