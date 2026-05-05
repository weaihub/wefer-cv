// ════════════════════════════════════════════════════════════════════
// WeFer Recruiter Email — Zapier Code Step (v6)
// ────────────────────────────────────────────────────────────────────
// CHANGES IN v6:
//   - Outputs TWO sets of email content:
//     1. External (clean, ready-to-forward to HR): emailBody + subject
//     2. Internal Brief (KA only): briefBody + briefSubject
//
// REQUIRED INPUT DATA:
//   cvUrl              -> Notion file URL (must be PDF)
//   clientName         -> Zap_Client's Name (formula field)
//   position           -> Zap_Position Name (formula field)
//   apiKey             -> Anthropic API key (sk-ant-...)
//   recruiterName      -> Recruiter (Candidate Owner) Name
//   currentSalary      -> 人選目前薪水架構
//   expectedSalary     -> 人選期待薪水
//   motivation         -> 人選面試動機
//   candidateEmail     -> 人選Email
//   candidatePhone     -> 人選電話
//   notionPageUrl      -> URL of the Pipeline Status page (for link in brief)
// ════════════════════════════════════════════════════════════════════

// ───────── Step 1: Read inputs + DEBUG LOG ─────────
console.log('=== INPUT DATA RECEIVED ===');
console.log('cvUrl:', inputData.cvUrl ? `[${inputData.cvUrl.substring(0, 80)}...]` : 'MISSING');
console.log('clientName:', inputData.clientName || 'MISSING');
console.log('position:', inputData.position || 'MISSING');
console.log('apiKey:', inputData.apiKey ? `[${inputData.apiKey.substring(0, 10)}...]` : 'MISSING');
console.log('recruiterName:', inputData.recruiterName || '(not provided)');
console.log('currentSalary:', inputData.currentSalary || '(not provided)');
console.log('expectedSalary:', inputData.expectedSalary || '(not provided)');
console.log('motivation:', inputData.motivation ? `[${inputData.motivation.substring(0, 50)}...]` : '(not provided)');
console.log('candidateEmail:', inputData.candidateEmail || '(not provided)');
console.log('candidatePhone:', inputData.candidatePhone || '(not provided)');
console.log('notionPageUrl:', inputData.notionPageUrl || '(not provided)');
console.log('===========================');

const cvUrl = inputData.cvUrl;
const clientName = inputData.clientName;
const position = inputData.position;
const apiKey = inputData.apiKey;
const recruiterName = inputData.recruiterName || 'WeFer Recruiter';
const currentSalary = inputData.currentSalary || '(not provided)';
const expectedSalary = inputData.expectedSalary || '(not provided)';
const motivation = inputData.motivation || '(not provided)';
const candidateEmail = inputData.candidateEmail || '(not provided)';
const candidatePhone = inputData.candidatePhone || '(not provided)';
const notionPageUrl = inputData.notionPageUrl || '';

// ───────── Step 2: Validate critical inputs ─────────
if (!cvUrl) {
  throw new Error(`Missing CV URL. Map Input Data 'cvUrl' to "原始CV上傳 File 1 Url" from Step 1.`);
}

if (!clientName) {
  throw new Error(`Missing clientName. Map Input Data 'clientName' to "Zap_Client's Name" from Step 1.`);
}

if (!position) {
  throw new Error(`Missing position. Map Input Data 'position' to "Zap_Position Name" from Step 1.`);
}

if (!apiKey) {
  throw new Error(`Missing API key. Paste your sk-ant-... key into 'apiKey' Input Data.`);
}

if (!cvUrl.toLowerCase().includes('.pdf')) {
  throw new Error(`CV must be a PDF. Got: ${cvUrl.substring(0, 100)}. Recruiters must upload PDF only.`);
}

// ───────── Step 3: Strip CL- and JB- prefixes from titles ─────────
const cleanedClient = clientName.replace(/^CL-\d+\s*/, '').trim();
const cleanedPosition = position.replace(/^JB-\d+\s*/, '').trim();
console.log('Cleaned client:', cleanedClient);
console.log('Cleaned position:', cleanedPosition);

// ───────── Step 4: Download CV PDF ─────────
console.log('Downloading CV...');

const cvResponse = await fetch(cvUrl);
if (!cvResponse.ok) {
  throw new Error(`Failed to download CV. HTTP ${cvResponse.status}. Notion URLs expire after ~1 hour.`);
}

const cvBuffer = await cvResponse.buffer();
const cvBase64 = cvBuffer.toString('base64');
console.log(`CV downloaded. Size: ${Math.round(cvBuffer.length / 1024)} KB`);

// ───────── Step 5: Build Claude prompt ─────────
const systemPrompt = `You are an assistant for WeFer, a freelance recruiting platform. You extract structured information from candidate CVs to help recruiters send recommendation emails to clients.`;

const userPrompt = `Extract the following from this CV and respond ONLY with a valid JSON object (no markdown, no extra text):

{
  "candidateName": "Full name in the format '英文名 中文名' (e.g. 'Alson Liu 劉濟瑋'). If only one language available, use just that.",
  "bulletPoints": "Generate 3-4 bullet points starting each line with '• ' (bullet character followed by space) that highlight why this candidate is a strong fit for the position. Each bullet must be ONE complete sentence. Connect candidate's specific experience to the position requirements explicitly. Match the tone of professional recruiting emails — formal but warm. IMPORTANT: Write the bullets in the SAME LANGUAGE as the CV's primary content. If the CV body is in Traditional Chinese, write bullets in Traditional Chinese. If the CV body is in English, write bullets in English. Do NOT include any header or intro text — just the bullet lines starting with '• ', one per line.",
  "whyFitDetailed": "Write a longer 3-5 sentence paragraph explaining WHY this candidate fits the position. This is for internal KA reference, more detailed than the bullets. Same language as CV. Cover: relevant experience, key achievements, and any unique angle worth highlighting to the client HR."
}

CONTEXT:
- Client company: ${cleanedClient}
- Position they're applying for: ${cleanedPosition}

CRITICAL:
- Output ONLY valid JSON, nothing else. No markdown code fences, no explanation.
- Use double quotes for JSON keys and values.
- Escape any newlines inside string values as \\n.
- Each bullet line MUST start with '• ' (bullet character + space).
- Bullets MUST match the CV's primary language.`;

// ───────── Step 6: Call Claude API ─────────
console.log('Calling Claude API...');

const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-5',
    max_tokens: 2500,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: cvBase64
            }
          },
          {
            type: 'text',
            text: userPrompt
          }
        ]
      }
    ]
  })
});

if (!claudeResponse.ok) {
  const errorText = await claudeResponse.text();
  throw new Error(`Claude API error ${claudeResponse.status}: ${errorText}`);
}

const claudeData = await claudeResponse.json();
console.log('Claude responded successfully');

// ───────── Step 7: Parse Claude's JSON ─────────
const rawText = claudeData.content[0].text.trim();
const cleanedText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();

let parsed;
try {
  parsed = JSON.parse(cleanedText);
} catch (e) {
  throw new Error(`Failed to parse Claude JSON. Raw response: ${rawText}`);
}

const candidateName = parsed.candidateName || '';
const bulletPoints = parsed.bulletPoints || '';
const whyFitDetailed = parsed.whyFitDetailed || '';

// ───────── Step 8: Detect language from bullets ─────────
const chineseCharCount = (bulletPoints.match(/[一-鿿]/g) || []).length;
const totalCharCount = bulletPoints.length;
const chineseRatio = totalCharCount > 0 ? chineseCharCount / totalCharCount : 0;

const detectedLanguage = chineseRatio > 0.2 ? '中文' : 'English';
console.log(`Detected language: ${detectedLanguage}`);

// ───────── Step 9: Build EXTERNAL email body (forward to HR) ─────────
let emailBody;

if (detectedLanguage === '中文') {
  emailBody = `Hi {HR Name},

您好，想向您推薦一位候選人 ${candidateName}，我們評估他與 ${cleanedClient} 目前的 ${cleanedPosition} 需求相當契合。履歷已附上，並整理了重點摘要於下方供您參考，謝謝。

${bulletPoints}`;
} else {
  emailBody = `Hi {HR Name},

Hope you're doing well! We're pleased to recommend a candidate ${candidateName} who would fit ${cleanedClient} for ${cleanedPosition} position well. Kindly find the profile attached and the summary below. Cheers!

${bulletPoints}`;
}

// ───────── Step 10: Build INTERNAL KA Brief body ─────────
const briefBody = `👋 Hi KA,

A new candidate has been submitted. Below is the internal brief to help you decide what to highlight when forwarding to HR.

═══════════════════════════════════════
🧑 CANDIDATE: ${candidateName}
🏢 CLIENT: ${cleanedClient}
💼 POSITION: ${cleanedPosition}
👤 SUBMITTED BY: ${recruiterName}
═══════════════════════════════════════

🎯 WHY THIS CANDIDATE FITS:
${whyFitDetailed}

📋 KEY HIGHLIGHTS (also in the external email):
${bulletPoints}

💡 CANDIDATE'S MOTIVATION:
${motivation}

💰 SALARY:
- Current: ${currentSalary}
- Expected: ${expectedSalary}

📞 CONTACT INFO:
- Email: ${candidateEmail}
- Phone: ${candidatePhone}

🔗 NOTION LINK:
${notionPageUrl}

────────────────────────────────────────
✅ When ready, forward the SEPARATE email
("[WeFer] ${cleanedClient}...") to HR.
The CV is attached to that external email.
────────────────────────────────────────`;

// ───────── Step 11: Build subjects ─────────
const subject = `[WeFer] ${cleanedClient}-${cleanedPosition}-${candidateName}`;
const briefSubject = `🔒 KA Brief: ${candidateName} - ${cleanedClient} - ${cleanedPosition}`;

// ───────── Step 12: Return outputs ─────────
output = {
  // External email (Step 3 Gmail)
  candidateName: candidateName,
  bulletPoints: bulletPoints,
  emailBody: emailBody,
  subject: subject,

  // Internal brief (Step 4 Gmail — NEW)
  briefBody: briefBody,
  briefSubject: briefSubject,

  // Useful metadata
  detectedLanguage: detectedLanguage,
  cleanedClient: cleanedClient,
  cleanedPosition: cleanedPosition,
  whyFitDetailed: whyFitDetailed
};
