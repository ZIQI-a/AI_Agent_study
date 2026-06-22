# 实战：从零构建 AI Agent 应用

## 项目概述

我们将构建一个 **智能文档助手 Agent**，它能：
- 读取和搜索本地文档
- 回答基于文档的问题
- 执行计算和数据查询
- 生成文档摘要
- 展示 Agent 的思考过程

这个项目覆盖了 Agent 开发的核心技术点。

## 技术栈

```
前端：Next.js 14 + React + TypeScript + Tailwind CSS
AI：  Vercel AI SDK + OpenAI/Claude API
Agent：LangGraph (可选，先用原生实现理解原理)
存储： 文件系统 + 内存向量存储
```

## 项目结构

```
ai-doc-assistant/
├── app/
│   ├── api/
│   │   ├── chat/
│   │   │   └── route.ts          # Agent 对话 API
│   │   └── docs/
│   │       └── route.ts          # 文档管理 API
│   ├── page.tsx                  # 主页面
│   └── layout.tsx
├── lib/
│   ├── agent/
│   │   ├── index.ts              # Agent 核心逻辑
│   │   ├── tools.ts              # 工具定义
│   │   └── memory.ts             # 记忆管理
│   ├── rag/
│   │   ├── loader.ts             # 文档加载
│   │   ├── splitter.ts           # 文档分块
│   │   ├── embeddings.ts         # 向量化
│   │   └── retriever.ts          # 检索
│   └── llm/
│       └── client.ts             # LLM 客户端
├── components/
│   ├── chat/
│   │   ├── ChatPanel.tsx         # 对话面板
│   │   ├── MessageBubble.tsx     # 消息气泡
│   │   ├── ToolCallCard.tsx      # 工具调用展示
│   │   └── ThinkingProcess.tsx   # 思考过程展示
│   └── docs/
│       ├── DocUploader.tsx       # 文档上传
│       └── DocList.tsx           # 文档列表
├── package.json
└── .env.local
```

## 分步实现

### Step 1：项目初始化

```bash
# 创建项目
npx create-next-app@latest ai-doc-assistant --typescript --tailwind --app
cd ai-doc-assistant

# 安装 AI 相关依赖
pnpm add ai @ai-sdk/openai
pnpm add langchain @langchain/core @langchain/openai
pnpm add @langchain/community

# 安装工具库
pnpm add zod                # 数据校验
pnpm add react-markdown     # Markdown 渲染
pnpm add remark-gfm         # GitHub 风格 Markdown
pnpm add pdf-parse          # PDF 解析

# 环境变量
echo 'OPENAI_API_KEY=sk-your-key-here' > .env.local
```

### Step 2：LLM 客户端封装

```typescript
// lib/llm/client.ts
import { createOpenAI } from "@ai-sdk/openai";

export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 如果要用 DeepSeek
export const deepseek = createOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});
```

### Step 3：工具定义（核心）

```typescript
// lib/agent/tools.ts
import { tool } from "ai";
import { z } from "zod";
import { readFile, writeFile, readdir } from "fs/promises";
import { join } from "path";

// 工具 1：读取文件
export const readFileTool = tool({
  description: "读取指定路径的文件内容",
  parameters: z.object({
    path: z.string().describe("文件的相对路径"),
  }),
  execute: async ({ path }) => {
    try {
      const content = await readFile(join(process.cwd(), path), "utf-8");
      return { success: true, content };
    } catch (error) {
      return { success: false, error: `无法读取文件: ${error.message}` };
    }
  },
});

// 工具 2：列出目录文件
export const listFilesTool = tool({
  description: "列出指定目录下的所有文件",
  parameters: z.object({
    dirPath: z.string().describe("目录路径，默认为当前目录").default("."),
  }),
  execute: async ({ dirPath }) => {
    try {
      const files = await readdir(join(process.cwd(), dirPath), {
        withFileTypes: true,
      });
      return {
        success: true,
        files: files.map((f) => ({
          name: f.name,
          isDirectory: f.isDirectory(),
        })),
      };
    } catch (error) {
      return { success: false, error: `无法列出目录: ${error.message}` };
    }
  },
});

// 工具 3：搜索文档内容
export const searchDocsTool = tool({
  description: "在已上传的文档中搜索相关内容",
  parameters: z.object({
    query: z.string().describe("搜索关键词或问题"),
  }),
  execute: async ({ query }) => {
    // 这里会调用 RAG 检索，后面实现
    const results = await searchDocuments(query);
    return { success: true, results };
  },
});

// 工具 4：执行数学计算
export const calculatorTool = tool({
  description: "执行数学计算，支持基本运算和 Math 函数",
  parameters: z.object({
    expression: z.string().describe("数学表达式，如 '2 + 3 * 4'"),
  }),
  execute: async ({ expression }) => {
    try {
      // 安全的数学表达式计算
      const sanitized = expression.replace(/[^0-9+\-*/().,%^ sqrt|pi|e]/g, "");
      const result = new Function(`"use strict"; return (${sanitized})`)();
      return { success: true, result: String(result) };
    } catch (error) {
      return { success: false, error: `计算错误: ${error.message}` };
    }
  },
});

// 工具 5：生成摘要
export const summarizeTool = tool({
  description: "对长文本生成简洁摘要",
  parameters: z.object({
    text: z.string().describe("需要摘要的文本"),
    maxLength: z.number().describe("摘要最大字数").default(200),
  }),
  execute: async ({ text, maxLength }) => {
    // 这个工具实际上会调用 LLM 来生成摘要
    // 但这里我们简化处理
    const summary = text.slice(0, maxLength) + (text.length > maxLength ? "..." : "");
    return { success: true, summary };
  },
});

// 所有工具集合
export const allTools = {
  read_file: readFileTool,
  list_files: listFilesTool,
  search_docs: searchDocsTool,
  calculator: calculatorTool,
  summarize: summarizeTool,
};
```

### Step 4：Agent 核心逻辑

```typescript
// lib/agent/index.ts
import { streamText } from "ai";
import { openai } from "../llm/client";
import { allTools } from "./tools";

const SYSTEM_PROMPT = `你是一个智能文档助手 Agent。你可以：
1. 读取和搜索用户的文档
2. 回答基于文档的问题
3. 执行数学计算
4. 生成文档摘要

工作原则：
- 先理解用户需求，再选择合适的工具
- 如果需要查找信息，优先使用 search_docs 工具
- 如果需要读取特定文件，使用 read_file 工具
- 给出回答时，引用来源文档
- 保持回答简洁准确

可用工具：
- read_file: 读取文件内容
- list_files: 列出目录文件
- search_docs: 搜索文档内容
- calculator: 数学计算
- summarize: 文本摘要`;

export async function* agentChat(messages: any[]) {
  const result = streamText({
    model: openai("gpt-4o"),
    system: SYSTEM_PROMPT,
    messages,
    tools: allTools,
    maxSteps: 10, // 最大工具调用次数
  });

  return result;
}

// 简单的 Agent 状态管理
export class AgentSession {
  private messages: any[] = [];
  private maxHistory = 20;

  addMessage(message: any) {
    this.messages.push(message);
    // 保持历史长度
    if (this.messages.length > this.maxHistory) {
      this.messages = this.messages.slice(-this.maxHistory);
    }
  }

  getMessages() {
    return this.messages;
  }

  clear() {
    this.messages = [];
  }
}
```

### Step 5：RAG 模块（文档检索）

```typescript
// lib/rag/retriever.ts
import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

// 全局向量存储
let vectorStore: MemoryVectorStore | null = null;

// 初始化 Embedding 模型
const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small",
});

// 文档分块
export async function splitDocument(content: string, metadata: any = {}) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
    separators: ["\n\n", "\n", "。", "！", "？", ".", "!", "?"],
  });

  const docs = await splitter.createDocuments([content], [metadata]);
  return docs;
}

// 添加文档到向量存储
export async function addDocument(content: string, filename: string) {
  const docs = await splitDocument(content, { source: filename });

  if (!vectorStore) {
    vectorStore = await MemoryVectorStore.fromDocuments(docs, embeddings);
  } else {
    await vectorStore.addDocuments(docs);
  }

  return { success: true, chunks: docs.length };
}

// 搜索相关文档
export async function searchDocuments(query: string, k: number = 3) {
  if (!vectorStore) {
    return { results: [], message: "还没有上传任何文档" };
  }

  const results = await vectorStore.similaritySearchWithScore(query, k);

  return {
    results: results.map(([doc, score]) => ({
      content: doc.pageContent,
      source: doc.metadata.source,
      score: score.toFixed(3),
    })),
  };
}
```

### Step 6：API 路由

```typescript
// app/api/chat/route.ts
import { streamText } from "ai";
import { openai } from "@/lib/llm/client";
import { allTools } from "@/lib/agent/tools";

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai("gpt-4o"),
    system: `你是一个智能文档助手。你可以读取文件、搜索文档、执行计算。
回答时要引用来源，保持简洁准确。`,
    messages,
    tools: allTools,
    maxSteps: 10,
  });

  return result.toDataStreamResponse();
}

// app/api/docs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { addDocument } from "@/lib/rag/retriever";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "没有上传文件" }, { status: 400 });
  }

  const content = await file.text();
  const result = await addDocument(content, file.name);

  return NextResponse.json(result);
}
```

### Step 7：前端组件

```typescript
// components/chat/ChatPanel.tsx
"use client";

import { useChat } from "@ai-sdk/react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function ChatPanel() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: "/api/chat",
    });

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto">
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100"
              }`}
            >
              {message.role === "assistant" ? (
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p>{message.content}</p>
              )}

              {/* 显示工具调用 */}
              {message.toolInvocations?.map((tool, i) => (
                <div
                  key={i}
                  className="mt-2 p-2 bg-yellow-50 rounded text-sm"
                >
                  <span className="font-mono text-yellow-700">
                    调用工具: {tool.toolName}
                  </span>
                  {"result" in tool && (
                    <pre className="mt-1 text-xs overflow-x-auto">
                      {JSON.stringify(tool.result, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 输入框 */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="输入你的问题..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            发送
          </button>
        </div>
      </form>
    </div>
  );
}

// components/docs/DocUploader.tsx
"use client";

import { useState } from "react";

export function DocUploader() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/docs", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (data.success) {
        setResult(`上传成功！文档被分为 ${data.chunks} 个片段`);
      } else {
        setResult(`上传失败: ${data.error}`);
      }
    } catch (error) {
      setResult(`上传失败: ${error}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-medium mb-2">上传文档</h3>
      <input
        type="file"
        accept=".txt,.md,.pdf"
        onChange={handleUpload}
        disabled={uploading}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />
      {uploading && <p className="mt-2 text-sm text-gray-500">处理中...</p>}
      {result && <p className="mt-2 text-sm">{result}</p>}
    </div>
  );
}
```

### Step 8：主页面

```typescript
// app/page.tsx
import { ChatPanel } from "@/components/chat/ChatPanel";
import { DocUploader } from "@/components/docs/DocUploader";

export default function Home() {
  return (
    <div className="flex h-screen">
      {/* 侧边栏 */}
      <aside className="w-80 border-r p-4 flex flex-col gap-4">
        <h1 className="text-xl font-bold">AI 文档助手</h1>
        <DocUploader />
        <div className="flex-1 overflow-y-auto">
          <h3 className="font-medium mb-2">使用说明</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>1. 上传文档（支持 .txt, .md, .pdf）</li>
            <li>2. 在对话框中提问关于文档的问题</li>
            <li>3. AI 会自动搜索相关内容并回答</li>
            <li>4. 可以让 AI 读取特定文件或执行计算</li>
          </ul>
        </div>
      </aside>

      {/* 主对话区 */}
      <main className="flex-1">
        <ChatPanel />
      </main>
    </div>
  );
}
```

## 运行和测试

```bash
# 启动开发服务器
pnpm dev

# 访问 http://localhost:3000

# 测试流程：
# 1. 上传一个 .txt 或 .md 文件
# 2. 在对话框输入 "总结一下这个文档"
# 3. 观察 Agent 的工具调用过程
# 4. 继续追问文档中的细节
```

## 扩展方向

完成基础版本后，可以继续扩展：

1. **多文档支持**：支持上传多个文档，跨文档搜索
2. **对话历史**：保存和恢复对话
3. **更多工具**：网页搜索、API 调用、代码执行
4. **流式工具调用**：实时展示工具执行过程
5. **Agent 可视化**：展示 Agent 的思考和决策过程
6. **多模型切换**：支持 OpenAI/Claude/DeepSeek
7. **用户认证**：多用户支持
8. **部署上线**：Vercel 部署

## 学习要点

通过这个项目，你会学到：

1. **LLM API 调用**：如何与大模型交互
2. **Function Calling**：如何定义和使用工具
3. **RAG 检索**：如何实现文档搜索和问答
4. **流式响应**：如何实现实时输出
5. **Agent 设计**：如何设计 Agent 的工具和行为
6. **前端集成**：如何在 React 中使用 AI 能力
7. **全栈开发**：Next.js API Routes + 前端组件

这个项目是你进入 AI 应用开发的最佳起点。完成它之后，你就有资格在简历上写"有 AI Agent 应用开发经验"了。
