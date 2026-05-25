# REDI Analytics

## Cloudflare Web Analytics

Cloudflare Web Analytics 用于查看站点层面的基础访问数据，适合活动期间快速判断整体流量健康度：

- PV：页面浏览量。
- UV / Visitors：独立访客规模。
- Referrers：访问来源网站。
- Countries / Regions：粗粒度地域分布。
- Devices / Browsers：设备、浏览器与系统分布。
- Page paths：不同页面路径的访问情况。

如果 Cloudflare 后台已经启用自动注入，不需要在代码里重复添加 snippet。若未启用，可将 Cloudflare 官方 snippet 放到 `index.html` 的 `</head>` 前预留位置。

## GA4 配置

GA4 用于记录测试内部关键事件与结果数据。前端只通过统一方法发送：

```ts
trackEvent(eventName, payload)
```

Measurement ID 通过环境变量配置：

```bash
VITE_GA4_MEASUREMENT_ID=G-33E5B0G9BW
```

构建环境也兼容 `GA4_MEASUREMENT_ID`，但 Vite 客户端推荐使用 `VITE_GA4_MEASUREMENT_ID`。如果没有配置 Measurement ID：

- 开发环境：只在 console 输出事件，便于调试。
- 线上环境：静默跳过，不影响页面。

所有 GA4 事件均异步发送；脚本加载失败或事件发送失败不会影响页面加载、答题、结果生成、保存长图或复制分享。

## GA4 Events

### `page_view`

页面访问时触发。

字段：

- `utm_source`
- `utm_medium`
- `utm_campaign`
- `page_path`

### `click_start`

用户点击“开始测试”时触发，同时记录本地开始时间，用于完成测试后计算总时长。

字段：

- `utm_source`
- `utm_medium`
- `utm_campaign`
- `page_path`

### `result_generated`

用户成功生成结果时触发。

字段：

- `personality_result`：人格结果 ID 或图片 key。
- `personality_result_cn`：中文人格名。
- `personality_result_en`：英文人格名。
- `tips_result`：锦囊 ID；Q0 特殊结果为空。
- `badge_result`：逗号分隔的勋章 ID；无勋章为空。
- `is_hidden_result`：是否为 Q0 特殊结果。
- `test_duration_seconds`：从点击开始到生成结果的秒数。
- `utm_source`
- `utm_medium`
- `utm_campaign`

### `click_save_image`

用户点击保存长图按钮时触发。只记录点击，不上传长图、不监听真实截屏。

字段：

- `personality_result`
- `source`
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `page_path`

### `click_share`

用户点击分享/复制链接按钮时触发。

字段：

- `source`
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `page_path`

### `copy_link`

用户点击复制链接按钮时触发。

字段：

- `source`
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `page_path`

## 后续指标计算

- PV：Cloudflare Web Analytics 的 Page views，或 GA4 的 `page_view` 事件数。
- UV：Cloudflare Web Analytics Visitors，或 GA4 Users。
- 完成率：`result_generated` 用户数 / `click_start` 用户数。
- 退出率：`1 - result_generated 用户数 / click_start 用户数`。
- 人格结果占比：按 `result_generated.personality_result` 分组，计算各组事件数 / 总 `result_generated` 事件数。
- 锦囊占比：按 `result_generated.tips_result` 分组，排除空值后计算占比。
- 勋章占比：拆分 `result_generated.badge_result` 中的逗号分隔 ID，统计各勋章出现次数和占比。
- 保存率：`click_save_image` 用户数 / `result_generated` 用户数。
- 分享率：`click_share` 用户数 / `result_generated` 用户数。
- 复制链接率：`copy_link` 用户数 / `result_generated` 用户数。
- 做题时长分布：使用 `result_generated.test_duration_seconds`，按区间分组，例如 `0-30s`、`31-60s`、`61-120s`、`120s+`。

## 飞书多维表格复盘

活动后可从 GA4 导出事件数据，再导入飞书多维表格：

1. 在 GA4 Explore 或 Reports 中筛选活动日期范围。
2. 导出事件数据，至少包含 `event_name`、`event_date`、`event_timestamp`、`user_pseudo_id` 和上述自定义字段。
3. 导出为 CSV。
4. 在飞书多维表格中新建数据表并导入 CSV。
5. 建议建立以下视图：
   - 总览：PV、UV、开始人数、完成人数、完成率、退出率。
   - 结果分布：人格、锦囊、勋章的绝对值和占比。
   - 渠道效果：按 `utm_source / utm_medium / utm_campaign` 对比完成率、保存率、分享率。
   - 时长分析：按 `test_duration_seconds` 做区间分布。
   - 行为漏斗：`page_view → click_start → result_generated → click_save_image / click_share`。

## 数据边界

当前统计不收集：

- 姓名。
- 手机号。
- 微信号。
- 小红书账号。
- 精确定位。
- 用户生成的长图。
- 真实截屏行为。
- 逐题曝光或逐题退出数据。
