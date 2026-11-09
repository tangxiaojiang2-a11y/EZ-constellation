// 把用户页面的解读请求转到 OpenAI 兼容接口。
// 密钥优先：环境变量 AI_API_KEY（开箱即用）> Blobs 旧配置 > 请求 Authorization（兼容）。

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
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json; charset=utf-8"
  };
}

function cleanBase(value) {
  return String(value || "").replace(/\/+$/, "");
}

async function savedSettings() {
  try {
    const { getStore } = require("@netlify/blobs");
    const store = getStore({ name: "xingliu-ai", consistency: "strong" });
    return await store.get("settings", { type: "json" });
  } catch (err) {
    return null;
  }
}

exports.handler = async function (event) {
  const h = headers();
  try {
    if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: h, body: "" };
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, headers: h, body: JSON.stringify({ error: { message: "只接受 POST" } }) };
    }

    let body;
    try { body = JSON.parse(event.body || "{}"); }
    catch (err) {
      return { statusCode: 400, headers: h, body: JSON.stringify({ error: { message: "请求不是 JSON" } }) };
    }
    if (!body.messages) {
      return { statusCode: 400, headers: h, body: JSON.stringify({ error: { message: "缺少 messages" } }) };
    }

    const saved = await savedSettings();
    const auth = event.headers.authorization || event.headers.Authorization || "";
    const userKey = auth.replace(/^Bearer\s+/i, "").trim();
    // 兼容常见变量名；环境变量优先，保证站长配一次全站开箱即用
    const siteKey = process.env.AI_API_KEY
      || process.env.DEEPSEEK_API_KEY
      || process.env.OPENAI_API_KEY
      || (saved && saved.apiKey)
      || "";
    const siteBase = cleanBase(
      process.env.AI_API_BASE
      || process.env.DEEPSEEK_API_BASE
      || process.env.OPENAI_BASE_URL
      || (saved && saved.base)
      || "https://api.deepseek.com"
    );
    const textModel = process.env.AI_MODEL
      || process.env.DEEPSEEK_MODEL
      || process.env.OPENAI_MODEL
      || (saved && saved.model)
      || "deepseek-chat";
    const visionModel = process.env.AI_VISION_MODEL
      || (saved && saved.visionModel)
      || textModel;

    const image = JSON.stringify(body.messages).indexOf("image_url") !== -1;
    let base;
    let key;
    let model;
    if (userKey) {
      base = cleanBase(body.base || siteBase);
      if (!ALLOWED[base]) {
        return { statusCode: 400, headers: h, body: JSON.stringify({ error: { message: "这个接口不在允许列表里" } }) };
      }
      key = userKey;
      model = body.model || (image ? visionModel : textModel);
    } else if (siteKey) {
      base = siteBase;
      key = siteKey;
      model = image ? visionModel : textModel;
    } else {
      return { statusCode: 401, headers: h, body: JSON.stringify({ error: { message: "站点未配置模型密钥" } }) };
    }

    const payload = {
      model: model,
      messages: body.messages,
      temperature: typeof body.temperature === "number" ? body.temperature : 0.35,
      max_tokens: body.max_tokens || 5500
    };
    if (body.tools) payload.tools = body.tools;

    const response = await fetch(base + "/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
      body: JSON.stringify(payload)
    });
    const text = await response.text();
    return { statusCode: response.status, headers: h, body: text };
  } catch (err) {
    return {
      statusCode: 500,
      headers: h,
      body: JSON.stringify({ error: { message: "解读服务异常：" + String((err && err.message) || err).slice(0, 160) } })
    };
  }
};
