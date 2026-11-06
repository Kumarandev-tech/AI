import { Renderer } from '@openuidev/react-lang'
import { openuiChatLibrary } from '@openuidev/react-ui'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const markdownComponents = {
  a: ({ node, ...props }) => (
    <a {...props} target="_blank" rel="noopener noreferrer" />
  ),
  table: ({ node, ...props }) => (
    <div className="qoruz-markdown-table-wrap">
      <table {...props} />
    </div>
  ),
}

function MarkdownBlock({ children, style }) {
  return (
    <div className="qoruz-agent-response qoruz-markdown-content" style={style}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}

export default function StructuredAssistantMessage({ message, isStreaming }) {
  const raw = typeof message?.content === 'string' ? message.content : ''
  if (!raw.trim()) return null

  // Support backward compatibility with legacy custom JSON responses
  let content = raw
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      if (typeof parsed.text === 'string') {
        content = parsed.text
      }
    }
  } catch {
    // Plain text or OpenUI Lang
  }

  // Detect OpenUI Lang syntax
  const hasOpenUI = /(?:^|\n)\s*(?:```(?:openui(?:-lang)?)?\s*)?root\s*=/m.test(content)

  if (!hasOpenUI) {
    return <MarkdownBlock>{content}</MarkdownBlock>
  }

  // Check if OpenUI Lang is enclosed in markdown code fences
  const fenceMatch = content.match(/```(?:openui(?:-lang)?)?\s*\n([\s\S]*?)\n```/m)
  if (fenceMatch) {
    const before = content.slice(0, fenceMatch.index).trim()
    const openuiCode = fenceMatch[1].trim()
    const after = content.slice(fenceMatch.index + fenceMatch[0].length).trim()

    return (
      <div className="qoruz-agent-response">
        {before && <MarkdownBlock style={{ marginBottom: '1rem' }}>{before}</MarkdownBlock>}
        <Renderer
          response={openuiCode}
          library={openuiChatLibrary}
          isStreaming={isStreaming}
        />
        {after && <MarkdownBlock style={{ marginTop: '1rem' }}>{after}</MarkdownBlock>}
      </div>
    )
  }

  // Direct OpenUI Lang statements
  return (
    <div className="qoruz-agent-response">
      <Renderer
        response={content}
        library={openuiChatLibrary}
        isStreaming={isStreaming}
      />
    </div>
  )
}
