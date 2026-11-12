function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

interface MarkdownLike {
  text?: unknown;
  theme?: unknown;
  defaultTextStyle?: unknown;
}

type MarkdownTransformer = (
  markdown: string,
  context: {
    messageType: "user";
    isStreaming: false;
    availableWidth: number;
    messageId?: string;
    timestamp?: string;
  },
) => string;

interface UserMessageLike {
  children?: unknown;
  markdownTransformers?: unknown;
  messageId?: unknown;
  timestamp?: unknown;
}

export interface UserMessageMarkdownState {
  text: string;
  theme: unknown;
  defaultTextStyle?: Record<string, unknown>;
  transform: (markdown: string, availableWidth: number) => string;
}
function sanitizeDefaultTextStyle(value: unknown): Record<string, unknown> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const { bgColor: _bgColor, ...rest } = value;
  return Object.keys(rest).length > 0 ? rest : undefined;
}

function isMarkdownLike(value: unknown): value is MarkdownLike {
  return isRecord(value) && typeof value.text === "string" && value.theme !== undefined;
}

function findMarkdownChild(value: unknown): MarkdownLike | undefined {
  if (isMarkdownLike(value)) {
    return value;
  }
  if (!isRecord(value)) {
    return undefined;
  }

  const children = Array.isArray(value.children) ? value.children : [];
  for (const child of children) {
    const markdownChild = findMarkdownChild(child);
    if (markdownChild) {
      return markdownChild;
    }
  }

  return undefined;
}

function createTransform(value: unknown, userMessage: UserMessageLike): UserMessageMarkdownState["transform"] {
  const transformers = Array.isArray(value)
    ? value.filter((item): item is MarkdownTransformer => typeof item === "function")
    : [];

  return (markdown, availableWidth) => {
    let transformed = markdown;
    for (const transformer of transformers) {
      try {
        const next = transformer(transformed, {
          messageType: "user",
          isStreaming: false,
          availableWidth,
          messageId: typeof userMessage.messageId === "string" ? userMessage.messageId : undefined,
          timestamp: typeof userMessage.timestamp === "string" ? userMessage.timestamp : undefined,
        });
        if (typeof next === "string") transformed = next;
      } catch {
        // A display transformer must not break transcript rendering.
      }
    }
    return transformed;
  };
}

export function extractUserMessageMarkdownState(
  userMessage: UserMessageLike,
): UserMessageMarkdownState | undefined {
  const markdownChild = findMarkdownChild(userMessage);
  if (!markdownChild || typeof markdownChild.text !== "string") {
    return undefined;
  }

  return {
    text: markdownChild.text,
    theme: markdownChild.theme,
    defaultTextStyle: sanitizeDefaultTextStyle(markdownChild.defaultTextStyle),
    transform: createTransform(userMessage.markdownTransformers, userMessage),
  };
}
