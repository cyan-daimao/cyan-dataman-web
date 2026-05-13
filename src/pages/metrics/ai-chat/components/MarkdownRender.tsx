import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRenderProps {
  content: string;
}

const MarkdownRender: React.FC<MarkdownRenderProps> = ({ content }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const isInline = !className;
          return isInline ? (
            <code
              style={{
                background: '#f0f2f5',
                padding: '2px 6px',
                borderRadius: 4,
                fontSize: '0.9em',
                color: '#d73a49',
                fontFamily: "'SF Mono', Monaco, monospace",
              }}
              {...props}
            >
              {children}
            </code>
          ) : (
            <div style={{ position: 'relative', margin: '12px 0' }}>
              {match && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    padding: '4px 10px',
                    fontSize: 11,
                    color: '#999',
                    background: '#f5f5f5',
                    borderRadius: '0 8px 0 8px',
                  }}
                >
                  {match[1]}
                </div>
              )}
              <pre
                style={{
                  background: '#1e1e2e',
                  color: '#cdd6f4',
                  padding: '16px',
                  borderRadius: 12,
                  overflowX: 'auto',
                  fontSize: 13,
                  lineHeight: 1.6,
                  fontFamily: "'SF Mono', Monaco, 'Cascadia Code', monospace",
                  margin: 0,
                }}
              >
                <code {...props}>{children}</code>
              </pre>
            </div>
          );
        },
        p({ children }) {
          return <p style={{ margin: '0 0 8px 0', lineHeight: 1.7 }}>{children}</p>;
        },
        ul({ children }) {
          return (
            <ul style={{ margin: '8px 0', paddingLeft: 20, lineHeight: 1.8 }}>
              {children}
            </ul>
          );
        },
        ol({ children }) {
          return (
            <ol style={{ margin: '8px 0', paddingLeft: 20, lineHeight: 1.8 }}>
              {children}
            </ol>
          );
        },
        li({ children }) {
          return <li style={{ marginBottom: 4 }}>{children}</li>;
        },
        h1({ children }) {
          return <h1 style={{ fontSize: 18, fontWeight: 600, margin: '16px 0 8px' }}>{children}</h1>;
        },
        h2({ children }) {
          return <h2 style={{ fontSize: 16, fontWeight: 600, margin: '14px 0 8px' }}>{children}</h2>;
        },
        h3({ children }) {
          return <h3 style={{ fontSize: 15, fontWeight: 600, margin: '12px 0 6px' }}>{children}</h3>;
        },
        blockquote({ children }) {
          return (
            <blockquote
              style={{
                margin: '12px 0',
                padding: '8px 16px',
                borderLeft: '3px solid #4F6DF5',
                background: '#f8f9ff',
                borderRadius: '0 8px 8px 0',
                color: '#4E5566',
              }}
            >
              {children}
            </blockquote>
          );
        },
        table({ children }) {
          return (
            <div style={{ overflowX: 'auto', margin: '12px 0' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 13,
                  borderRadius: 8,
                  overflow: 'hidden',
                }}
              >
                {children}
              </table>
            </div>
          );
        },
        thead({ children }) {
          return (
            <thead style={{ background: '#f0f2f5' }}>
              {children}
            </thead>
          );
        },
        th({ children }) {
          return (
            <th
              style={{
                padding: '10px 12px',
                textAlign: 'left',
                fontWeight: 600,
                fontSize: 12,
                color: '#666',
                borderBottom: '1px solid #e8e8e8',
              }}
            >
              {children}
            </th>
          );
        },
        td({ children }) {
          return (
            <td
              style={{
                padding: '10px 12px',
                borderBottom: '1px solid #f0f0f0',
                fontSize: 13,
              }}
            >
              {children}
            </td>
          );
        },
        hr() {
          return <hr style={{ border: 'none', borderTop: '1px solid #f0f0f0', margin: '16px 0' }} />;
        },
        strong({ children }) {
          return <strong style={{ fontWeight: 600, color: '#1a1a2e' }}>{children}</strong>;
        },
        a({ href, children }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#4F6DF5', textDecoration: 'none' }}
            >
              {children}
            </a>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export default MarkdownRender;