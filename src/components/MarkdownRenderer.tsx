import { useState, memo } from 'react';
import { Copy, Check } from 'lucide-react';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderInline(text: string): string {
  let html = escapeHtml(text);
  html = html.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-white/10 text-accent text-[13px] font-mono">$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white font-semibold">$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-blue-400 hover:underline">$1</a>');
  return html;
}

function MarkdownRendererImpl({ content }: { content: string }) {
  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];
  let codeBlock: string[] | null = null;
  let codeLang = '';
  let listItems: string[] = [];
  let orderedList = false;

  const flushList = (key: string) => {
    if (listItems.length === 0) return;
    const items = listItems.map((item, i) => (
      <li key={`${key}-${i}`} className="text-softText leading-relaxed">
        <span dangerouslySetInnerHTML={{ __html: renderInline(item) }} />
      </li>
    ));
    if (orderedList) {
      blocks.push(<ol key={key} className="list-decimal list-inside space-y-1 ml-2 my-2">{items}</ol>);
    } else {
      blocks.push(<ul key={key} className="list-disc list-inside space-y-1 ml-2 my-2">{items}</ul>);
    }
    listItems = [];
  };

  lines.forEach((line, idx) => {
    if (codeBlock !== null) {
      if (line.trim().startsWith('```')) {
        blocks.push(
          <CodeBlock key={`code-${idx}`} code={codeBlock.join('\n')} lang={codeLang} />
        );
        codeBlock = null;
        codeLang = '';
      } else {
        codeBlock.push(line);
      }
      return;
    }

    if (line.trim().startsWith('```')) {
      flushList(`list-${idx}`);
      codeBlock = [];
      codeLang = line.trim().slice(3).trim();
      return;
    }

    const orderedMatch = line.match(/^\s*(\d+)\.\s+(.+)/);
    const unorderedMatch = line.match(/^\s*[-*]\s+(.+)/);

    if (orderedMatch) {
      if (!orderedList && listItems.length > 0) flushList(`list-${idx}`);
      orderedList = true;
      listItems.push(orderedMatch[2]);
      return;
    }
    if (unorderedMatch) {
      if (orderedList && listItems.length > 0) flushList(`list-${idx}`);
      orderedList = false;
      listItems.push(unorderedMatch[1]);
      return;
    }

    flushList(`list-${idx}`);

    if (line.trim() === '') {
      blocks.push(<div key={`spacer-${idx}`} className="h-2" />);
      return;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const cls = level === 1 ? 'text-lg font-bold text-white mt-2 mb-1' : level === 2 ? 'text-base font-semibold text-white mt-2 mb-1' : 'text-sm font-semibold text-softText mt-1 mb-1';
      blocks.push(<p key={`h-${idx}`} className={cls} dangerouslySetInnerHTML={{ __html: renderInline(headingMatch[2]) }} />);
      return;
    }

    blocks.push(
      <p key={`p-${idx}`} className="text-softText leading-relaxed" dangerouslySetInnerHTML={{ __html: renderInline(line) }} />
    );
  });

  flushList('list-final');
  if (codeBlock) {
    blocks.push(<CodeBlock key="code-final" code={(codeBlock as string[]).join('\n')} lang={codeLang} />);
  }

  return <div className="space-y-0.5">{blocks}</div>;
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };
  return (
    <div className="my-2 rounded-xl border border-white/10 overflow-hidden bg-[#0d0d0d]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 border-b border-white/8">
        <span className="text-xs text-muted font-mono">{lang || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-muted hover:text-white transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-accent" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto scrollbar-thin">
        <code className="text-[13px] font-mono text-softText leading-relaxed">{code}</code>
      </pre>
    </div>
  );
}

export const MarkdownRenderer = memo(MarkdownRendererImpl);
