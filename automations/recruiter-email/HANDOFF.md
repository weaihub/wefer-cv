# 🚀 WeFer Recruiter Email Automation — Handoff to Claude Code

## 📌 Context: I'm Choc, co-founder/PM at WeFer

**WeFer** = freelance recruiter platform in Taiwan, building toward Paraform-equivalent for APAC. I'm working with you (Claude) as my AI CTO on this automation project.

**I just had a long conversation in Claude.ai building this.** Now I'm moving to Claude Code in VSC for the build phase. Below is the full state.

---

## 🎯 What We're Building

**Goal:** When a recruiter submits a candidate via Notion form, Zapier should automatically send 2 emails to the KA (Key Account):

1. **External email** — clean, ready-to-forward to client HR (with CV attached)
2. **Internal KA Brief** — full context (motivation, salary, why-fit) for KA's eyes only

**Why:** Today, KAs manually delete language versions, manage admin work, and lack context. This automates the prep work so they only need to forward.

---

## 🏗️ Architecture (LOCKED — don't redesign)

```
Notion form submission
   ↓
Zapier Trigger (New Database Item)
   ↓
Filter (only complete forms)
   ↓
Run JavaScript step:
   - Downloads CV PDF from Notion
   - Calls Claude API with PDF
   - Extracts: candidateName, bullets, whyFit
   - Detects language from bullets (Chinese vs English)
   - Returns: subject + emailBody (external) + briefSubject + briefBody (internal)
   ↓
Gmail Step 3: External email to KA → forwards to HR
Gmail Step 4: Internal KA Brief → KA's reference
```

**No Cloudflare Worker.** **No N8N.** **Pure Zapier + Anthropic API.**

---

## 📊 Notion Setup (DONE ✅)

### Pipeline Status DB

- ID: `28dc3afc-9387-8062-ab24-000b5bacd011`
- URL: `https://www.notion.so/28dc3afc938780eea008f6425b68c25d`

### Fields added during this build:

- ✅ `🤖 AI Status` (select: Pending/Processing/Done/Error)
- ✅ `🤖 Last AI Run` (date)
- ✅ `✍️ KA Email Sent` (checkbox)
- ✅ `Email Language` (select: 中文/English) — **may not actually be used since v6 auto-detects**
- ✅ `Zap_KA Mail Print` (formula) — extracts KA emails
- ✅ `Zap_Client's Name` (formula) — uses `prop("客戶名稱").map(current.prop("Name∂")).join(", ")`
- ✅ `Zap_Position Name` (formula) — uses `prop("投遞職位").map(current.prop("Job")).join(", ")`

### Critical schema gotchas:

- W: Companies title property is `Name∂` (with ∂ symbol, NOT regular `d`)
- W: Jobs title property is `Job` (not `Name`)
- Notion file URLs expire after ~1 hour (test data goes stale)
- File property `原始CV上傳` expands to multi sub-fields in Zapier — must use `File 1 Url`

### Form fields (recruiter currently fills):

1. Recruiter (Candidate Owner) — auto
2. 客戶名稱 (relation → W:Companies)
3. 投遞職位 (relation → W:Jobs)
4. 人選Email
5. 人選電話
6. 人選面試動機 (Push/Pull)
7. 人選目前薪水架構
8. 人選期待薪水
9. 原始CV上傳 (PDF only — confirmed required)
10. 已確認個人資料同意書 ✅
11. 已確認資料完整填寫 ✅
12. (Currently still on form, can be removed): 人選姓名, 請直接貼上CV的Summary Point

---

## 💻 Current Working Code (v6)

See [`zapier-step.js`](./zapier-step.js) for the full Run JavaScript step.

---

## 📝 Zapier Input Data (must be set in UI)

The Run JavaScript step needs these 11 input mappings:

| Key             | Value source                                    |
|-----------------|-------------------------------------------------|
| `cvUrl`         | Step 1: `原始CV上傳 File 1 Url`                  |
| `clientName`    | Step 1: `Zap_Client's Name`                     |
| `position`      | Step 1: `Zap_Position Name`                     |
| `apiKey`        | Anthropic API key (`sk-ant-...`) typed directly |
| `recruiterName` | Step 1: Recruiter (Candidate Owner) Name        |
| `currentSalary` | Step 1: 人選目前薪水架構                            |
| `expectedSalary`| Step 1: 人選期待薪水                              |
| `motivation`    | Step 1: 人選面試動機                              |
| `candidateEmail`| Step 1: 人選Email                               |
| `candidatePhone`| Step 1: 人選電話                                |
| `notionPageUrl` | Step 1: Url (the page URL)                      |

**Note:** Keys must be `camelCase` (no spaces) — JavaScript-compatible.

---

## ⚠️ Lessons Learned (don't repeat)

1. **Zapier's Anthropic action only takes text** — can't read PDFs. That's why we use Run JavaScript + direct API call.
2. **Zapier's runtime uses `node-fetch`** — must use `cvResponse.buffer()`, NOT `arrayBuffer()`.
3. **Notion file URLs expire after ~1 hour** — test data goes stale. Re-trigger to refresh.
4. **Notion relations don't auto-resolve in Zapier** — needed formula fields (`Zap_Client's Name`, `Zap_Position Name`) to expose relation titles as plain text.
5. **W: Companies title property is `Name∂`** with a ∂ symbol — needs `current.prop("Name∂")` not `current.name()`.
6. **W: Jobs title property is `Job`** — needs `current.prop("Job")`.
7. **PDF only** — Claude API document type can't read .docx. Recruiters must export PDF.
8. **Don't double-strip prefixes** — JS code already strips CL-/JB-, no need for separate Formatter steps.

---

## 🐛 Current Status & What's Next

### ✅ Completed

- Notion DB fields, formulas all set up
- v6 code outputs both emails
- Step 1 (Notion trigger) working
- Step 2 (Run JavaScript) — code works, was being tested

### ⏳ Last left off here

- Was setting up Step 3 (Gmail external email)
- Step 4 (Gmail internal KA brief) NOT YET CREATED

### 🚧 What needs to happen next

1. **Confirm Step 2 outputs** all v6 fields successfully (briefBody, briefSubject, etc.)
2. **Build Step 3 Gmail** — external email:
   - To: `Zap_KA Mail Print`
   - Subject: Step 2 `subject`
   - Body: Step 2 `emailBody`
   - Attachment: Step 1 `原始CV上傳 File 1`
   - Body Type: plain
3. **Build Step 4 Gmail** — internal KA brief:
   - To: `Zap_KA Mail Print`
   - Subject: Step 2 `briefSubject`
   - Body: Step 2 `briefBody`
   - NO attachment
   - Body Type: plain
4. **Test with real submission**, sending test email TO ME first (not actual KAs)
5. **Go live** — change `To` field back to `Zap_KA Mail Print`, turn Zap on

### 🔮 v2 Ideas (not building now)

- Add Job Description from W:Jobs as context for Claude (better matching)
- Match score (0-10) against JD requirements
- Multi-KA CC routing
- Status writeback to `🤖 AI Status` field
- Hide/remove now-redundant form fields (`人選姓名`, `Summary Point`)

---

## 🎯 Help Me Continue From Here

**Right now I need:**

- Help finishing Step 4 (the internal KA Brief Gmail action)
- Test plan for both emails
- Form view cleanup recommendations once it's all working

**My constraints:**

- I work mostly in Traditional Chinese + English
- I prefer concise direct guidance I can forward to teammates
- I want to ship MVP this week, not over-engineer
- Test before going live (low-risk first, full prod last)
- Always ask before touching Notion DB/form
