# 星六 · 星座×小六壬（uni-app 三端）

一款结合西方星座文化与传统小六壬民俗文化的趣味人格、运势、居家环境参考工具。
**纯娱乐合规产品**：无封建迷信、无改运化解、全站禁词过滤、底部常驻免责声明。

> **v2.2 已发布**：**全玩法 AI 自动分析**——开启 AI 后，起卦/命盘/合盘/塔罗/灵数/前世/未来趋势/星座图鉴/星座配对/今日一占全部自动走 AI，综合大数据生成内容（Prompt 注入人群画像与多源知识要求）；新增**联网搜索增强**开关（Kimi `$web_search` / 智谱 `web_search` 官方工具自动注入），并修复金币二次起卦失效问题。
> **v2.1 已发布**：AI 设置升级为**多平台一键预设**——DeepSeek / 豆包·火山方舟 / Kimi·月之暗面 / 通义千问 / 腾讯混元 / 智谱 GLM / OpenAI / 自定义，选中即自动填充接口地址与推荐模型（含视觉模型），并附各平台接入提示。
> **v2.0 大版本**：原型 `index.html` 升级为「中西分合 · 5 Tab」全新架构，新增星座男女分版/星座配对/三法起卦+AI 解卦/塔罗/生命灵数/前世今生/未来趋势/AI 拍照空间解读，UI 全面年轻化改版。详见《星六-v2.0改动说明.md》。

## 功能对齐原型（v2.0）

- **首页**：九宫格功能入口 + 今日一占 + 最近记录
- **星座图鉴**：12 星座 × 男女分版解读（性格魅力/心动择偶/如何沟通/雷区/约会场景）
- **星座配对**：144 组合契合度算法（元素相性 + 对宫引力 + 同象默契 + 16 组特调）
- **中西合盘命盘**：我的命盘 / 双人合盘 / 帮TA推算 / 未来趋势 四模式
- **小六壬起卦**：时间 / 数字 / 随机三法起课，金币动画，AI 智能解卦（失败回退本地四节报告）
- **西方秘境**：塔罗一牌（22 大阿卡纳正逆位）/ 生命灵数（1-9 + 11/22/33）/ 前世今生故事推演
- **我的**：AI 设置（文本 + 视觉模型）/ 拍照解读空间氛围（AI 视觉）/ 历史 / 关于
- **AI 接口**：8 个平台一键预设（DeepSeek/豆包/Kimi/通义/混元/智谱/OpenAI/自定义），均为 OpenAI 兼容协议；豆包模型栏填 `ep-` 接入点 ID；失败自动回退本地引擎
- **合规**：禁词过滤引擎级生效（AI 输出二次过滤），计算全程本地、结果可复现

## 工程结构

```
starliuren-uniapp/
├── netlify.toml              # Netlify 部署配置（H5）
├── package.json              # uni-app vue3 + vite 工具链
├── index.html                # H5 模板
├── scripts/
│   └── extract-engine.mjs    # 从原型 index.html 提取引擎（引擎更新后重跑）
├── test/
│   └── engine.test.mjs       # 引擎自动化测试（23 项）
└── src/
    ├── manifest.json         # 三端应用配置（appid 在此填）
    ├── pages.json            # 页面路由
    ├── utils/
    │   ├── engine.js         # ★ 核心引擎（自动提取，勿手改）：星座/农历/小六壬/报告/合规/AI Prompt
    │   ├── ai.js             # AI 通用调用（OpenAI 兼容，uni.request 全端可用）
    │   └── store.js          # 历史记录存储
    ├── components/
    │   └── birth-picker.vue  # 出生日期+时辰选择组件
    └── pages/
        ├── index/index.vue   # 首页：三模式切换 + 今日一占 + AI 设置 + 历史
        └── report/report.vue # 报告页：顶卡 + 六/五板块 + 复制全文
```

## 功能对齐原型（uni-app 工程基线 v1.x）

- **我的命盘**：六板块完整报告（人格底色/相处/爱好/爱情配对/近期运势/居家环境参考）
- **双人合盘**：恋人/朋友/同事三种关系，契合度评分 + 5 板块
- **帮TA推算**：为他人生成带昵称的专属报告，可直接转发
- **今日一占**：当天农历 + 当前时辰起课，每日刷新
- **AI 接口**：多平台一键预设（DeepSeek/豆包/Kimi/通义/混元/智谱/OpenAI/自建中转），失败自动回退本地引擎
- **合规**：禁词过滤引擎级生效（AI 输出也二次过滤），计算全程本地、结果永久唯一

## 本地开发

```bash
npm install          # 已配置 npmmirror 可用
npm run dev:h5       # H5 开发
npm run dev:mp-weixin # 微信小程序开发（用微信开发者工具打开 dist/dev/mp-weixin）
```

## 构建与测试

```bash
node test/engine.test.mjs  # 引擎自动化测试（23 项）
npm run build:h5          # H5 产物 → dist/build/h5
npm run build:mp-weixin   # 小程序产物 → dist/build/mp-weixin
```

## Netlify 部署（H5 端）

已内置 `netlify.toml`，两种方式任选：

**方式 A：Git 仓库自动部署（推荐）**
1. 把本目录推到 GitHub/GitLab 仓库
2. Netlify → Add new site → Import an existing project → 选仓库
3. 构建命令与发布目录会自动读取 `netlify.toml`（`npm run build:h5` → `dist/build/h5`），直接 Deploy

**方式 B：手动拖拽**
1. 本地 `npm run build:h5`
2. Netlify → Add new site → Deploy manually → 拖入 `dist/build/h5` 文件夹

**方式 C：CLI**
```bash
npm i -g netlify-cli
netlify deploy --build --prod
```

## APP / 小程序出包

- **微信小程序**：`npm run build:mp-weixin` → 微信开发者工具导入 `dist/build/mp-weixin`，在 `src/manifest.json` 的 `mp-weixin.appid` 填入小程序 AppID
- **Android/iOS APP**：用 HBuilderX 导入本工程 → 发行 → 原生 App-云打包（`manifest.json` 已预留 app-plus 配置）

## 注意事项

1. **AI 跨域（仅 H5 端）**：浏览器直连第三方 AI 接口可能受 CORS 限制，失败会自动回退本地引擎；生产建议在 Netlify 加反向代理（Functions）或使用支持 CORS 的中转地址。小程序/APP 端无此问题。AI 设置弹窗内已有同款提示。
2. **AI 平台模型名时效性**：各平台模型迭代较快（如 Kimi 的 moonshot-v1 已下线、DeepSeek v4 系列逐步替代 v3.2），预设中的推荐模型以 2026 年调研为准；失效时在「我的 → AI 设置」切换「自定义」手填即可，无需改代码。
3. **联网搜索增强**：v2.2 实验功能，适配 Kimi（`$web_search` 内置工具）与智谱（`web_search`）官方协议，自动注入请求参数；其他平台开关不生效（基于模型内置知识综合分析）。开启后 AI 会检索实时热点与公开讨论，响应耗时与 token 消耗会增加。
4. **AI 调用成本**：全玩法自动 AI 后，每次生成都会产生 token 消耗（星座图鉴/配对结果按组合做了内存缓存，同一会话不重复计费）。
2. **引擎更新**：改原型 `star-liuren-app/index.html` 的 ENGINE 区块后，运行 `node scripts/extract-engine.mjs` 重新生成 `src/utils/engine.js`，再跑测试。引擎区块保持纯计算/纯文案（含 AI Prompt 构建），**不含** `localStorage`/`fetch` 等环境依赖——AI 网络调用（`aiConfig`/`callAI`，含 60s 超时）位于原型 UI 层，对应 `src/utils/ai.js`。
3. **安全红线**：所有动态 HTML 插入点（历史记录、报告、海报）的用户输入与 AI 输出必须经过 `esc()` 转义，新增渲染逻辑时不可绕过。
4. **合规红线**：引擎内的禁词过滤与免责声明不可移除，商店上架文案使用「关于」弹窗中的定位描述。
