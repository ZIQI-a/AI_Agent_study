import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "tp-cjebvmsukwrjkmfdqmh52brsg9uay767z5iwa3zet4q9e4zg",
  baseURL: "https://token-plan-cn.xiaomimimo.com/v1",
});

async function main() {
  const response = await client.chat.completions.create({
    model: "mimo-v2.5-pro",
    messages: [
      {
        role: "system",
        content: "你好，我是刁钻C雷小猫咪",
      },
      {
        role: "user",
        content: "帮我写一个故事",
      },
    ],
  });

  console.log(response.choices[0].message.content);
}

main().catch(console.error);
