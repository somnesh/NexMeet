import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
// import { ScrollArea } from "/components/ui/scroll-area";
import { FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DialogDescription } from "./ui/dialog";

export default function MarkdownDialog({
  title = "Meeting Summary",
  content,
  trigger = true,
  maxHeight = "80vh",
  code,
  isOpen,
  setIsOpen,
}) {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild></DialogTrigger>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
          <DialogDescription>
            Meeting code: {code ? code : "N/A"}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[calc(90vh-8rem)] mt-4">
          <div className="markdown-content pr-4">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h1 className="text-2xl font-bold mb-4 text-foreground border-b pb-2">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-xl font-semibold mb-3 text-foreground">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-lg font-medium mb-2 text-foreground">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="mb-4 text-muted-foreground leading-relaxed">
                    {children}
                  </p>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-foreground">
                    {children}
                  </strong>
                ),
                ul: ({ children }) => (
                  <ul className="mb-4 space-y-1 text-muted-foreground">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-4 space-y-1 text-muted-foreground list-decimal list-inside">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span className="flex-1">{children}</span>
                  </li>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-primary pl-4 mb-4 italic text-muted-foreground">
                    {children}
                  </blockquote>
                ),
                code: ({ children, className }) => {
                  const isInline = !className;
                  if (isInline) {
                    return (
                      <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground">
                        {children}
                      </code>
                    );
                  }
                  return (
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto mb-4">
                      <code className="text-sm font-mono text-foreground">
                        {children}
                      </code>
                    </pre>
                  );
                },
                hr: () => <hr className="my-6 border-border" />,
                table: ({ children }) => (
                  <div className="overflow-x-auto mb-4">
                    <table className="w-full border-collapse border border-border">
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="border border-border px-3 py-2 bg-muted font-semibold text-left">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-border px-3 py-2 text-muted-foreground">
                    {children}
                  </td>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
