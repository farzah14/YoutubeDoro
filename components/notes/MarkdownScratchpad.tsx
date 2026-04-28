"use client";

import { useState, useEffect } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Segmented } from "../ui/Segmented";

function parseBasicMarkdown(text: string) {
  if (!text) return "";
  
  let html = text
    // Escaping HTML tags to prevent XSS (basic)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    
    // Headings
    .replace(/^### (.*$)/gim, '<h3 className="text-lg font-bold mt-4 mb-2 text-foreground">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 className="text-xl font-bold mt-5 mb-2 text-foreground">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 className="text-2xl font-bold mt-6 mb-3 text-foreground">$1</h1>')
    
    // Bold & Italic
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    
    // Code Blocks
    .replace(/```([\s\S]*?)```/gim, '<pre className="bg-surface border border-border-subtle rounded-md p-3 my-3 overflow-x-auto text-sm font-mono text-text-secondary"><code>$1</code></pre>')
    
    // Inline Code
    .replace(/`(.*?)`/gim, '<code className="bg-surface-hover px-1.5 py-0.5 rounded text-sm font-mono text-accent">$1</code>')
    
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">$1</a>')
    
    // Lists
    .replace(/^\s*\n\*/gm, '<ul>\n*')
    .replace(/^(\* .*)\s*\n([^\*])/gm, '$1\n</ul>\n\n$2')
    .replace(/^\* (.*)/gim, '<li className="ml-4 list-disc">$1</li>')
    
    // Blockquotes
    .replace(/^> (.*$)/gim, '<blockquote className="border-l-4 border-border-focus pl-4 py-1 my-3 text-text-muted italic">$1</blockquote>')
    
    // Line breaks
    .replace(/\n$/gim, '<br />');

  return html;
}

export function MarkdownScratchpad() {
  const [content, setContent] = useLocalStorage("ytdoro:scratchpad", "");
  const [tab, setTab] = useState<"write" | "preview">("write");

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
        <h3 className="text-sm font-semibold text-foreground">Markdown Scratchpad</h3>
        <Segmented
          value={tab}
          onChange={(v) => setTab(v as "write" | "preview")}
          options={[
            { label: "Write", value: "write" },
            { label: "Preview", value: "preview" },
          ]}
        />
      </div>

      <div className="flex-1 min-h-[300px]">
        {tab === "write" ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your notes here using Markdown...\n\n# Heading 1\n## Heading 2\n**Bold text**\n*Italic text*\n\n- List item 1\n- List item 2\n\n```js\nconsole.log('Code blocks!');\n```"
            className="w-full h-full min-h-[300px] resize-y rounded-md border border-border-subtle bg-surface p-4 text-sm text-foreground focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus font-mono leading-relaxed"
          />
        ) : (
          <div 
            className="w-full h-full min-h-[300px] rounded-md border border-dashed border-border-subtle bg-surface/30 p-4 text-sm text-foreground overflow-y-auto"
            dangerouslySetInnerHTML={{ __html: parseBasicMarkdown(content) || '<span class="text-text-muted italic">Nothing to preview.</span>' }}
          />
        )}
      </div>
      <div className="text-xs text-text-muted text-right">
        Auto-saved locally.
      </div>
    </div>
  );
}
