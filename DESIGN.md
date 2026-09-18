---
version: alpha
name: LiquidGlass-Inspired-design-analysis
description: An inspired interpretation of Apple's Liquid Glass design language (iOS 26) applied to a web flashcard app. Translucent glass layers that lens the wallpaper beneath them, specular light along every top edge, concentric squircles, and a single system-blue accent reserved for the primary action.
colors:
  accent: "#007aff"
  accent-dark: "#0a84ff"
  accent-deep: "#0060df"
  accent-soft: "rgba(0,122,255,0.15)"
  on-accent: "#ffffff"
  ink: "#1c1c1e"
  ink-dark: "#f2f2f7"
  body: "#3a3a3c"
  body-dark: "#ebebf0"
  mute: "#6b6f78"
  mute-dark: "#98989d"
  canvas: "#eef1f6"
  canvas-dark: "#05070d"
  success: "#34c759"
  success-dark: "#30d158"
  success-text: "#1f7a34"
  success-text-dark: "#30d158"
  success-soft: "rgba(52,199,89,0.16)"
  warning: "#ff9500"
  warning-dark: "#ff9f0a"
  warning-text: "#8f5600"
  warning-text-dark: "#ff9f0a"
  warning-soft: "rgba(255,149,0,0.16)"
  danger: "#ff3b30"
  danger-dark: "#ff453a"
  danger-text: "#c0271c"
  danger-text-dark: "#ff7069"
  danger-soft: "rgba(255,59,48,0.16)"
  neutral-soft: "rgba(120,120,128,0.16)"
  glass-fill: "rgba(255,255,255,0.66)"
  glass-fill-strong: "rgba(255,255,255,0.82)"
  glass-fill-solid: "#ffffff"
  glass-fill-dark: "rgba(38,40,48,0.55)"
  glass-fill-solid-dark: "#2f3139"
  glass-rim: "rgba(255,255,255,0.75)"
  glass-rim-dark: "rgba(255,255,255,0.16)"
  glass-sheen: "rgba(255,255,255,0.30)"
  glass-sheen-dark: "rgba(255,255,255,0.06)"
  glass-specular: "rgba(255,255,255,0.85)"
  glass-specular-dark: "rgba(255,255,255,0.14)"
  field-fill: "rgba(120,120,128,0.12)"
  field-fill-dark: "rgba(120,120,128,0.24)"
  hairline: "rgba(60,60,67,0.16)"
  hairline-dark: "rgba(255,255,255,0.14)"
  focus-ring: "rgba(0,122,255,0.25)"
  wallpaper-1: "#c6dcf8"
  wallpaper-2: "#dcd0f6"
  wallpaper-3: "#f8dcc4"
  wallpaper-4: "#c6e8f6"
  wallpaper-1-dark: "#101a33"
  wallpaper-2-dark: "#221a3d"
  wallpaper-3-dark: "#0d2f36"
  wallpaper-4-dark: "#1a1030"
typography:
  display-large-title: {fontFamily: "SF Pro Display", fontSize: "34px", fontWeight: 700, lineHeight: "41px", letterSpacing: "-0.4px"}
  heading-card: {fontFamily: "SF Pro Text", fontSize: "17px", fontWeight: 600, lineHeight: "22px", letterSpacing: "-0.2px"}
  body-md: {fontFamily: "SF Pro Text", fontSize: "17px", fontWeight: 400, lineHeight: "22px", letterSpacing: "0px"}
  body-sm: {fontFamily: "SF Pro Text", fontSize: "15px", fontWeight: 400, lineHeight: "20px", letterSpacing: "0px"}
  button: {fontFamily: "SF Pro Text", fontSize: "15px", fontWeight: 600, lineHeight: "20px", letterSpacing: "-0.1px"}
  field: {fontFamily: "SF Pro Text", fontSize: "16px", fontWeight: 400, lineHeight: "22px", letterSpacing: "0px"}
  caption: {fontFamily: "SF Pro Text", fontSize: "13px", fontWeight: 400, lineHeight: "18px", letterSpacing: "0px"}
  caption-strong: {fontFamily: "SF Pro Text", fontSize: "12px", fontWeight: 600, lineHeight: "16px", letterSpacing: "0.1px"}
rounded:
  none: "0px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "22px"
  xl: "28px"
  capsule: "9999px"
spacing:
  xxs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
  xxl: "32px"
  section: "40px"
components:
  glass-card:
    backgroundColor: "{colors.glass-fill}"
    rounded: "{rounded.xl}"
    padding: "{spacing.md}"
    backdropFilter: "blur(24px) saturate(180%)"
    border: "1px solid {colors.glass-rim}"
    boxShadow: "inset 0 1px 0 {colors.glass-specular}, 0 10px 30px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)"
  glass-chrome:
    backgroundColor: "{colors.glass-fill-strong}"
    rounded: "{rounded.capsule}"
    backdropFilter: "blur(18px) saturate(180%)"
    border: "1px solid {colors.glass-rim}"
    minHeight: "44px"
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.button}"
    rounded: "{rounded.capsule}"
    padding: "0px {spacing.lg}"
    minHeight: "44px"
  button-tint:
    backgroundColor: "{colors.neutral-soft}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.capsule}"
    padding: "0px {spacing.md}"
    minHeight: "44px"
  field-inset:
    backgroundColor: "{colors.field-fill}"
    textColor: "{colors.ink}"
    typography: "{typography.field}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm} {spacing.md}"
    minHeight: "44px"
  select-menu:
    backgroundColor: "{colors.glass-fill-strong}"
    rounded: "{rounded.md}"
    backdropFilter: "blur(24px) saturate(180%)"
    boxShadow: "inset 0 1px 0 {colors.glass-specular}, 0 10px 30px rgba(0,0,0,0.10)"
    optionMinHeight: "40px"
  chip-category:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-deep}"
    typography: "{typography.caption-strong}"
    rounded: "{rounded.capsule}"
    padding: "2px {spacing.xs}"
  progress-track:
    backgroundColor: "{colors.field-fill}"
    rounded: "{rounded.capsule}"
    height: "6px"
  task-card:
    backgroundColor: "{colors.glass-fill}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
  row-card:
    backgroundColor: "{colors.glass-fill}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
    cursor: "grab"
  wallpaper:
    backgroundColor: "{colors.canvas}"
    blurRadius: "70px"
    blobOpacity: "0.75"
  specular-follow:
    backgroundImage: "radial-gradient(220px circle at {--mx} {--my}, rgba(255,255,255,0.34), transparent 68%)"
    opacity: "0 → 1"
    duration: "220ms"
  rating-flash:
    backgroundColor: "{colors.success-soft}"
    rounded: "{rounded.lg}"
    keyframes: "0% opacity 0 / 35% opacity 1 / 100% opacity 0"
    duration: "320ms"
  cursor-lens:
    fill: "#ffffff"
    radius: "22px"
    blendMode: "difference"
    followEasing: "0.7 within 50px, else 0.42"
    separation: "alpha and scale approach at 0.24 per frame"
  sheet:
    backgroundColor: "{colors.glass-fill-strong}"
    rounded: "{rounded.xl}"
    backdropFilter: "blur(24px) saturate(180%)"
    boxShadow: "inset 0 1px 0 {colors.glass-sheen}, 0 20px 50px rgba(0,0,0,0.16)"
  segmented:
    backgroundColor: "{colors.field-fill}"
    rounded: "{rounded.capsule}"
    selectedBackgroundColor: "{colors.glass-fill-strong}"
    padding: "2px"
  switch:
    width: "51px"
    height: "31px"
    rounded: "{rounded.capsule}"
    onBackgroundColor: "{colors.success}"
    knobColor: "#ffffff"
  toast:
    backgroundColor: "{colors.glass-fill-strong}"
    rounded: "{rounded.capsule}"
    padding: "{spacing.xs} {spacing.xs} {spacing.xs} {spacing.md}"
---

# 溫故 —— iOS 26 液態玻璃

## Overview

這是一個給自己用的複習工具，不是給訪客看的行銷頁：使用者打開它只有一個目的——把今天到期的卡片清掉。所以整個介面按 iOS 的兩層模型組織：**壁紙提供色彩，玻璃提供操作**。每一塊玻璃都真的在折射它背後的東西——卡片浮在漸層壁紙上，模糊半透明的同時把壁紙的顏色吸進來一點；每一塊玻璃的上緣都有一道高光，像真玻璃被光打到的邊。

密度偏「桌面工具」而非「美術館」：卡片之間 20px 而非大留白，因為使用者在這裡是連續操作，不是瀏覽。動效只做四件事——**進場、離場、跟隨、揭示**，全部走減速曲線，沒有彈跳也沒有回彈。

### Key Characteristics

- **兩層結構**：壁紙（content layer）永遠在玻璃之下，玻璃永遠在內容之上，兩者不可互換。
- **每塊玻璃都有邊**：一道 1px 暖白描邊 + 一道 inset 上緣高光，這是「玻璃感」的本體，缺一不可。
- **同心圓角**：卡片圓角 28px、內距 16px，則卡片內的控制項圓角 12px（28 − 16）。子元素圓角永遠由父元素推導。
- **單一強調色**：系統藍只出現在主要動作與分類標籤，其餘一切靠玻璃層次與字重分級。
- **數字用 tabular**：間隔天數、難度係數、進度一律 `tnum`，讓列表中的數字不左右跳動。
- **44px 是地板**：所有可點區域最小 44×44px，這是觸控目標，不是裝飾。
- **動效全部可降級**：`prefers-reduced-motion` 下透鏡與光斑**根本不掛載**，其餘動畫退化為瞬時切換。
- **語意色分兩支**：fill 只做填充、text 只做文字。混用會讓按鈕在淺色底上失去對比。
- **淺色底必須接近中性**：冷灰而非淡藍，否則 iOS 的系統綠與系統紅會一起變髒。

## Colors

每個顏色都有邊界。這裡沒有「備用色」——不需要的顏色一概不存在。

### Brand & Accent

- **Accent** `{colors.accent}` (`#007aff`) —— 只給「添加卡片」這一個主要動作。**絕不用於邊框、圖示或裝飾**。
- **Accent Deep** `{colors.accent-deep}` (`#0060df`) —— 淺色背景下的小字強調色（分類標籤文字），保證對比度。
- **Accent Soft** `{colors.accent-soft}` (`rgba(0,122,255,0.14)`) —— 只做分類標籤的底。**絕不當按鈕底**。
- **On Accent** `{colors.on-accent}` (`#ffffff`) —— 只出現在 accent 填充之上。

### Surface

四檔玻璃，用途互斥：

| 檔位 | 值 | 用途 |
|---|---|---|
| `{colors.glass-fill}` | `rgba(255,255,255,0.66)` | 卡片本體——**比底色亮**，卡片才浮得起來 |
| `{colors.glass-fill-strong}` | `rgba(255,255,255,0.82)` | 浮動控制——需要更實的層（圖示鈕、藥丸鈕） |
| `{colors.glass-fill-solid}` | `#ffffff` | 選單、彈出層——**完全不透明**，底下的畫面一點都不該滲上來 |
| `{colors.field-fill}` | `rgba(120,120,128,0.12)` | 凹陷層——輸入框、下拉、進度軌道 |
| `{colors.hairline}` | `rgba(60,60,67,0.16)` | 分隔線，僅用於同一張卡內部的分組 |

玻璃的三個像素，**不可以拿掉、不可以調成灰色**，但三者分工不同：

- `{colors.glass-rim}` (`rgba(255,255,255,0.75)`) —— 沿著邊緣一圈的描邊。
- `{colors.glass-sheen}` (`rgba(255,255,255,0.30)`) —— 大面積的 140° 斜向柔光。**曾經是 0.45，那會把卡片洗白**。
- `{colors.glass-specular}` (`rgba(255,255,255,0.85)`) —— 頂端那一道 1px 的細亮線，也就是 `--specular`。

**四檔怎麼選**：卡片與控制項是「背景的一部分」，可以透；**選單與彈出層是「壓在內容上的另一張紙」**，裡面的字必須在任何背景上都讀得清楚，所以用最厚的 `{colors.glass-fill-solid}`。判斷準則很簡單——**這個表面上的字是拿來讀的，還是拿來看的**，前者用 solid。

這一檔**不做半透明**。原本寫成 95%，實測（截圖比對）後發現：粗體深色字在淺底上，5% 的滲透仍然看得出灰影，像沒擦乾淨。選單既然是「紙」，就把它做成紙——玻璃感交給描邊、上緣高光與陰影。填充不透明之後 `backdrop-filter` 就沒有作用，因此選單不使用它。

### Text

- **Ink** `{colors.ink}` (`#1c1c1e`) —— 標題與卡片主文字。**不是純黑**：純黑在玻璃上會浮起來，失去層次。
- **Body** `{colors.body}` (`#3a3a3c`) —— 正文本體、輸入值。
- **Mute** `{colors.mute}` (`#6b6f78`) —— 後設資訊（間隔、難度、統計）。**絕不用於主文字**。原本的 `#8e8e93` 在 13px 下只有 3.1:1，配上偏藍的底會整片發灰；現在約 4.3:1，仍明顯低於主文字。

### Semantic

四個評分動作各佔一色，且只有評分動作能用這四個顏色。**每個語意色分兩支**：

| 語意 | fill（填充／圖示／開關） | text（文字） | 對應動作 |
|---|---|---|---|
| danger | `{colors.danger}` `#ff3b30` | `{colors.danger-text}` `#c0271c` | 不會 |
| warning | `{colors.warning}` `#ff9500` | `{colors.warning-text}` `#8f5600` | 困難 |
| success | `{colors.success}` `#34c759` | `{colors.success-text}` `#1f7a34` | 簡單、答案、完成狀態 |
| neutral | `{colors.neutral-soft}` | `{colors.body}` | 一般（中性，不搶注意力） |

- **fill 支只做填充**：進度條、開關的開、色塊、圖示。**絕不當文字色**——`#34C759` 壓在 16% 淡綠底上只有約 2:1，等於沒有對比。
- **text 支只做文字**：按鈕標籤、答案區塊、空狀態文案，在淡色底上都有 4.5:1 以上。
- **描邊由 fill 支推導**：`color-mix(in srgb, var(--danger) 32%, transparent)`。不要另外抄一份 `rgba()`——同一個顏色有兩個來源就一定會漂，而且深色模式還得再覆蓋一次。
- 深色外觀下 `success` 與 `warning` 兩支同值（`{colors.success-text-dark}` = `{colors.success-dark}`）——`#30D158` 那類亮色在深底上本來就夠亮。唯一的例外是 `danger`：`{colors.danger-dark}` `#ff453a` 在深色淡紅底上只有 4.20:1，差一點，所以文字支再亮一階到 `{colors.danger-text-dark}` `#ff7069`。

每個語意色的 `-soft` 變體（`{colors.danger-soft}` / `{colors.warning-soft}` / `{colors.success-soft}`）只做按鈕底的 16% 填充，**絕不做實心填充**。

### Wallpaper

`{colors.wallpaper-1}` (`#c6dcf8`) / `{colors.wallpaper-2}` (`#dcd0f6`) / `{colors.wallpaper-3}` (`#f8dcc4`) / `{colors.wallpaper-4}` (`#c6e8f6`) 四團柔光疊在 `{colors.canvas}` (`#eef1f6`) 上，`blur(70px)`、不透明度 0.72（深色 0.55）。三條規則：

1. **底色接近中性**。`{colors.canvas}` 是冷灰不是淡藍——iOS 的系統藍／綠／紅是設計來坐在近中性底上的，底色一藍，淺綠色的「簡單」和紅色的「不會」馬上變髒。
2. **最多一個暖色**。四團裡只有 `{colors.wallpaper-3}` 是暖的（沙色），負責把整體從醫院藍拉回來。舊版的粉紅 `#ffd9e8` 會在頁面中段和藍混成灰紫，正好糊在「今日必須複習」底下。
3. **不透明度抓在中間**。這一檔來回調過兩次，都記在這裡：太高（0.75、色相又雜）會讓卡片底下發灰紫；太低（0.55）整頁讀成一片平坦的灰，玻璃沒有東西可折射。最後停在 0.72——**要看得見顏色，但看不出色塊的邊**。快速判斷法：把截圖縮到 25%，如果背景看起來是灰色，就是太低了。

壁紙只做背景：它是玻璃的內容，不承載任何資訊，因此不允許出現文字、圖示或高對比圖形。深色外觀改用 `{colors.wallpaper-1-dark}` / `{colors.wallpaper-2-dark}` / `{colors.wallpaper-3-dark}` / `{colors.wallpaper-4-dark}` 疊在 `{colors.canvas-dark}` (`#05070d`) 上——深色下玻璃要沉，光暈強度減半。

## Typography

### Font Family

- **Display / Text** —— SF Pro（`SF Pro Display` 用於 20px 以上，`SF Pro Text` 用於以下）。Windows 上由 `Segoe UI Variable Text` 接手。
- **Mono** —— 不使用。這是消費級 iOS 介面，等寬字會立刻把它變成開發者工具。

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.display-large-title}` | 34px | 700 | 41px | -0.4px | 頁面主標題，全頁僅一次 |
| `{typography.heading-card}` | 17px | 600 | 22px | -0.2px | 卡片標題、題目文字 |
| `{typography.body-md}` | 17px | 400 | 22px | 0px | 預設正文 |
| `{typography.body-sm}` | 15px | 400 | 20px | 0px | 答案文字、次要內容 |
| `{typography.button}` | 15px | 600 | 20px | -0.1px | 所有按鈕標籤 |
| `{typography.field}` | 16px | 400 | 22px | 0px | 輸入框與下拉（16px 是 iOS 防止行動瀏覽器自動縮放的下限） |
| `{typography.caption}` | 13px | 400 | 18px | 0px | 後設資訊：間隔、難度、統計 |
| `{typography.caption-strong}` | 12px | 600 | 16px | 0.1px | 分類標籤 |

### Principles

- **字重天花板 700**，且 700 只屬於標題層——按鈕停在 600，正文停 400。iOS 的層級靠字重與顏色拉開，不靠字級暴衝。
- **負字距只在大字出現**：34px 用 -0.4px，17px 用 -0.2px，15px 以下歸零。小字再加負字距會糊。
- **大小寫**：不用 uppercase。中文沒有大小寫，英文標籤也保持原樣。
- **數字用 tabular**：所有數字（間隔天數、難度係數、進度、統計）加 `font-variant-numeric: tabular-nums`，否則列表滾動時數字左右跳。
- **不用 emoji 當圖示**：所有圖示改為線性 SVG（1.6px 描邊，與文字同色）。

### Note on Font Substitutes

SF Pro 是 Apple 系統字，網頁無法授權使用。CSS 字體堆疊必須寫成：

```
-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI Variable Text", "Segoe UI", system-ui, "Noto Sans TC", sans-serif
```

在 Apple 裝置上由 `-apple-system` 解析成真正的 SF Pro；Windows 上落到 Segoe UI Variable——同為人文主義無襯線，字寬接近，替換後不破版。**不要退到 Inter 或 Arial**：前者是通用佔位字，後者會讓整個介面瞬間失去 Apple 質感。中文由系統的蘋方／微軟正黑接手。

## Layout

### Spacing System

4px 基準：`{spacing.xxs}` 4 / `{spacing.xs}` 8 / `{spacing.sm}` 12 / `{spacing.md}` 16 / `{spacing.lg}` 20 / `{spacing.xl}` 24 / `{spacing.xxl}` 32 / `{spacing.section}` 40。

- 卡片內距固定 `{spacing.md}` (16px)，卡片之間固定 `{spacing.lg}` (20px)——內緊外鬆，和 iOS 分組列表的節奏一致。
- 卡片內相鄰元素 `{spacing.xs}` (8px)，成組元素之間 `{spacing.sm}` (12px)。
- 按鈕橫向內距 `{spacing.md}`~`{spacing.lg}`，不用負邊距補償。

### Grid & Container

單欄。內容容器 `max-width: 640px` 居中——超過 640px 後卡片會被拉成一條，玻璃的折射就散了。外距左右 `{spacing.md}`。

### Whitespace Philosophy

這裡的留白是間距而非呼吸：20px 的卡片間隔剛好讓兩塊玻璃的邊互不干擾，又不會讓連續操作的手指迷路。頁面頂部留 `{spacing.lg}` 給標題，底部留 `{spacing.xxl}` + 安全區，避免最後一張卡片貼著螢幕邊緣——玻璃貼邊會失去浮起來的錯覺。

### Responsive Strategy

| Breakpoint | Width | Key Changes |
|---|---|---|
| Mobile | < 640px | 單欄滿寬；評分按鈕允許換行；`viewport-fit=cover` + `env(safe-area-inset-*)` 讓玻璃不撞瀏海與 Home Indicator |
| Tablet | 640–1024px | 容器固定 640px 居中，間距不變 |
| Desktop | > 1024px | 同上；玻璃強度維持，不放大字級 |

全尺寸共通：可點目標最小 **44px**（觸控地板）；按鈕文字不因斷點改變字級；卡片不因斷點改變圓角。

## Elevation & Depth

深度全部由玻璃與陰影合成，不使用裝飾性漸層堆疊。每一層都是「inset 高光 + 環境陰影 + 接觸陰影」的三件套：

| Level | Treatment | Use |
|---|---|---|
| 0 | 無陰影，僅 `{colors.field-fill}` 凹陷填充 | 輸入框、下拉、進度軌道 |
| 1 | `0 1px 2px rgba(0,0,0,0.06)` | 藥丸鈕、圖示鈕 |
| 2 | `0 10px 30px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)` | 卡片（預設） |
| 3 | `0 20px 50px rgba(0,0,0,0.16)` + 上緣高光 | 拖拽中的卡片、浮起的控制 |

規則：**卡片永遠帶一道 `inset 0 1px 0 {colors.glass-specular}` 的上緣高光**——這是光打到玻璃邊緣的那一像素，也是整個語言裡最不能省的一筆。注意它與斜向柔光 `{colors.glass-sheen}` 是兩個不同的 token：前者是 1px 的亮線，後者是大面積的 140° 漸層，混用會讓卡片不是變髒就是被洗白。主要按鈕額外帶 6px 的強調色投影（`rgba(0,122,255,0.35)`），讓它看起來像發光的玻璃而不是貼紙。

深色外觀：環境陰影加深到 0.4 不透明度，上緣高光降到 `{colors.glass-specular-dark}`，玻璃填充轉 `{colors.glass-fill-dark}`。

### Decorative Depth

唯一的裝飾層是壁紙的四團柔光（見 Colors）。**不允許**再加：粒子、漸層文字、光暈圈、玻璃碎片。玻璃語言的力量來自克制，多一層裝飾就變成 2015 年的擬物風。

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.xs}` | 8px | 分類標籤（小元素） |
| `{rounded.sm}` | 12px | 卡片內的控制項（= 28 − 16，同心圓角） |
| `{rounded.md}` | 16px | 中等容器 |
| `{rounded.lg}` | 22px | 卡片內的次級卡片（任務卡、管理列） |
| `{rounded.xl}` | 28px | 頂層卡片 |
| `{rounded.capsule}` | 9999px | 所有按鈕、圖示鈕、標籤、進度條 |

**同心規則**：子元素圓角 = 父元素圓角 − 父元素內距，下限 8px。28px 的卡片裝 16px 內距，裡面的輸入框就是 12px。藥丸（capsule）不受此規則約束——它沒有直邊，任何內距下都成立。

### Icon Geometry

線性 SVG，`viewBox="0 0 24 24"`，描邊 1.6px，`stroke-linecap="round"`，尺寸 16px（卡片標題內）或 20px（圖示鈕內）。圖示顏色跟隨所在文字顏色，不單獨上色（唯一例外：主要按鈕內的白圖示）。

## Motion

動效只做五件事：**進場、離場、跟隨、揭示、手勢**。

> **這一節在 v1.1 被推翻過一次，記在這裡免得又退回去。**
> 原本寫「全部使用減速曲線，不用彈簧」，理由是「iOS 的輕快來自曲線收得乾淨」。
> 實際做出來的結果是死板——因為那句話只對了一半：**iOS 的輕快來自曲線收得乾淨，
> 但 iOS 的靈動來自彈簧**。兩者不衝突。現在的規則：
>
> - 有物理量在變的（位置、縮放、手勢釋放）→ **用彈簧**。
> - 只是透明度或顏色在變的 → 用減速曲線，彈簧在這些屬性上沒有意義。
> - 彈簧的過衝幅度要跟位移成比例。6px 的位移配 8% 過衝等於 0.5px，看不見；
>   所以進場的起點不能太近，手勢釋放的位移才撐得起那一下回彈。

### Duration & Easing

| Token | Value | Use |
|---|---|---|
| `--dur-1` | 160ms | 按壓回饋（`scale` 下沉 + 亮度微升） |
| `--dur-2` | 260ms | 狀態切換：答案揭示、光斑淡入淡出、懸停浮起 |
| `--dur-3` | 420ms | 卡片進場、評分閃光 |
| `--dur-4` | 400ms | 卡片離場（含高度塌陷） |
| `--ease` | `cubic-bezier(0.32, 0.72, 0, 1)` | 預設：離場與收合 |
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | 進場：快速起步、長尾收斂 |
| `--ease-spring-snap` | `linear(…)` ζ1.0 / 0.30s | 按壓下沉、開關滑塊——臨界阻尼，不過衝 |
| `--ease-spring` | `linear(…)` ζ0.78 / 0.42s | 一般進場、離場、懸停 |
| `--ease-spring-bounce` | `linear(…)` ζ0.62 / 0.46s | 手勢釋放、卡片進場——峰值 1.083，看得見過衝 |
| `--ease-spring-soft` | `linear(…)` ζ0.92 / 0.5s | 面板、吐司、進度條 |

彈簧曲線不是手寫的：`scripts/gen-spring.mjs` 把阻尼振盪器取樣成 `linear()`，寫進
`src/styles/spring.css`。要調手感就改腳本裡的 `damping` / `response` 再重跑，
不要手改那個檔案。

**錯開（stagger）**：任務卡 `index × 45ms`（上限 6 張），管理列 `index × 30ms`（上限 8 列），而且只對**首次出現**的項目播放。重新渲染不重播——否則搜尋時每敲一個字，整份列表都會閃一次。

### 四種動效

1. **進場** —— `translateY(10px) scale(0.97)` → 原位，`opacity 0 → 1`，`--dur-3` + `--ease-spring-bounce`。**從下方升起**而不是從上方落下：內容往上浮才像「就定位」，往下掉只像「落下」。
2. **離場** —— 三段關鍵影格：先 `scale(1.012)` 微脹（「收到了」的確認感），再塌掉高度並縮小，`--dur-4` + `--ease-spring`。高度不塌，下方內容就會「啪」地跳一格。`direction` 非 0 時改成往該側飛出去（±380px 起跳 + 旋轉），`from` 是手勢放開當下的位移——動畫要從手指停住的地方接著跑，不能跳回原點再出發。
3. **跟隨** —— 玻璃的 `::after` 光斑：`radial-gradient(220px circle at var(--mx) var(--my), rgba(255,255,255,0.34), transparent 68%)`。座標由 `pointermove` 寫入並以 `rAF` 節流，離開時 `--hi` 歸零、用 `--dur-2` 淡出。這是「玻璃對動態有反應」的那一半，深色下強度降到 0.12。
4. **揭示** —— 答案從 `blur(3px)` + `translateY(-4px)` + `scale(0.985)` 收斂到清晰，`--dur-2`。主訊號是**模糊**而不是位移：眼睛對「由虛變實」的感知比位移強，而且不會推擠版面。
5. **手勢** —— 見下一節。這是唯一由手指位置連續驅動的動效，也是純 CSS 做不到的那一半。

### 滑動評分（Gesture）

卡片跟著手指走、橡皮筋抵抗、放開後依距離與速度決定去留。左滑＝不會，右滑＝簡單。

| 參數 | 值 | 說明 |
|---|---|---|
| `COMMIT_PX` | 92 | 越過就判定要評分 |
| `RUBBER_PX` | 150 | 超過之後每多拉 1px 只前進 0.32px |
| `COMMIT_VELOCITY` | 0.45 px/ms | 甩得夠快就算距離不足也判定 |
| `AXIS_LOCK_PX` | 8 | 位移超過這麼多才決定是橫向還是縱向 |

規則：

- **縱向手勢一律讓給瀏覽器捲動**。`touch-action: pan-y` 加上軸向鎖定，兩者缺一不可——沒有軸向鎖定，捲動時卡片會歪。
- **按鈕上的拖曳不算滑動**。使用者想按「困難」不該被判成手勢。
- **未達門檻要彈回，而且要看得見**：`--ease-spring-bounce` 的 8% 過衝在 60px 的回彈上是 5px——這一下才是「活」的感覺來源。
- **手勢比點按容易誤判，所以完成後給一次撤銷**，把評分前的排程原樣寫回去。
- 拖曳中卡片要**抬起**（`--shadow-3`）、稍微**傾斜**（`dx × 0.028deg`），並用 `::before` 鋪一層方向色——這三件事同時發生才像實體。

### 捲動連動（Scroll-Linked）

iOS 最容易認出來的一組動作，三者由同一個捲動進度驅動，所以永遠同步：

- **大標題收縮**：`transform: scale(var(--title-scale))`，前 64px 內從 1 收到 0.76。用 `transform` 不用 `font-size`——後者每幀重排。
- **玻璃條淡入**：`.app-header::before` 的 `opacity` 從 0 到 1。這是 iOS 26 的 scroll edge effect：不捲動時完全透明，內容看起來直接躺在壁紙上。
- **壁紙視差**：四團柔光各有 `--parallax`（-0.05 / 0.035 / -0.075 / 0.05），乘上 `--scroll-y`。玻璃是固定的、壁紙在動，兩層之間才有距離。

JS 只負責把 `--scroll-y` / `--title-scale` / `--header-glass` 寫進 `:root`（`rAF` 節流），
實際動畫全在 CSS。

特殊案例：空狀態的勾選線條以 `stroke-dasharray`/`stroke-dashoffset` 繪製，520ms + 100ms 延遲（`--ease-out`）——這是唯一超過 `--dur-4` 的動效，因為「畫出來」需要被看見。

**按鈕的兩段速度**：`transform`（按壓下沉）走 `--dur-1` 160ms + `--ease-spring-snap`，`background-color`/`box-shadow`/`filter` 走 `--dur-2` 260ms + `--ease`。按下要立刻回應，顏色可以慢一點——這條分離讓按鈕「彈手」而不「跳躍」。

**評分閃光從手指那一點漫出來**：按鈕的 `pointerdown` 把座標寫進卡片的 `--fx` / `--fy`，閃光改成以該點為圓心的 `radial-gradient`。整張卡均勻亮一下是「狀態變了」，從手指漫出來才是「我按的這一下生效了」。

### 光標透鏡（Cursor Lens）

頁面上唯一反相的元素。機制照抄自 DeepSeek 官網首頁的標語交互（讀其源碼得出，非猜測）：

- 一個 `position: fixed; inset: 0; z-index: 9999; mix-blend-mode: difference` 的 canvas，**掛到 `document.body`**——不能放在任何 `backdrop-filter` 容器裡，否則混合會被隔離成局部。
- 只在指針落於 `[data-cursor="blend"]` 元素上時出現；白色實心圓，白色在 difference 下等於全反相，所以字被「挖」出一塊負片。
- **半徑由行高決定**：直徑略大於目標文字的行高。標題 34px/41px 對應半徑 22px（直徑 44px，上下各溢出約 1.5px）。直徑取太小，透鏡會縮成一個點；取太大，等於在壁紙上開一個大洞。（DeepSeek 標語行高約 68px、圓盤 64px，是同一個比例。）
- 跟隨用 lerp：距離 < 50px 時係數 **0.7**，否則 **0.42**——遠時落後、近時咬緊，避免永遠追不上。
- `alpha` 與 `scale` 各以 **0.24** 的係數逼近目標；首次出現直接就位，不從上一個位置飛進來。
- **不要裁切到文字方框**：曾試過用 `ctx.clip()` 把反相收在標題 rect 內，結果標題框高 41px、圓盤直徑 60px——圓盤永遠被上下切掉，看起來是一條帶硬邊的橫條而不是透鏡，反而把邊界暴露出來。透鏡必須維持完整的圓，寧可讓它自然溢出文字行高。
- 離開、`scroll`、`visibilitychange` 一律淡出——固定 canvas 配上捲動中的文字會穿幫。
- 只在 `(hover: hover) and (pointer: fine)` 且非 `prefers-reduced-motion` 時掛載；每幀只清上一幀圓盤的外接矩形，不清整張畫布。
- 目前只掛在頁面大標題上。要擴到別的文字，加 `data-cursor="blend"` 即可，機制不用改。

### Reduced Motion

`prefers-reduced-motion: reduce` 下：CSS 動畫與過場全部縮到 0.01ms，光斑與透鏡不註冊任何監聽、不建立 canvas，進場／離場退化為瞬時切換。這是**行為層的關閉**，不是視覺層的隱藏。

## Components

### Buttons

- **button-primary** —— 只用於「添加卡片」。背景 `{colors.accent}`，文字 `{colors.on-accent}`，字形 `{typography.button}`，圓角 `{rounded.capsule}`，最小高度 44px。頂部帶 `inset 0 1px 0 rgba(255,255,255,0.45)` 高光 + `0 6px 16px rgba(0,122,255,0.35)` 投影。
  - hover：亮度 +4%；pressed：`scale(0.97)` 且投影減半；disabled：`{colors.neutral-soft}` 底 + `{colors.mute}` 字。
- **button-tint** —— 評分與管理動作。16% 的語意色填充 + 30% 的語意色描邊 + 100% 的語意色文字。四個色調（danger / warning / neutral / success）不可互換語意。
  - pressed：`scale(0.96)`；hover：底色提到 22%。
- **button-quiet** —— 「顯示答案」等中性動作。玻璃底 `{colors.glass-fill-strong}` + `{colors.ink}` 字。深度 Level 1。
- **icon-button** —— 夜間模式切換等單一圖示動作。正方形 44×44，圓角 `{rounded.capsule}`，玻璃底，圖示 20px。必須有 `aria-label`。

### Cards & Containers

- **glass-card** —— 頂層容器。背景 `{colors.glass-fill}`，`backdrop-filter: blur(24px) saturate(180%)`，描邊 1px `{colors.glass-rim}`，圓角 `{rounded.xl}`，內距 `{spacing.md}`，深度 Level 2，並帶上緣高光。內容上方疊一層 140° 的斜向高光（`{colors.glass-sheen}` → 透明，45% 處收），`pointer-events: none`。
  - 另疊 `{component.specular-follow}`：跟隨指針的光斑，僅精細指標裝置啟用。
- **task-card** —— 任務卡。圓角 `{rounded.lg}`（它是卡片裡的卡片），其餘同 glass-card 但深度 Level 1。
- **row-card** —— 管理列表列，可拖拽。`cursor: grab`；拖拽中 `scale(1.02)` + 深度 Level 3 + 透明度 0.9。

### Inputs & Forms

- **field-inset** —— 文字輸入與下拉。凹陷感：`{colors.field-fill}` 底 + `inset 0 1px 2px rgba(0,0,0,0.06)`，沒有描邊（有描邊就變成按鈕了）。圓角 `{rounded.sm}`，內距 `{spacing.sm}` `{spacing.md}`，最小高度 44px，字級 `{typography.field}`。
  - focus：底色轉 `{colors.glass-fill-strong}`，描邊轉 `{colors.accent}`，外加 `0 0 0 4px {colors.focus-ring}` 光環。
  - 下拉：`appearance: none`，右側自繪 12px chevron SVG（用 `background-image`），右內距留 `{spacing.xxl}`。
- **answer-collapse** —— 答案區的收合容器。**收起的內容不可以佔高度**：外層 `display: grid` + `grid-template-rows: 0fr ↔ 1fr` 做轉場，內層 `min-height: 0; overflow: hidden`。只把 `opacity` 調成 0 的話元素仍留在版面裡，每張卡在題目和按鈕之間會多出一大塊空白（截圖看出來的：卡片因此虛胖、一屏少看兩張）。不用 `max-height`——寫死數值會讓短答案的轉場時間對不上。
- **chip-category** —— 分類標籤。`{colors.accent-soft}` 底 + `{colors.accent-deep}` 字 + `{typography.caption-strong}` + `{rounded.capsule}`，內距 2px 8px。它是唯一的彩色文字元素，因此一屏內不超過 6 個。

- **select-menu** —— 原生 `<select>` 的展開清單由作業系統繪製（灰底、系統字體、圓角與陰影都不歸我們管），與玻璃材質完全衝突，所以一律換成自製下拉：
  - **原生 `<select>` 留在 DOM 裡當唯一事實來源**，只是視覺上藏起來。程式照舊寫 `select.value`、照舊監聽 `change`——「換皮不動商業邏輯」是這個元件的硬約束，也是它值得獨立成一個模組的理由。
  - 展開鈕沿用 `field-inset` 的外觀；右側 chevron 展開時轉 180°，用 `--ease-spring-snap`。
  - 清單是**不透明**面板：`{colors.glass-fill-solid}` + `{colors.glass-rim}` 描邊 + 上緣高光 `{colors.glass-specular}` + 深度 Level 2，圓角 `{rounded.md}`；選中項用 `{colors.accent-deep}` 加一個勾。
  - 選項最小高度 40px；清單最高 `min(300px, 45dvh)`，並加 `overscroll-behavior: contain`，否則捲到底會把整頁帶著跑。
  - 開合 260ms + `--ease-spring-soft`；Esc 關閉、方向鍵移動、點外面關閉。
  - **展開時要把所屬卡片抬起來**：`.glass-card:has(.select[data-open="true"]) { z-index: 30; }`。玻璃用 `backdrop-filter`，它會建立新的堆疊上下文——選單的 `z-index` 只在「自己那張卡」裡有效，後面的卡片會整張蓋上來把選單吃掉。用 `:has()` 而不是 JS 記錄，狀態自動跟著 `data-open` 走。

### Sheets & Dialogs

- **sheet** —— 設定與 AI 面板。跟 glass-card 同一套材質，但深度升到 Level 3，圓角 `{rounded.xl}`，`::backdrop` 用 42% 深色 + `blur(6px)`：背景要「退後」，不是「消失」。
  - 桌面：置中，寬度 `min(560px, 100vw − 32px)`。
  - 手機（≤ 640px）：貼齊底部，上方兩角圓、下方直角，並吃 `env(safe-area-inset-bottom)`。
  - 進場：`translateY(12px) scale(0.98)` → 原位，`--dur-3` + `--ease-out`。
- **sheet-head / sheet-body / sheet-foot** —— 頭尾固定、內容捲動。body 加 `overscroll-behavior: contain`，否則捲到底會把整個頁面一起帶著跑。

### Controls

- **segmented** —— 給「互斥、選項少」的選擇（外觀、語言）。凹槽底 `{colors.field-fill}` + inset 陰影；**只有選中項升成玻璃**（`{colors.glass-fill-strong}` + 描邊 + 上緣高光）。超過 4 個選項就不要用它。
- **switch** —— 51×31，開啟時填 `{colors.success}`，滑塊是純白圓 + 雙層陰影。位移只動 `transform`，不動 `left`——後者每幀都會觸發重排。

### Feedback

- **toast** —— 底部置中的玻璃藥丸，`--dur-3` 浮入、`--dur-2` 淡出，5.2 秒後自動消失。帶動作時（刪除後的「撤銷」）動作鈕用 `btn-inline`（34px 高）。一次只說一件事。
- **callout** —— 面板內的說明區塊，`{colors.field-fill}` 底 + `{colors.hairline}` 描邊；警示語氣換成 `{colors.warning-soft}` / `{colors.danger-soft}` 底。用於 CORS 提示、隱私說明這類「該讀但不必搶眼」的文字。
- **spinner** —— 16px 圓環，`currentColor` 描邊、頂端透明。`prefers-reduced-motion` 下**保留旋轉但放慢到 1400ms**：載入指示是狀態而非裝飾，凍結它會讓使用者分不清「在跑」與「卡住」。
- **stream-caret** —— 串流輸出時的游標：2px 直條、`1s steps(2)` 閃爍、跟著 `currentColor`。LLM 介面最傷體驗的就是「按了之後幾十秒黑箱」，有東西在動才分得出是在跑還是卡住。串流期間右上另給一顆「停止」——**中止不等於失敗，已經生成的部分要留下來**。

### Localization

- 介面語言：`zh-Hant` / `zh-Hans` / `en`。首次跟隨瀏覽器語言，之後記住選擇。
- **科目是資料，不是翻譯**：內建六個的 id 固定寫在卡片裡，切換語言只換顯示文字。把資料本身翻掉，既有卡片就會對不上科目。
- **自訂科目**：使用者新增的科目存成 `{ id: "s-…", name }`——id 穩定、name 可讀，所以改顯示名稱不會動到卡片。內建科目則沿用中文字串當 id（它們已經在使用者的資料與匯出檔裡，不能為了整齊改掉）。
- 還有卡片在用的科目不給刪：與其默默把卡片改到別的科目，不如擋下來並告訴使用者還有幾張。
- 所有字串走 `t(key, vars)`；查不到就回退繁體中文，最後才原樣回傳 key——畫面上出現 key 字串，就是缺翻譯的訊號。
- 三個語系的 key 集合必須一致，冒煙測試會驗這件事，避免切換語言後出現半英半中。
- 日期與數字交給 `Intl`，跟著語系走。

### Navigation

單頁應用，沒有導覽列。頁首 = 大標題（`{typography.display-large-title}`）+ 右側 44px 圖示鈕。標題與按鈕基線對齊，不置中——置中會讓頁首看起來像行銷頁。

### Signature Components

- **Lensing Wallpaper** —— 四團 `blur(70px)` 柔光（`{colors.wallpaper-1}`~`{colors.wallpaper-4}`）疊在 `{colors.canvas}` 上，`position: fixed` 充滿視口。它不承載資訊，唯一職責是給玻璃提供可折射的顏色——沒有它，整個語言不成立。
- **Progress Track** —— 進度軌道 `{colors.field-fill}` 底，6px 高，`{rounded.capsule}`；填充 `{colors.success}`，寬度隨完成比例變化，`transition: width var(--dur-4)`。旁邊配 `{typography.caption}` 的 tabular 數字。這是本應用的招牌——它把原本一行文字變成可以一眼掃到的狀態。
- **Rating Flash** —— `{component.rating-flash}`。評分時卡片先鋪一層該語意色的 16% 底色（0 → 1 → 0，`--dur-3`），再走離場動畫。它回答的是「我這一按到底生效沒」——在沒有觸覺回饋的網頁上，這個確認必須由視覺承擔。
- **Cursor Lens** —— `{component.cursor-lens}`。見 Motion 一節。

## Do's and Don'ts

### Do

- ✅ 每一塊玻璃都同時具備三件套：半透明填充 + 1px 暖白描邊 + inset 上緣高光。
- ✅ 子元素圓角一律由父元素推導（父圓角 − 父內距）。
- ✅ 所有可點區域 ≥ 44×44px，圖示鈕必帶 `aria-label`。
- ✅ 數字一律 `tabular-nums`。
- ✅ 卡片內距固定 16px、卡片間距固定 20px。
- ✅ 主要動作只給「添加卡片」；一屏只有一個 accent 填充。
- ✅ 深色外觀下把光暈強度減半、環境陰影加深。
- ✅ 列表進場動效只對首次出現的項目播放，重新渲染不重播。
- ✅ 卡片離場時高度與上邊距一起塌掉，不讓下方內容跳動。
- ✅ 新增元件時照樣湊齊三件套：半透明填充 + 1px 暖白描邊 + inset 上緣高光。
- ✅ 新字串進 i18n 字典，而且三個語系一起補。
- ✅ 新增語意色時，fill 與 text 兩支一起定義，並在淡色底上實測對比。
- ✅ 手勢必須跟手：拖曳中不套 transition，位置直接由手指決定。
- ✅ 未達門檻要彈回，而且回彈要看得見（過衝 × 位移 ≥ 3px）。
- ✅ 捲動連動的效果全部由同一個進度變數驅動，不會各自為政。
- ✅ 換控制項外觀時，讓原生元素留在 DOM 裡當資料來源，商業邏輯不要跟著改（`select` 就是這樣處理的）。

### Don't

- ❌ 不要把玻璃做成純白或純黑的不透明塊——那不是玻璃，是卡片。
- ❌ 不要在玻璃上疊第二層裝飾（粒子、漸層文字、光暈圈、碎片）。
- ❌ 不要把 `{colors.glass-rim}` 調成灰色或拿掉上緣高光。
- ❌ 不要用純黑 `#000000` 當文字色，也不要用 emoji 當圖示。
- ❌ 不要引入第五個語意色，也不要把 `{colors.accent}` 用於邊框、圖示或裝飾。
- ❌ 不要在正文使用等寬字體或 uppercase。
- ❌ 不要在「有物理量在變」的屬性（位置、縮放、手勢釋放）上用純減速曲線——那是死板感的來源。
- ❌ 也不要在透明度或顏色上用彈簧：那些屬性沒有物理量，過衝只會被夾住，白白拖慢。
- ❌ 不要讓過衝幅度與位移不成比例（6px 的位移配 8% 過衝等於 0.5px，等於沒做）。
- ❌ 不要在滑動時搶走縱向捲動，也不要讓超過 700ms 的動效留在畫面上。
- ❌ 不要在觸控裝置或 `prefers-reduced-motion` 下掛載光標透鏡與跟隨光斑。
- ❌ 不要把透鏡裁切到文字方框：圓盤直徑一旦大於行高，切口就會變成看得見的硬邊。
- ❌ 不要讓卡片貼著視口邊緣——玻璃貼邊就失去浮起的錯覺。
- ❌ 不要用 `left` / `top` 做位移動畫（用 `transform`），也不要把 switch 滑塊做成方形。
- ❌ 不要在 `prefers-reduced-motion` 下凍結 `spinner`。
- ❌ 不要把分類 id 翻成其他語言——那是資料，翻了就對不上既有卡片。
- ❌ 不要把 `hidden` 屬性當成「一定會隱藏」：`display: flex` / `inline-flex` 這類規則的特異性高於 UA 的 `[hidden] { display: none }`，元素就會一直顯示。專案用一條全域 `[hidden] { display: none !important }` 擋住這個坑（自製下拉、AI 欄位、AI 生成按鈕都中過）。
- ❌ 不要以為「浮動元素給了高 z-index 就會在上面」：任何祖先只要建立了堆疊上下文（`backdrop-filter`、`filter`、`transform`、`isolation`…），裡面的 z-index 就只在那個上下文內有效。本專案的玻璃卡片全都是這種祖先。
- ❌ 不要拿 fill 支當文字色（`#34C759` 綠字壓在 16% 淡綠底上只有約 2:1）。
- ❌ 不要把淺色底調成飽和的藍或紫——系統語意色會跟著一起變髒。

## Iteration Guide

1. 一次只改一個組件，改完立刻對照三件套（填充／描邊／高光）是否齊全。
2. 直接引用 token 名（`{colors.glass-fill}`、`{rounded.xl}`、`{component.glass-card}`），不要描述顏色。
3. 改完跑結構校驗：

   ```
   python "C:\Users\Lenovo\.codex\skills\design-md\scripts\check_design_md.py" DESIGN.md
   ```

4. 新增變體單獨成條目（例如 `button-tint-danger`），不要改既有組件定義。
5. 改動圓角或內距時，同步檢查同心規則：子元素圓角是否仍等於父圓角減父內距。
6. 亮度／對比微調只動 token，不動組件規則——組件規則描述的是關係，不是數值。
