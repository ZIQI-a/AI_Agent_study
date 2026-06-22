# 第04章：AI 基础 — 调用你的第一个 LLM API

## 本章目标

**要做的事**：安装 AI SDK，编写 API Route 调用 DeepSeek，前端显示 AI 回复

**学到的知识**：
- LLM 是什么，用前端思维理解
- Token、Temperature、Max Tokens 的含义
- OpenAI SDK 的基本用法
- Next.js API Route 编写
- 服务端 vs 客户端的 API 调用安全

## 4.1 什么是 LLM？

LLM（Large Language Model，大语言模型）的本质：

```
LLM = 一个超级大的"接龙"函数

输入：一串文字（Prompt）
输出：一串文字（Completion）
过程：根据输入的每个字，预测下一个最可能的字，不断重复

就像手机输入法的"联想"功能，但联想能力强大了几百万倍。
```

### 用前端思维理解

```typescript
// 你熟悉的 API 调用
const weather = await fetch("/api/weather?city=北京");
// → { temperature: 25, condition: "晴" }

// LLM API 调用，本质一样
const ai = await llm.chat({
  messages: [{ role: "user", content: "北京今天天气怎么样？" }],
});
// → { content: "北京今天天气晴朗，气温25°C，适合户外活动..." }

// 区别：普通 API 返回固定格式，LLM 返回自然语言
// 普通 API 的输出是确定的，LLM 的输出每次可能不同
```

## 4.2 核心概念

### Token（词元）

LLM 不是一个字一个字处理的，而是按 Token 处理。

```
英文：
  "Hello world" → ["Hello", " world"] → 2 个 Token
  1 Token ≈ 4 个英文字母 ≈ 0.75 个英文单词

中文：
  "你好世界" → ["你好", "世界"] → 2-4 个 Token
  1 Token ≈ 1-2 个汉字

为什么要关心 Token？
  1. 计费：按 Token 数量收费
  2. 限制：模型有最大 Token 限制（上下文窗口）
  3. 速度：Token 越多，生成越慢
```

### Temperature（温度）

控制 AI 输出的随机性。范围通常 0-2。

```
Temperature = 0：
  最确定的输出，每次都一样
  适合：分类、提取、翻译

Temperature = 0.7：
  平衡创造性和准确性
  适合：通用对话、问答

Temperature = 1.5：
  非常随机，有创意
  适合：头脑风暴、诗歌创作

前端类比：就像 CSS 的随机种子
  temp=0   → 每次刷新页面布局一样
  temp=1   → 每次刷新页面布局略有不同
  temp=2   → 每次刷新页面布局完全不同
```

### Max Tokens（最大输出长度）

限制 AI 最多生成多少 Token。

```
max_tokens = 100   → 约 75 个汉字，适合短回答
max_tokens = 1000  → 约 750 个汉字，适合一般文章
max_tokens = 4000  → 约 3000 个汉字，适合长文章

注意：这是"输出"的限制，不是"输入+输出"的总限制
```

## 4.3 安装 SDK

```bash
# 安装 OpenAI SDK（DeepSeek 兼容）
pnpm add openai

# 安装 Vercel AI SDK（下一章用，先装好）
pnpm add ai @ai-sdk/openai
```

> **知识点：为什么用 OpenAI SDK 调 DeepSeek？**
> DeepSeek 的 API 完全兼容 OpenAI 的格式。用 OpenAI SDK 的好处是：
> - 代码写一次，换模型只需要改 baseURL
> - 社区大，文档全，遇到问题好查
> - TypeScript 类型支持完善

## 4.4 创建 LLM 客户端

创建 `src/lib/llm/client.ts`：

```typescript
import OpenAI from "openai";

// 创建 DeepSeek 客户端
// apiKey 从环境变量读取，不会暴露到前端
export const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

// 如果要切换到通义千问，只需要改这两行
export const qwen = new OpenAI({
  apiKey: process.env.QWEN_API_KEY,
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
});

// 默认使用 DeepSeek
export const llm = deepseek;
```

> **知识点：为什么客户端代码在 `src/lib/` 而不是 `src/app/api/`？**
> - `src/lib/` 放工具函数和配置，可被任何地方引用
> - `src/app/api/` 放 API 路由，是 HTTP 接口
> - LLM 客户端是工具，不是接口，所以放 `src/lib/`

## 4.5 编写第一个 API Route

创建 `src/app/api/test/route.ts`：

```typescript
import { NextResponse } from "next/server";
import { llm } from "@/lib/llm/client";

export async function GET() {
  try {
    const response = await llm.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "你是一个友善的AI助手，请用简洁的中文回答。",
        },
        {
          role: "user",
          content: "用一句话介绍你自己",
        },
      ],
      max_tokens: 100,
      temperature: 0.7,
    });

    return NextResponse.json({
      success: true,
      reply: response.choices[0].message.content,
      usage: response.usage, // Token 使用量
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

### 测试 API

启动项目后访问 `http://localhost:3000/api/test`，你应该看到类似：

```json
{
  "success": true,
  "reply": "我是基于 DeepSeek 大语言模型的AI助手，可以帮你解答问题、创作文字、分析信息。",
  "usage": {
    "prompt_tokens": 25,
    "completion_tokens": 35,
    "total_tokens": 60
  }
}
```

> **知识点：messages 数组的三个角色**
> ```
> system：  系统消息，定义 AI 的角色和行为规则
>           用户看不到，但 AI 会遵守
>           类比：给员工的岗位说明书
> 
> user：    用户消息，用户的输入
>           类比：客户的需求
> 
> assistant：AI 的回复
>            可以预填，用于多轮对话
>            类比：员工的回复
> ```

## 4.6 前端调用 API

现在让前端页面调用这个 API 并显示结果。

创建一个测试页面 `src/app/test-ai/page.tsx`：

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer } from "@/components/layout/page-container";

export default function TestAI() {
  const [reply, setReply] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState<any>(null);

  const handleTest = async () => {
    setLoading(true);
    setReply("");
    setUsage(null);

    try {
      const response = await fetch("/api/test");
      const data = await response.json();

      if (data.success) {
        setReply(data.reply);
        setUsage(data.usage);
      } else {
        setReply("错误：" + data.error);
      }
    } catch (error) {
      setReply("请求失败：" + error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer title="AI 测试" description="测试 DeepSeek API 调用">
      <div className="space-y-6">
        <Button onClick={handleTest} disabled={loading}>
          {loading ? "AI 思考中..." : "调用 AI"}
        </Button>

        {reply && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AI 回复</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{reply}</p>
              {usage && (
                <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
                  <p>输入 Token：{usage.prompt_tokens}</p>
                  <p>输出 Token：{usage.completion_tokens}</p>
                  <p>
                    总计 Token：{usage.total_tokens}
                    <span className="ml-2">
                      （约 ¥{((usage.total_tokens / 1000000) * 2).toFixed(4)}）
                    </span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
```

访问 `http://localhost:3000/test-ai`，点击按钮，你会看到 AI 的回复和 Token 使用量。

## 4.7 多轮对话

LLM 没有"记忆"，每次调用都是独立的。多轮对话的实现方式是**把历史消息都发过去**。

创建 `src/app/api/chat-demo/route.ts`：

```typescript
import { NextRequest, NextResponse } from "next/server";
import { llm } from "@/lib/llm/client";

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const response = await llm.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "你是一个友善的AI助手，请用简洁的中文回答。",
        },
        ...messages, // 把所有历史消息传给 AI
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    return NextResponse.json({
      success: true,
      reply: response.choices[0].message.content,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

创建 `src/app/test-ai/chat/page.tsx`：

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer } from "@/components/layout/page-container";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatDemo() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: "user", content: input };
    const newMessages = [...messages, userMessage];

    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await response.json();

      if (data.success) {
        setMessages([...newMessages, { role: "assistant", content: data.reply }]);
      } else {
        setMessages([
          ...newMessages,
          { role: "assistant", content: "错误：" + data.error },
        ]);
      }
    } catch (error) {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "请求失败：" + error },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer title="对话测试" description="测试多轮对话">
      <div className="space-y-4">
        {/* 消息列表 */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <Card
                className={`max-w-[80%] ${
                  msg.role === "user" ? "bg-primary text-primary-foreground" : ""
                }`}
              >
                <CardContent className="py-2 px-4">
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </CardContent>
              </Card>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <Card>
                <CardContent className="py-2 px-4">
                  <p className="text-sm text-muted-foreground">AI 思考中...</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* 输入框 */}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="输入消息..."
            disabled={loading}
          />
          <Button onClick={handleSend} disabled={loading}>
            发送
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
```

## 4.8 错误处理

LLM API 调用可能遇到的常见错误：

```typescript
// 常见错误类型
const errorTypes = {
  // API Key 无效
  401: "API Key 无效或已过期，请检查环境变量",

  // 余额不足
  402: "API 余额不足，请前往平台充值",

  // 请求过于频繁
  429: "请求过于频繁，请稍后再试（Rate Limit）",

  // 模型不存在
  404: "模型不存在，请检查模型名称",

  // 输入太长
  413: "输入内容超出 Token 限制，请缩短内容",

  // 服务器错误
  500: "AI 服务暂时不可用，请稍后再试",

  // 超时
  timeout: "请求超时，请检查网络连接",
};
```

完善的错误处理：

```typescript
async function callLLM(messages: any[]) {
  try {
    const response = await llm.chat.completions.create({
      model: "deepseek-chat",
      messages,
      max_tokens: 1000,
    });
    return { success: true, data: response };
  } catch (error: any) {
    // OpenAI SDK 的错误格式
    const status = error.status || error.code;
    let message = "未知错误";

    if (status === 401) message = "API Key 无效";
    else if (status === 402) message = "余额不足";
    else if (status === 429) message = "请求过于频繁";
    else if (status === 413) message = "内容太长";
    else message = error.message || "请求失败";

    return { success: false, error: message };
  }
}
```

## 4.9 环境变量的安全边界

一个关键问题：哪些代码在服务器运行，哪些在浏览器运行？

```
服务器端（安全）：
  src/app/api/         → API Route
  src/lib/             → 工具函数（被 API Route 引用时）
  服务端组件           → 不加 "use client" 的组件

  ✅ 可以访问 process.env.DEEPSEEK_API_KEY
  ✅ 可以访问数据库
  ✅ 代码用户看不到

客户端（不安全）：
  "use client" 组件    → 浏览器中执行
  src/components/      → 通常在浏览器中执行

  ❌ 不能访问 process.env（环境变量不会发到浏览器）
  ❌ 代码用户可以看到
  ❌ 不能直接访问数据库
```

**所以**：API Key 只能在 `src/app/api/` 和 `src/lib/` 中使用，永远不要在 `"use client"` 组件中使用。

## 本章小结

| 概念 | 说明 |
|------|------|
| LLM | 大语言模型，本质是"根据输入预测下一个字"的函数 |
| Token | LLM 处理文本的最小单位，影响计费和速度 |
| Temperature | 控制输出随机性，0 最确定，2 最随机 |
| Max Tokens | 限制输出长度 |
| messages | 消息数组，包含 system/user/assistant 三种角色 |
| 环境变量 | API Key 只在服务端可用，不会暴露到前端 |

## 动手验证

1. 访问 `http://localhost:3000/api/test`，看到 AI 回复和 Token 用量
2. 访问 `http://localhost:3000/test-ai`，点击按钮调用 AI
3. 访问 `http://localhost:3000/test-ai/chat`，测试多轮对话
4. 试试删除 `.env.local` 中的 API Key，观察错误提示

## 下一章预告

目前的 AI 回复需要等待全部生成完才显示，体验很差。下一章我们将实现流式响应 —— 打字机效果，让 AI 的回复逐字出现在屏幕上。
