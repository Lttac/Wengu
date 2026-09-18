/**
 * 語系。三個語系、扁平 key、缺字自動回退到繁體中文。
 * 分類（語文/數學/…）是資料本身的值，不隨語系改變，只換顯示文字。
 */

export const LOCALES = [
  { id: "zh-Hant", label: "繁體中文" },
  { id: "zh-Hans", label: "简体中文" },
  { id: "en", label: "English" },
];

export const FALLBACK_LOCALE = "zh-Hant";

export const CATEGORY_IDS = ["語文", "數學", "英語", "物理", "化學", "地理"];

const CATEGORY_LABELS = {
  "zh-Hant": { 語文: "語文", 數學: "數學", 英語: "英語", 物理: "物理", 化學: "化學", 地理: "地理" },
  "zh-Hans": { 語文: "语文", 數學: "数学", 英語: "英语", 物理: "物理", 化學: "化学", 地理: "地理" },
  en: { 語文: "Chinese", 數學: "Math", 英語: "English", 物理: "Physics", 化學: "Chemistry", 地理: "Geography" },
};

const DICT = {
  "zh-Hant": {
    "app.title": "溫故",
    "app.tagline": "溫故而知新",
    "app.settings": "設定",
    "app.theme": "切換外觀",

    "compose.question": "輸入問題（正面）",
    "compose.answer": "輸入答案（背面）",
    "compose.category": "分類",
    "compose.add": "新增卡片",
    "compose.needQuestion": "請先輸入問題",

    "today.title": "今日必須複習",
    "today.count": "共 {n} 條任務",
    "today.progress": "今日已完成 {done} / {total}",
    "today.done": "今天已全部完成",
    "today.reveal": "顯示答案",
    "today.hide": "隱藏答案",
    "today.meta": "間隔 {interval} 天 · 難度 {ease}",
    "today.metaNew": "新卡 · 難度 {ease}",
    "today.empty": "還沒有卡片，先在上面新增一張",

    "rating.again": "不會",
    "rating.hard": "困難",
    "rating.good": "一般",
    "rating.easy": "簡單",

    "manage.title": "已新增卡片管理",
    "manage.search": "關鍵字搜尋",
    "manage.filter.all": "全部分類",
    "manage.sort.added": "按新增時間",
    "manage.sort.nextReview": "按下次複習時間",
    "manage.save": "儲存修改",
    "manage.delete": "刪除",
    "manage.stats": "分類統計：{stats}",
    "manage.empty": "沒有符合條件的卡片",
    "manage.dragHint": "拖曳卡片可調整順序",

    "settings.title": "設定",
    "settings.done": "完成",
    "settings.close": "關閉",
    "settings.section.appearance": "外觀",
    "settings.appearance.system": "跟隨系統",
    "settings.appearance.light": "淺色",
    "settings.appearance.dark": "深色",
    "settings.section.language": "語言",
    "settings.language.auto": "跟隨系統",
    "settings.section.review": "複習",
    "settings.review.showMeta": "顯示間隔與難度",
    "settings.review.showMeta.hint": "在卡片右下角顯示「間隔 N 天 · 難度 x.xx」。",
    "settings.review.shuffle": "打亂今日順序",
    "settings.review.shuffle.hint": "每次進入頁面時重新洗牌，避免固定順序造成的記憶假象。",
    "settings.review.shortcuts": "鍵盤快捷鍵",
    "settings.review.shortcuts.hint": "空白鍵顯示答案，1–4 為四個評分。",
    "settings.section.ai": "AI 輔助",
    "settings.ai.enabled": "啟用 AI 輔助",
    "settings.ai.enabled.hint": "開啟後可從筆記生成卡片，並為個別卡片產生解釋。",
    "settings.ai.needsKey": "還沒填 API 金鑰，AI 功能暫時不會生效。",
    "settings.ai.preset": "服務預設",
    "settings.ai.baseUrl": "API 位址",
    "settings.ai.model": "模型",
    "settings.ai.apiKey": "API 金鑰",
    "settings.ai.apiKey.hint": "金鑰只存在你的瀏覽器，不會隨匯出檔帶走。",
    "settings.ai.keyStorage": "金鑰儲存方式",
    "settings.ai.keyStorage.local": "永久儲存",
    "settings.ai.keyStorage.session": "僅本次瀏覽",
    "settings.ai.keyStorage.memory": "不儲存",
    "settings.ai.keyStorage.hint": "在公用電腦上請選「不儲存」。",
    "settings.ai.test": "測試連線",
    "settings.ai.testing": "測試中…",
    "settings.ai.testOk": "連線成功（{ms} ms）",
    "settings.ai.testFail": "連線失敗：{reason}",
    "settings.ai.corsHint": "若一直失敗，多半是該服務不允許瀏覽器直連（CORS）。可改用允許跨來源的端點，或自架一個代理。",
    "settings.section.data": "資料",
    "settings.section.subjects": "科目",
    "settings.subjects.hint": "自訂科目會出現在分類選單裡。還有卡片在用的科目不能刪除。",
    "settings.subjects.placeholder": "新科目名稱",
    "settings.subjects.add": "新增科目",
    "settings.subjects.builtin": "內建",
    "settings.subjects.remove": "刪除",
    "settings.subjects.inUse": "還有 {n} 張卡片在用，先改掉再刪。",
    "settings.subjects.duplicate": "已經有同名科目。",
    "settings.subjects.tooLong": "名稱上限 {n} 個字。",
    "settings.subjects.empty": "請先輸入名稱。",
    "settings.subjects.added": "已新增科目「{name}」",
    "settings.subjects.removed": "已刪除科目「{name}」",
    "settings.data.summary": "目前 {n} 張卡片",
    "settings.data.export": "匯出 JSON",
    "settings.data.import": "匯入 JSON",
    "settings.data.importHint": "匯入採合併模式：id 重複的卡片會被略過。",
    "settings.data.reset": "清除全部資料",
    "settings.data.resetConfirm": "確定要清除所有卡片與設定嗎？此動作無法復原。",
    "settings.section.about": "關於",
    "settings.about.version": "版本",
    "settings.about.privacy": "卡片與設定只存在這台裝置的瀏覽器裡。啟用 AI 時，你送出的內容會傳給你設定的 API 服務，其餘一律不離開本機。",
    "settings.about.design": "介面依 DESIGN.md 的液態玻璃規範實作。",

    "ai.title": "AI 輔助",
    "ai.generate": "AI 生成卡片",
    "ai.generate.title": "用 AI 生成卡片",
    "ai.generate.hint": "貼上筆記、課文或題目，AI 會整理成問答卡片。內容會傳送到你設定的 API 服務。",
    "ai.generate.placeholder": "貼上要整理成卡片的內容…",
    "ai.generate.count": "生成數量",
    "ai.generate.countHint": "一次少一點。卡片少而準，比多而雜記得住。",
    "ai.generate.run": "開始生成",
    "ai.generating": "生成中…",
    "ai.generate.preview": "生成 {n} 張，勾選要加入的：",
    "ai.generate.add": "加入選取的 {n} 張",
    "ai.generate.none": "沒有可加入的卡片",
    "ai.regenerate": "重新生成",
    "ai.explain": "AI 解釋",
    "ai.explain.title": "AI 解釋",
    "ai.explain.loading": "正在產生解釋…",
    "ai.explain.failed": "產生失敗",
    "ai.disabled": "尚未啟用 AI 輔助",
    "ai.noKey": "請先到設定填入 API 金鑰",
    "ai.openSettings": "前往設定",
    "ai.cancel": "取消",
    "ai.error.network": "連線失敗，請檢查 API 位址與網路",
    "ai.error.status": "服務回應 {status}",
    "ai.error.parse": "無法解析模型回應",
    "ai.error.noKey": "未設定 API 金鑰",
    "ai.error.needText": "請先貼上內容",
    "ai.error.auth": "金鑰無效或權限不足（401／403）——檢查 API 金鑰是否貼對、有沒有過期",
    "ai.error.notFound": "找不到模型或端點（404）——檢查模型名稱與 API 位址",
    "ai.error.rateLimit": "請求太頻繁或額度用盡（429）——稍後再試或換一把金鑰",
    "ai.error.server": "服務端錯誤（5xx）——不是你的問題，稍後再試",
    "ai.error.unknown": "發生未知錯誤",
    "ai.error.aborted": "已取消",
    "ai.stop": "停止",
    "ai.generatingCount": "已生成 {n} 張…",
    "ai.stopped": "已停止",
    "ai.stoppedWith": "已停止，保留 {n} 張",

    "toast.deleted": "已刪除「{name}」",
    "toast.undo": "撤銷",
    "toast.added": "已新增 {n} 張卡片",
    "toast.imported": "已匯入 {n} 張卡片",
    "toast.importFailed": "匯入失敗：{reason}",
    "toast.exported": "已匯出 {n} 張卡片",
    "toast.reset": "已清除全部資料",
    "toast.rated": "已記錄：{label}",
  },

  "zh-Hans": {
    "app.title": "温故",
    "app.tagline": "温故而知新",
    "app.settings": "设置",
    "app.theme": "切换外观",

    "compose.question": "输入问题（正面）",
    "compose.answer": "输入答案（背面）",
    "compose.category": "分类",
    "compose.add": "添加卡片",
    "compose.needQuestion": "请先输入问题",

    "today.title": "今日必须复习",
    "today.count": "共 {n} 条任务",
    "today.progress": "今日已完成 {done} / {total}",
    "today.done": "今天已全部完成",
    "today.reveal": "显示答案",
    "today.hide": "隐藏答案",
    "today.meta": "间隔 {interval} 天 · 难度 {ease}",
    "today.metaNew": "新卡 · 难度 {ease}",
    "today.empty": "还没有卡片，先在上面添加一张",

    "rating.again": "不会",
    "rating.hard": "困难",
    "rating.good": "一般",
    "rating.easy": "简单",

    "manage.title": "已添加卡片管理",
    "manage.search": "关键字搜索",
    "manage.filter.all": "全部分类",
    "manage.sort.added": "按添加时间",
    "manage.sort.nextReview": "按下次复习时间",
    "manage.save": "保存修改",
    "manage.delete": "删除",
    "manage.stats": "分类统计：{stats}",
    "manage.empty": "没有符合条件的卡片",
    "manage.dragHint": "拖拽卡片可调整顺序",

    "settings.title": "设置",
    "settings.done": "完成",
    "settings.close": "关闭",
    "settings.section.appearance": "外观",
    "settings.appearance.system": "跟随系统",
    "settings.appearance.light": "浅色",
    "settings.appearance.dark": "深色",
    "settings.section.language": "语言",
    "settings.language.auto": "跟随系统",
    "settings.section.review": "复习",
    "settings.review.showMeta": "显示间隔与难度",
    "settings.review.showMeta.hint": "在卡片右下角显示「间隔 N 天 · 难度 x.xx」。",
    "settings.review.shuffle": "打乱今日顺序",
    "settings.review.shuffle.hint": "每次进入页面时重新洗牌，避免固定顺序造成的记忆假象。",
    "settings.review.shortcuts": "键盘快捷键",
    "settings.review.shortcuts.hint": "空格键显示答案，1–4 为四个评分。",
    "settings.section.ai": "AI 辅助",
    "settings.ai.enabled": "启用 AI 辅助",
    "settings.ai.enabled.hint": "开启后可从笔记生成卡片，并为单张卡片生成解释。",
    "settings.ai.needsKey": "还没填 API 密钥，AI 功能暂时不会生效。",
    "settings.ai.preset": "服务预设",
    "settings.ai.baseUrl": "API 地址",
    "settings.ai.model": "模型",
    "settings.ai.apiKey": "API 密钥",
    "settings.ai.apiKey.hint": "密钥只存在你的浏览器，不会随导出文件带走。",
    "settings.ai.keyStorage": "密钥存储方式",
    "settings.ai.keyStorage.local": "永久保存",
    "settings.ai.keyStorage.session": "仅本次浏览",
    "settings.ai.keyStorage.memory": "不保存",
    "settings.ai.keyStorage.hint": "在公用电脑上请选「不保存」。",
    "settings.ai.test": "测试连接",
    "settings.ai.testing": "测试中…",
    "settings.ai.testOk": "连接成功（{ms} ms）",
    "settings.ai.testFail": "连接失败：{reason}",
    "settings.ai.corsHint": "若一直失败，多半是该服务不允许浏览器直连（CORS）。可改用允许跨域的端点，或自建一个代理。",
    "settings.section.data": "数据",
    "settings.section.subjects": "科目",
    "settings.subjects.hint": "自定义科目会出现在分类菜单里。还有卡片在用的科目不能删除。",
    "settings.subjects.placeholder": "新科目名称",
    "settings.subjects.add": "添加科目",
    "settings.subjects.builtin": "内置",
    "settings.subjects.remove": "删除",
    "settings.subjects.inUse": "还有 {n} 张卡片在用，先改掉再删。",
    "settings.subjects.duplicate": "已有同名科目。",
    "settings.subjects.tooLong": "名称上限 {n} 个字。",
    "settings.subjects.empty": "请先输入名称。",
    "settings.subjects.added": "已添加科目「{name}」",
    "settings.subjects.removed": "已删除科目「{name}」",
    "settings.data.summary": "目前 {n} 张卡片",
    "settings.data.export": "导出 JSON",
    "settings.data.import": "导入 JSON",
    "settings.data.importHint": "导入为合并模式：id 重复的卡片会被跳过。",
    "settings.data.reset": "清除全部数据",
    "settings.data.resetConfirm": "确定要清除所有卡片与设置吗？此操作无法撤销。",
    "settings.section.about": "关于",
    "settings.about.version": "版本",
    "settings.about.privacy": "卡片与设置只存在这台设备的浏览器里。启用 AI 时，你送出的内容会传给你设置的 API 服务，其余一律不离开本机。",
    "settings.about.design": "界面依 DESIGN.md 的液态玻璃规范实现。",

    "ai.title": "AI 辅助",
    "ai.generate": "AI 生成卡片",
    "ai.generate.title": "用 AI 生成卡片",
    "ai.generate.hint": "粘贴笔记、课文或题目，AI 会整理成问答卡片。内容会发送到你设置的 API 服务。",
    "ai.generate.placeholder": "粘贴要整理成卡片的内容…",
    "ai.generate.count": "生成数量",
    "ai.generate.countHint": "一次少一点。卡片少而准，比多而杂记得住。",
    "ai.generate.run": "开始生成",
    "ai.generating": "生成中…",
    "ai.generate.preview": "生成 {n} 张，勾选要加入的：",
    "ai.generate.add": "加入选中的 {n} 张",
    "ai.generate.none": "没有可加入的卡片",
    "ai.regenerate": "重新生成",
    "ai.explain": "AI 解释",
    "ai.explain.title": "AI 解释",
    "ai.explain.loading": "正在生成解释…",
    "ai.explain.failed": "生成失败",
    "ai.disabled": "尚未启用 AI 辅助",
    "ai.noKey": "请先到设置填入 API 密钥",
    "ai.openSettings": "前往设置",
    "ai.cancel": "取消",
    "ai.error.network": "连接失败，请检查 API 地址与网络",
    "ai.error.status": "服务返回 {status}",
    "ai.error.parse": "无法解析模型返回",
    "ai.error.noKey": "未设置 API 密钥",
    "ai.error.needText": "请先粘贴内容",
    "ai.error.auth": "密钥无效或权限不足（401／403）——检查 API 密钥是否贴对、有没有过期",
    "ai.error.notFound": "找不到模型或端点（404）——检查模型名称与 API 地址",
    "ai.error.rateLimit": "请求太频繁或额度用尽（429）——稍后再试或换一把密钥",
    "ai.error.server": "服务端错误（5xx）——不是你的问题，稍后再试",
    "ai.error.unknown": "发生未知错误",
    "ai.error.aborted": "已取消",
    "ai.stop": "停止",
    "ai.generatingCount": "已生成 {n} 张…",
    "ai.stopped": "已停止",
    "ai.stoppedWith": "已停止，保留 {n} 张",

    "toast.deleted": "已删除「{name}」",
    "toast.undo": "撤销",
    "toast.added": "已添加 {n} 张卡片",
    "toast.imported": "已导入 {n} 张卡片",
    "toast.importFailed": "导入失败：{reason}",
    "toast.exported": "已导出 {n} 张卡片",
    "toast.reset": "已清除全部数据",
    "toast.rated": "已记录：{label}",
  },

  en: {
    "app.title": "Wengu",
    "app.tagline": "Review, quietly",
    "app.settings": "Settings",
    "app.theme": "Toggle appearance",

    "compose.question": "Question (front)",
    "compose.answer": "Answer (back)",
    "compose.category": "Category",
    "compose.add": "Add card",
    "compose.needQuestion": "Enter a question first",

    "today.title": "Due today",
    "today.count": "{n} due",
    "today.progress": "{done} of {total} done today",
    "today.done": "All done for today",
    "today.reveal": "Show answer",
    "today.hide": "Hide answer",
    "today.meta": "{interval}-day interval · ease {ease}",
    "today.metaNew": "new · ease {ease}",
    "today.empty": "No cards yet — add one above",

    "rating.again": "Again",
    "rating.hard": "Hard",
    "rating.good": "Good",
    "rating.easy": "Easy",

    "manage.title": "Manage cards",
    "manage.search": "Search",
    "manage.filter.all": "All categories",
    "manage.sort.added": "Recently added",
    "manage.sort.nextReview": "Next review",
    "manage.save": "Save",
    "manage.delete": "Delete",
    "manage.stats": "By category — {stats}",
    "manage.empty": "No cards match",
    "manage.dragHint": "Drag to reorder",

    "settings.title": "Settings",
    "settings.done": "Done",
    "settings.close": "Close",
    "settings.section.appearance": "Appearance",
    "settings.appearance.system": "System",
    "settings.appearance.light": "Light",
    "settings.appearance.dark": "Dark",
    "settings.section.language": "Language",
    "settings.language.auto": "Automatic",
    "settings.section.review": "Review",
    "settings.review.showMeta": "Show interval and ease",
    "settings.review.showMeta.hint": "Display “every Nd · ease x.xx” on each card.",
    "settings.review.shuffle": "Shuffle due cards",
    "settings.review.shuffle.hint": "Reshuffle on every visit so a fixed order never fakes familiarity.",
    "settings.review.shortcuts": "Keyboard shortcuts",
    "settings.review.shortcuts.hint": "Space reveals the answer, 1–4 rate it.",
    "settings.section.ai": "AI assistance",
    "settings.ai.enabled": "Enable AI assistance",
    "settings.ai.enabled.hint": "Generate cards from notes and explain individual cards.",
    "settings.ai.needsKey": "No API key yet — AI features will not work until you add one.",
    "settings.ai.preset": "Provider preset",
    "settings.ai.baseUrl": "API base URL",
    "settings.ai.model": "Model",
    "settings.ai.apiKey": "API key",
    "settings.ai.apiKey.hint": "The key stays in this browser and is never included in exports.",
    "settings.ai.keyStorage": "Key storage",
    "settings.ai.keyStorage.local": "Persist",
    "settings.ai.keyStorage.session": "This session",
    "settings.ai.keyStorage.memory": "Do not store",
    "settings.ai.keyStorage.hint": "Choose “Do not store” on shared computers.",
    "settings.ai.test": "Test connection",
    "settings.ai.testing": "Testing…",
    "settings.ai.testOk": "Connected ({ms} ms)",
    "settings.ai.testFail": "Failed: {reason}",
    "settings.ai.corsHint": "Repeated failures usually mean the provider blocks direct browser calls (CORS). Try an endpoint that allows cross-origin requests, or run your own proxy.",
    "settings.section.data": "Data",
    "settings.section.subjects": "Subjects",
    "settings.subjects.hint": "Custom subjects appear in the category picker. A subject still used by cards cannot be removed.",
    "settings.subjects.placeholder": "New subject name",
    "settings.subjects.add": "Add subject",
    "settings.subjects.builtin": "Built-in",
    "settings.subjects.remove": "Remove",
    "settings.subjects.inUse": "{n} cards still use it — reassign them first.",
    "settings.subjects.duplicate": "That subject already exists.",
    "settings.subjects.tooLong": "Names are limited to {n} characters.",
    "settings.subjects.empty": "Enter a name first.",
    "settings.subjects.added": "Added “{name}”",
    "settings.subjects.removed": "Removed “{name}”",
    "settings.data.summary": "{n} cards stored",
    "settings.data.export": "Export JSON",
    "settings.data.import": "Import JSON",
    "settings.data.importHint": "Import merges: cards with an existing id are skipped.",
    "settings.data.reset": "Erase everything",
    "settings.data.resetConfirm": "Erase all cards and settings? This cannot be undone.",
    "settings.section.about": "About",
    "settings.about.version": "Version",
    "settings.about.privacy": "Cards and settings live only in this browser. When AI is enabled, the content you submit is sent to the API service you configured; nothing else leaves the device.",
    "settings.about.design": "The interface follows the Liquid Glass spec in DESIGN.md.",

    "ai.title": "AI assistance",
    "ai.generate": "Generate cards",
    "ai.generate.title": "Generate cards with AI",
    "ai.generate.hint": "Paste notes, a passage, or a problem set — the model turns it into question/answer cards. The text is sent to your configured API service.",
    "ai.generate.placeholder": "Paste the material to turn into cards…",
    "ai.generate.count": "How many",
    "ai.generate.countHint": "Fewer is better — a small set you actually review beats a big one you skip.",
    "ai.generate.run": "Generate",
    "ai.generating": "Generating…",
    "ai.generate.preview": "{n} generated — pick the ones to keep:",
    "ai.generate.add": "Add {n} selected",
    "ai.generate.none": "Nothing to add",
    "ai.regenerate": "Regenerate",
    "ai.explain": "Explain",
    "ai.explain.title": "AI explanation",
    "ai.explain.loading": "Writing an explanation…",
    "ai.explain.failed": "Could not generate",
    "ai.disabled": "AI assistance is off",
    "ai.noKey": "Add an API key in settings first",
    "ai.openSettings": "Open settings",
    "ai.cancel": "Cancel",
    "ai.error.network": "Request failed — check the API base URL and your network",
    "ai.error.status": "Service returned {status}",
    "ai.error.parse": "Could not parse the model response",
    "ai.error.noKey": "No API key set",
    "ai.error.needText": "Paste some text first",
    "ai.error.auth": "Invalid or unauthorized key (401/403) — check the API key",
    "ai.error.notFound": "Model or endpoint not found (404) — check the model name and base URL",
    "ai.error.rateLimit": "Rate limited or out of quota (429) — retry later",
    "ai.error.server": "Server error (5xx) — not your fault, try again later",
    "ai.error.unknown": "Unknown error",
    "ai.error.aborted": "Cancelled",
    "ai.stop": "Stop",
    "ai.generatingCount": "{n} cards so far…",
    "ai.stopped": "Stopped",
    "ai.stoppedWith": "Stopped — kept {n}",

    "toast.deleted": "Deleted “{name}”",
    "toast.undo": "Undo",
    "toast.added": "Added {n} cards",
    "toast.imported": "Imported {n} cards",
    "toast.importFailed": "Import failed: {reason}",
    "toast.exported": "Exported {n} cards",
    "toast.reset": "Everything erased",
    "toast.rated": "Saved: {label}",
  },
};

let current = FALLBACK_LOCALE;

/** "auto" 或未知值 → 依瀏覽器語言挑一個；zh 系再分簡繁 */
export function resolveLocale(setting, languages) {
  if (setting && setting !== "auto" && DICT[setting]) return setting;
  const list = languages || (globalThis.navigator?.languages?.length
    ? globalThis.navigator.languages
    : [globalThis.navigator?.language || ""]);
  for (const raw of list) {
    if (!raw) continue;
    const lang = String(raw).toLowerCase();
    if (lang.startsWith("zh")) {
      return /hant|tw|hk|mo/.test(lang) ? "zh-Hant" : "zh-Hans";
    }
    if (lang.startsWith("en")) return "en";
  }
  return FALLBACK_LOCALE;
}

export function setLocale(id) {
  current = DICT[id] ? id : FALLBACK_LOCALE;
  return current;
}

export function getLocale() {
  return current;
}

export function t(key, vars) {
  const raw = DICT[current]?.[key] ?? DICT[FALLBACK_LOCALE]?.[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match);
}

export function categoryLabel(id) {
  return CATEGORY_LABELS[current]?.[id] ?? CATEGORY_LABELS[FALLBACK_LOCALE]?.[id] ?? id;
}

/**
 * 把靜態 DOM 的文字換成目前語系。
 * data-i18n → textContent，data-i18n-placeholder / -aria-label / -title → 對應屬性。
 */
export function applyStatic(root = globalThis.document, locale = current) {
  if (!root?.querySelectorAll) return;
  if (root.documentElement) root.documentElement.lang = locale;
  for (const el of root.querySelectorAll("[data-i18n]")) {
    el.textContent = t(el.getAttribute("data-i18n"));
  }
  for (const [attr, target] of [
    ["data-i18n-placeholder", "placeholder"],
    ["data-i18n-aria-label", "aria-label"],
    ["data-i18n-title", "title"],
  ]) {
    for (const el of root.querySelectorAll(`[${attr}]`)) {
      el.setAttribute(target, t(el.getAttribute(attr)));
    }
  }
}

export function hasKey(key) {
  return Boolean(DICT[current]?.[key] ?? DICT[FALLBACK_LOCALE]?.[key]);
}

/** 所有語系出現過的 key（聯集），用來檢查翻譯有沒有漏 */
export function allKeys() {
  return [...new Set(Object.values(DICT).flatMap((dict) => Object.keys(dict)))].sort();
}

/** 某個語系缺少的 key。回傳空陣列才代表這個語系是完整的。 */
export function missingKeys(locale = current) {
  const dict = DICT[locale] || {};
  return allKeys().filter((key) => !(key in dict));
}
