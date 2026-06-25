import { readFileSync, writeFileSync } from "fs";
import { marked } from "marked";

// 微信公众号兼容的内联样式配置
const styles = {
  h1: "font-size:22px;font-weight:bold;color:#1a1a1a;margin:30px 0 15px;padding-bottom:10px;border-bottom:2px solid #ff6b35;",
  h2: "font-size:19px;font-weight:bold;color:#1a1a1a;margin:25px 0 12px;padding-left:12px;border-left:4px solid #ff6b35;",
  h3: "font-size:17px;font-weight:bold;color:#333;margin:20px 0 10px;",
  p: "font-size:15px;color:#3d3d3d;line-height:1.8;margin:10px 0;text-align:justify;",
  blockquote: "background:#fff8f0;border-left:4px solid #ff6b35;padding:12px 16px;margin:15px 0;border-radius:0 8px 8px 0;font-size:14px;color:#666;",
  code_inline: "background:#f0f0f0;color:#e74c3c;padding:2px 6px;border-radius:4px;font-size:13px;font-family:Consolas,Monaco,monospace;",
  code_block: "background:#f5f5f5;color:#333;padding:16px;border-radius:8px;font-size:13px;line-height:1.8;margin:15px 0;font-family:Consolas,Monaco,monospace;white-space:pre-wrap;word-break:break-all;border:1px solid #e0e0e0;",
  ul: "font-size:15px;color:#3d3d3d;line-height:1.8;margin:10px 0;padding-left:20px;",
  ol: "font-size:15px;color:#3d3d3d;line-height:1.8;margin:10px 0;padding-left:20px;",
  li: "margin:5px 0;",
  table: "width:100%;border-collapse:collapse;margin:15px 0;font-size:14px;",
  th: "background:#ff6b35;color:#fff;padding:10px 12px;text-align:left;font-weight:bold;",
  td: "padding:8px 12px;border-bottom:1px solid #eee;",
  a: "color:#ff6b35;text-decoration:none;",
  strong: "color:#1a1a1a;font-weight:bold;",
  hr: "border:none;border-top:1px solid #e0e0e0;margin:25px 0;",
  img: "max-width:100%;border-radius:8px;margin:10px 0;",
};

// 自定义渲染器
const renderer = new marked.Renderer();

renderer.heading = function ({ text, depth }) {
  // 跳过 h1（微信公众号标题单独设置，正文不重复）
  if (depth === 1) return "";
  const tag = `h${depth}`;
  const style = styles[tag] || styles.h3;
  const rendered = marked.parseInline(text);
  return `<${tag} style="${style}">${rendered}</${tag}>`;
};

renderer.paragraph = function ({ text }) {
  const rendered = marked.parseInline(text);
  return `<p style="${styles.p}">${rendered}</p>`;
};

renderer.blockquote = function ({ text }) {
  const rendered = marked.parseInline(text);
  return `<blockquote style="${styles.blockquote}">${rendered}</blockquote>`;
};

renderer.code = function ({ text, lang }) {
  // 代码块中的特殊字符转义，换行转 <br
  // 用 div 而非 pre/code，兼容微信公众号
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
  return `<div style="${styles.code_block}">${escaped}</div>`;
};

renderer.codespan = function ({ text }) {
  return `<code style="${styles.code_inline}">${text}</code>`;
};

renderer.list = function ({ items, ordered }) {
  const tag = ordered ? "ol" : "ul";
  const style = ordered ? styles.ol : styles.ul;
  const body = items
    .map((item) => {
      const text = marked.parseInline(item.text);
      return `<li style="${styles.li}">${text}</li>`;
    })
    .join("");
  return `<${tag} style="${style}">${body}</${tag}>`;
};

renderer.table = function ({ header, rows }) {
  const headerHtml = header
    .map(
      (cell) =>
        `<th style="${styles.th}">${marked.parseInline(cell.text)}</th>`
    )
    .join("");
  const rowsHtml = rows
    .map(
      (row) =>
        `<tr>${row
          .map(
            (cell) =>
              `<td style="${styles.td}">${marked.parseInline(cell.text)}</td>`
          )
          .join("")}</tr>`
    )
    .join("");
  return `<table style="${styles.table}"><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>`;
};

renderer.link = function ({ href, text }) {
  return `<a href="${href}" style="${styles.a}">${text}</a>`;
};

renderer.strong = function ({ text }) {
  return `<strong style="${styles.strong}">${text}</strong>`;
};

renderer.em = function ({ text }) {
  return `<em style="font-style:italic;color:#555;">${text}</em>`;
};

renderer.hr = function () {
  return `<hr style="${styles.hr}"/>`;
};

renderer.image = function ({ href, text }) {
  return `<img src="${href}" alt="${text}" style="${styles.img}"/>`;
};

// 配置 marked
marked.setOptions({ renderer });

// 读取 Markdown 文件
const inputFile = process.argv[2] || "第01章-环境搭建与工具安装.md";
const outputFile = process.argv[3] || inputFile.replace(".md", "-wechat.html");

const markdown = readFileSync(inputFile, "utf-8");

// 移除第一个 h1 标题行（微信公众号标题单独设置，正文不重复）
const markdownWithoutH1 = markdown.replace(/^#\s+.+$/m, "").trimStart();

// 转换为 HTML
const html = marked.parse(markdownWithoutH1);

// 包装成完整的 HTML
const fullHtml = `<section style="max-width:100%;margin:0 auto;padding:10px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
${html}
</section>`;

writeFileSync(outputFile, fullHtml, "utf-8");
console.log(`转换完成: ${outputFile}`);
console.log(`文件大小: ${(fullHtml.length / 1024).toFixed(1)} KB`);
