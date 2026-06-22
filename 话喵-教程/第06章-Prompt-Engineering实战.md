# 第06章：Prompt Engineering 实战

## 本章目标

**要做的事**：学习 Prompt 设计技巧，为话喵设计文章和诗词的核心 Prompt

**学到的知识**：
- Prompt 设计的六大原则
- Zero-shot vs Few-shot
- Chain-of-Thought（思维链）
- 结构化输出控制
- System Prompt 的分层设计

## 6.1 什么是 Prompt Engineering？

```
同一个 AI，不同的 Prompt，输出质量天差地地：

差的 Prompt：
  "写一篇文章"
  → 泛泛而谈，不知道写什么主题、多长、什么风格

好的 Prompt：
  "你是一个专业的科技博客作者。请以《为什么前端开发者应该学AI》为题，
   写一篇1500字的技术博客。要求：
   1. 语言通俗易懂，适合前端开发者阅读
   2. 每个观点配一个具体的代码示例
   3. 开头用一个引人入胜的故事引入
   4. 结尾给出具体的学习建议"
  → 方向明确，风格统一，质量可控
```

Prompt Engineering 就是"如何跟 AI 说话"的技术。

## 6.2 六大设计原则

### 原则一：角色设定（Role）

告诉 AI 它是谁，它会以那个角色来回答。

```
差："帮我写一段代码"
好："你是一个资深的 TypeScript 开发者，代码风格严格遵循 Clean Code 原则。
    请帮我写一个用户认证模块"
```

话喵中的应用：
```
文章创作："你是一位经验丰富的写作专家，擅长各类文体创作..."
古诗词：  "你是一位精通古典文学的诗人，深谙唐诗宋词的格律和意境..."
```

### 原则二：明确具体（Specific）

```
差："写一篇好文章"
好："写一篇关于人工智能的科普文章，面向非技术读者，1000字左右"
```

关键信息要明确：
```
- 主题：写什么
- 字数：写多长
- 风格：怎么写
- 受众：写给谁
- 格式：输出什么格式
```

### 原则三：提供示例（Few-shot）

给 AI 看几个例子，它就能学会你要的格式。

```
请按以下格式输出产品描述：

示例1：
产品：无线蓝牙耳机
描述：轻如羽毛，声如天籁。40小时超长续航，让音乐陪你走过每一个通勤的早晨。
亮点：主动降噪 | 蓝牙5.3 | IPX5防水

示例2：
产品：智能台灯
描述：一盏懂你的灯。自动调节亮度和色温，从清晨阅读到深夜加班，守护你的每一刻用眼时光。
亮点：自动调光 | 护眼模式 | 语音控制

现在请写：
产品：{用户输入的产品名}
```

### 原则四：思维链（Chain-of-Thought）

让 AI 先想再答，提高复杂任务的准确率。

```
差："123 * 456 等于多少？"
    AI 可能直接猜一个答案

好："请一步步计算 123 * 456：
    1. 先列出竖式
    2. 逐步计算每一位
    3. 汇总得到最终结果"
    AI 会展示计算过程，准确率大大提高
```

话喵中的应用（生成文章前先规划）：
```
请按以下步骤创作文章：
1. 先列出文章大纲（3-5个要点）
2. 为每个要点写100-200字的展开
3. 写一个引人入胜的开头
4. 写一个有力的结尾
5. 最后整合为完整文章
```

### 原则五：约束条件（Constraints）

告诉 AI 什么不能做，什么必须做。

```
要求（必须做到）：
  - 文章必须包含3个以上具体案例
  - 每段不超过200字
  - 必须有小标题分段

禁止（不能做）：
  - 不要使用"首先、其次、最后"这种老套的连接词
  - 不要编造虚假数据
  - 不要在开头说"在这个快节奏的时代"
```

### 原则六：输出格式（Format）

明确指定输出格式，便于前端解析和渲染。

```
请用 Markdown 格式输出，包含：
# 标题
> 引言（一句话概括）
## 要点一
内容...
## 要点二
内容...
## 总结
```

## 6.3 为话喵设计文章创作 Prompt

结合六大原则，设计文章创作的 System Prompt：

```typescript
// src/lib/prompts/article.ts

export function getArticleSystemPrompt(options: {
  style?: string;
  wordCount?: number;
  detailLevel?: string;
}) {
  const { style = "专业", wordCount = 1500, detailLevel = "适中" } = options;

  return `你是一位经验丰富的写作专家，擅长各类文体创作。

## 写作要求
- 文章字数：约${wordCount}字
- 写作风格：${style}
- 详细程度：${detailLevel}
- 使用 Markdown 格式输出
- 必须有清晰的标题和段落结构

## 文章结构
1. 标题（# 标题）
2. 引言（简要概述文章主题，吸引读者注意）
3. 正文（分为3-5个要点，每个要点用 ## 小标题）
4. 总结（总结全文要点，给出思考或建议）

## 写作约束
- 不要使用"首先、其次、最后"这种老套的连接词
- 不要在开头说"在这个快节奏的时代"或类似套话
- 每个要点必须有具体的例子或数据支撑
- 语言要自然流畅，像真人写的，不要有 AI 味
- 适当使用修辞手法（比喻、排比等）增加文采

## 风格参考
${getStyleGuide(style)}`;
}

function getStyleGuide(style: string): string {
  const guides: Record<string, string> = {
    专业: "用词准确严谨，逻辑清晰，引用权威来源。适合技术文档、行业分析。",
    轻松: "口语化表达，适当幽默，像朋友聊天。适合生活类、娱乐类文章。",
    文艺: "语言优美，意境丰富，善用修辞。适合散文、随笔、读后感。",
    新闻: "客观中立，倒金字塔结构（重要信息放前面）。适合新闻报道、事件分析。",
    故事: "以叙事为主，有人物、情节、冲突。适合人物传记、案例分析。",
  };
  return guides[style] || guides["专业"];
}
```

## 6.4 为话喵设计古诗词 Prompt

```typescript
// src/lib/prompts/poem.ts

export function getPoemSystemPrompt(options: {
  type?: string;
  dynasty?: string;
}) {
  const { type = "七言绝句", dynasty = "唐" } = options;

  return `你是一位精通古典文学的诗人，深谙${dynasty}代诗词的格律和意境。

## 创作要求
- 诗词类型：${type}
- 风格参考：${dynasty}代诗风
- 根据用户提供的名词或主题创作

## 格律要求
${getTypeRules(type)}

## 创作原则
1. 意境优先：诗要有画面感，让读者"看见"诗中的场景
2. 用典自然：可以用典故，但要自然不生硬
3. 情景交融：景中有情，情中有景
4. 语言凝练：每个字都要有用，不多余

## 输出格式
请按以下格式输出：

### 诗词标题

（诗词正文）

---
**注释**
- 词语1：解释
- 词语2：解释

**赏析**
（对诗词的意境、手法、情感进行赏析，100字左右）

## 约束
- 不要写现代白话诗
- 不要在诗词正文中加括号注释
- 不要使用过于生僻的字
`;
}

function getTypeRules(type: string): string {
  const rules: Record<string, string> = {
    五言绝句: `五言绝句，四句，每句五字。
平仄格式参考：
仄仄平平仄，平平仄仄平。
平平平仄仄，仄仄仄平平。`,

    七言绝句: `七言绝句，四句，每句七字。
平仄格式参考：
平平仄仄平平仄，仄仄平平仄仄平。
仄仄平平平仄仄，平平仄仄仄平平。`,

    五言律诗: `五言律诗，八句，每句五字。中间两联要求对仗。
首联 → 颔联（对仗）→ 颈联（对仗）→ 尾联`,

    七言律诗: `七言律诗，八句，每句七字。中间两联要求对仗。
首联 → 颔联（对仗）→ 颈联（对仗）→ 尾联`,

    宋词: `宋词，按词牌填写。
常见词牌格式：
- 浣溪沙：上下两阙，每阙三句
- 蝶恋花：上下两阙
- 水调歌头：上下两阙
请注明使用的词牌名。`,
  };
  return rules[type] || rules["七言绝句"];
}
```

## 6.5 结构化输出

有时候我们需要 AI 输出特定格式的数据（JSON），而不只是自然语言。

```typescript
// 让 AI 分析文章风格，输出结构化结果
export const styleAnalysisPrompt = `分析以下文章的写作风格，用 JSON 格式输出：

{
  "tone": "正式|轻松|文艺|幽默|严肃",
  "vocabulary": "简单|适中|复杂|学术",
  "sentenceLength": "短句为主|长短结合|长句为主",
  "features": ["特点1", "特点2", "特点3"],
  "summary": "一句话总结风格特点"
}

只输出 JSON，不要其他内容。`;
```

在调用时使用 `response_format`：

```typescript
const response = await llm.chat.completions.create({
  model: "deepseek-chat",
  messages: [
    { role: "system", content: styleAnalysisPrompt },
    { role: "user", content: `文章内容：\n${articleContent}` },
  ],
  response_format: { type: "json_object" }, // 强制 JSON 输出
});
```

## 6.6 Prompt 测试与迭代

写好 Prompt 后要测试：

```typescript
// 测试不同输入下的输出质量
const testCases = [
  { input: "春天", expected: "有春天意象的诗词" },
  { input: "孤独", expected: "有情感深度的诗词" },
  { input: "编程", expected: "现代主题的古风诗词" },
];

for (const test of testCases) {
  const result = await callLLM(test.input);
  console.log(`输入：${test.input}`);
  console.log(`输出：${result}`);
  console.log("---");
}
```

**迭代原则**：
1. 先写一个基础版 Prompt
2. 用不同输入测试
3. 观察输出哪里不满意
4. 在 Prompt 中增加约束或示例
5. 重复 2-4

## 6.7 Prompt 模板化

把 Prompt 抽成函数，通过参数控制行为：

```typescript
// 好的设计：参数化
function getPrompt(options: { style: string; wordCount: number }) {
  return `你是一个${options.style}风格的作者，写${options.wordCount}字...`;
}

// 调用
getPrompt({ style: "文艺", wordCount: 2000 });

// 差的设计：硬编码
const prompt = "你是一个文艺风格的作者，写2000字...";
// 每次改需求都要改代码
```

## 本章小结

| 原则 | 说明 | 话喵应用 |
|------|------|---------|
| 角色设定 | 告诉 AI 它是谁 | 写作专家 / 古典诗人 |
| 明确具体 | 明确主题、字数、风格 | 参数化配置 |
| 提供示例 | 给例子让 AI 学习 | 诗词格律示例 |
| 思维链 | 让 AI 先想再答 | 先列大纲再写文章 |
| 约束条件 | 限制不能做什么 | 禁止套话、禁止现代白话 |
| 输出格式 | 指定输出结构 | Markdown / JSON |

## 动手验证

1. 用不同的 System Prompt 调用 AI，对比输出质量
2. 测试 Few-shot（给示例）和 Zero-shot（不给示例）的差异
3. 试用结构化输出（JSON），验证格式是否正确
4. 给话喵的 Prompt 写几个测试用例，确保不同输入都能生成合理输出

## 下一章预告

有了好的 Prompt，我们开始实现话喵的第一个核心功能 —— 文章创作器。你将构建一个完整的创作表单，用户输入标题、选择参数，AI 流式生成格式化的 Markdown 文章。
