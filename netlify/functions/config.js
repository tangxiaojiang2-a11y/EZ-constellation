// 供 setup.html 选用：把模型密钥写入 Netlify Blobs（无需管理员口令）。
// 页面不会把完整密钥读回去；本机密钥以 setup 写入的 localStorage 为准。

const { getStore } = require("@netlify/blobs");

const ALLOWED = {
  "https://api.deepseek.com": true,
  "https://ark.cn-beijing.volces.com/api/v3": true,
  "https://api.moonshot.cn/v1": true,
  "https://dashscope.aliyuncs.com/compatible-mode/v1": true,
  "https://api.hunyuan.cloud.tencent.com/v1": true,
  "https://open.bigmodel.cn/api/paas/v4": true,
  "https://api.openai.com/v1": true
};

function headers() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  };
}

function cleanBase(value) {
  return String(value || "").replace(/\/+$/, "");
}

function openStore() {
  return getStore({ name: "xingliu-ai", consistency: "strong" });
}

async function readSettings() {
  const store = openStore();
  return store.get("settings", { type: "json" });
}

function tail(key) {
  const text = String(key || "");
  if (text.length < 4) return "";
  return text.slice(-4);
}

function publicView(saved) {
  const envKey = process.env.AI_API_KEY || "";
  const fromPage = !!(saved && saved.apiKey);
  const key = fromPage ? saved.apiKey : envKey;
  return {
    configured: !!key,
    source: fromPage ? "page" : (envKey ? "env" : ""),
    base: cleanBase((saved && saved.base) || process.env.AI_API_BASE || ""),
    model: (saved && saved.model) || process.env.AI_MODEL || "",
    visionModel: (saved && saved.visionModel) || process.env.AI_VISION_MODEL || "",
    keyTail: tail(key)
  };
}

exports.handler = async function (event) {
  const h = headers();
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: h, body: "" };
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: h, body: JSON.stringify({ error: { message: "只接受 POST" } }) };
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch (err) {
    return { statusCode: 400, headers: h, body: JSON.stringify({ error: { message: "请求不是 JSON" } }) };
  }

  const action = body.action || "status";

  let saved = null;
  try { saved = await readSettings(); }
  catch (err) {
    return { statusCode: 500, headers: h, body: JSON.stringify({ error: { message: "读不到站点存储，确认已经部署到 Netlify" } }) };
  }

  if (action === "status") {
    return {
      statusCode: 200,
      headers: h,
      body: JSON.stringify({ view: publicView(saved) })
    };
  }

  if (action === "save") {
    const base = cleanBase(body.base);
    const apiKey = String(body.apiKey || "").trim();
    const model = String(body.model || "").trim();
    const visionModel = String(body.visionModel || "").trim();
    if (!apiKey) {
      return { statusCode: 400, headers: h, body: JSON.stringify({ error: { message: "请填写 API Key" } }) };
    }
    if (!model) {
      return { statusCode: 400, headers: h, body: JSON.stringify({ error: { message: "请填写文本模型" } }) };
    }
    if (!ALLOWED[base]) {
      return { statusCode: 400, headers: h, body: JSON.stringify({ error: { message: "这个接口地址不在允许列表里" } }) };
    }
    const next = { apiKey: apiKey, base: base, model: model, visionModel: visionModel, updatedAt: Date.now() };
    try {
      await openStore().setJSON("settings", next);
    } catch (err) {
      return { statusCode: 500, headers: h, body: JSON.stringify({ error: { message: "保存失败，请稍后再试" } }) };
    }
    return { statusCode: 200, headers: h, body: JSON.stringify({ ok: true, view: publicView(next) }) };
  }

  if (action === "test") {
    const viewSource = saved && saved.apiKey ? saved : null;
    const key = String(body.apiKey || "").trim() || (viewSource && viewSource.apiKey) || process.env.AI_API_KEY || "";
    const base = cleanBase(body.base || (viewSource && viewSource.base) || process.env.AI_API_BASE || "https://api.deepseek.com");
    const model = String(body.model || "").trim() || (viewSource && viewSource.model) || process.env.AI_MODEL || "deepseek-chat";
    if (!key) {
      return { statusCode: 400, headers: h, body: JSON.stringify({ error: { message: "还没有密钥，先保存再测试" } }) };
    }
    if (!ALLOWED[base]) {
      return { statusCode: 400, headers: h, body: JSON.stringify({ error: { message: "接口地址不在允许列表里" } }) };
    }
    try {
      const response = await fetch(base + "/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
        body: JSON.stringify({
          model: model,
          messages: [{ role: "user", content: "只回复一个字：好" }],
          max_tokens: 16,
          temperature: 0
        })
      });
      const text = await response.text();
      if (!response.ok) {
        let message = "模型没有接通";
        try {
          const parsed = JSON.parse(text);
          if (parsed.error && parsed.error.message) message = String(parsed.error.message).slice(0, 180);
        } catch (err) { /* keep short */ }
        return { statusCode: 200, headers: h, body: JSON.stringify({ ok: false, message: message }) };
      }
      return { statusCode: 200, headers: h, body: JSON.stringify({ ok: true, message: "已接通 " + model }) };
    } catch (err) {
      return { statusCode: 200, headers: h, body: JSON.stringify({ ok: false, message: "网络没有到达模型接口" }) };
    }
  }

  return { statusCode: 400, headers: h, body: JSON.stringify({ error: { message: "未知操作" } }) };
};
