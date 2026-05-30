// MarkdownMessage.tsx
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const MarkdownMessage=({ content }: { content: string }) =>{
  return (
    <div className="max-w-[70%] px-4 py-3 bg-white text-[#111] rounded-[18px_18px_18px_4px] shadow-sm text-sm leading-relaxed">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-1">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-bold mb-2 mt-1">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-bold mb-1 mt-1">{children}</h3>,
          ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
          li: ({ children }) => <li className="leading-snug">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          hr: () => <hr className="my-3 border-gray-200" />,
          code: ({ children }) => (
            <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">{children}</code>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-gray-300 pl-3 italic text-gray-600 my-2">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}