/**
 * Lightweight i18n for FastCaption
 * Default: English. Auto-detects Thai users via browser locale.
 */

export type Locale = "en" | "th";

export const translations: Record<Locale, Record<string, string>> = {
  en: {
    // ── Navbar / Layout ──
    "nav.home": "Home",
    "nav.transcribe": "Transcribe",
    "nav.dashboard": "Dashboard",
    "nav.pricing": "Pricing",
    "nav.affiliate": "Affiliate",
    "nav.login": "Login",
    "nav.signOut": "Sign Out",

    // ── Home ──
    "home.badge": "⚡ Powered by WhisperX AI",
    "home.title1": "Convert Audio to Subtitles",
    "home.title2": "with AI in Seconds",
    "home.desc": "Upload an audio or video file — get transcript JSON, SRT, TXT and TikTok-style .ASS subtitles ready to use instantly",
    "home.cta": "🚀 Start Transcribing Free",
    "home.pricing": "💎 View Pricing",
    "home.feat1.title": "High-Accuracy Transcription",
    "home.feat1.desc": "Uses WhisperX with word-level timestamps for precise alignment",
    "home.feat2.title": "TikTok-Style ASS Subtitles",
    "home.feat2.desc": "Generate word-by-word or pause-split subtitles in portrait or landscape",
    "home.feat3.title": "15+ Languages Supported",
    "home.feat3.desc": "Thai, English, Chinese, Japanese, Korean and more with Auto-detect",
    "home.feat4.title": "Fast, Pay-Per-Use",
    "home.feat4.desc": "No monthly subscription — buy credits and pay by actual minutes used",
    "home.feat5.title": "Align Mode",
    "home.feat5.desc": "Already have a script? Let AI match timestamps to your audio without changing words",
    "home.feat6.title": "Multiple Export Formats",
    "home.feat6.desc": "Download as JSON, SRT, TXT or ASS — all jobs saved in your Dashboard",
    "home.bonus.title": "Sign up and get {credits} free!",
    "home.bonus.desc": "≈ 25 minutes — no credit card required",
    "home.bonus.cta": "Get Started Free →",

    // ── Login ──
    "login.title": "Sign In",
    "login.desc": "Sign in to start using FastCaption",
    "login.google": "Sign in with Google",
    "login.github": "Sign in with GitHub",
    "login.loading": "Signing in...",
    "login.terms": "By signing in you agree to our Terms of Service",
    "login.bonus": "New users get {credits} free!",

    // ── Dashboard ──
    "dash.greeting": "Hello, {name} 👋",
    "dash.subtitle": "Your Dashboard",
    "dash.credits": "Credits Remaining",
    "dash.totalJobs": "Total Jobs",
    "dash.creditsUsed": "Credits Used",
    "dash.newTranscribe": "🎵 New Transcription",
    "dash.recentJobs": "📋 Recent Jobs",
    "dash.noJobs": "No jobs yet — ",
    "dash.startTranscribe": "start transcribing",
    "dash.recentTx": "💰 Recent Transactions",
    "dash.noTx": "No transactions yet",
    "dash.colDesc": "Description",
    "dash.colCredits": "Credits",
    "dash.colDate": "Date",
    "dash.done": "✓ Done",
    "dash.processing": "⏳ Processing",
    "dash.failed": "✗ Failed",
    "dash.queued": "Queued",
    "dash.minutes": "{n} min",
    "dash.seconds": "{n} sec",

    // ── Pricing ──
    "price.title": "💎 Top Up Credits",
    "price.tab.card": "💳 Card / Wallet",
    "price.tab.thai": "🏦 Thai Banking",
    "price.tab.crypto": "₿ Crypto",
    "price.card.desc": "💳 Visa / Mastercard / Google Pay / Apple Pay via Stripe",
    "price.intlFee": "+{pct}% international fee",
    "price.buyNow": "Buy Now",
    "price.popular": "Popular",
    "price.bonus": "New users get 5,000 credits free!",
    "price.neverExpire": "Credits never expire · No monthly subscription · Pay per use",
    "price.poweredBy": "Powered by Stripe · Omise · NOWPayments",
    "price.approxMin": "≈ {n} min",
    "price.approxHrs": "≈ {n} hrs",
    "price.inclFee": "incl. {pct}% intl fee",
    "price.selectMethod": "Select Payment Method",
    "price.selectCrypto": "Select Cryptocurrency",
    "price.processing": "Processing...",
    "price.redirecting": "Redirecting to payment...",

    // ── Transcribe ──
    "tx.title": "🎵 Transcribe",
    "tx.desc": "Upload an audio or video file to convert to text with ASS Subtitles",
    "tx.modeTranscribe": "🔍 Transcribe",
    "tx.modeAlign": "🔗 Align Script",
    "tx.dropzone": "Drag & drop audio/video here or click to upload",
    "tx.dropzoneHint": "MP3, WAV, M4A, MP4, MKV, etc. — max 50 MB",
    "tx.changeFile": "click to change",
    "tx.language": "🌐 Language",
    "tx.scriptLabel": "📝 Script Text",
    "tx.scriptPlaceholder": "Paste your script here...",
    "tx.submit": "🚀 Start Transcribe",
    "tx.submitAlign": "🚀 Start Align",
    "tx.uploading": "Uploading file...",
    "tx.converting": "🎬 Converting...",
    "tx.convertFailed": "❌ Conversion failed — try using an MP3 file",
    "tx.unsupported": "❌ File type {ext} not supported — use audio/video files only",
    "tx.creditsLow": "❌ Insufficient credits — need {needed} credits (balance: {balance})",
    "tx.processing": "⏳ Processing... ({sec}s, using {credits} credits)",
    "tx.success": "✅ Done! Used {credits} credits (remaining: {balance})",
    "tx.failed": "❌ Failed: {error}\n\n💰 Credits refunded",
    "tx.assTitle": "🎬 ASS Subtitle Generator",
    "tx.assDesc": "Convert transcription result to styled subtitle file",
    "tx.assFromJob": "Select from completed jobs:",
    "tx.assFromJson": "📁 Upload JSON to convert to ASS (free, no credits needed)",
    "tx.assMode": "Subtitle Mode",
    "tx.assPause": "Split by pauses",
    "tx.assPauseDesc": "For general subtitles",
    "tx.assWord": "Word-by-Word",
    "tx.assWordDesc": "For TikTok / Reels highlight style",
    "tx.assSmart": "Smart Split",
    "tx.assSmartDesc": "AI-optimized grouping",
    "tx.assOrientation": "Orientation",
    "tx.assPortrait": "📱 Portrait (9:16)",
    "tx.assLandscape": "🖥️ Landscape (16:9)",
    "tx.assGenerate": "🎬 Generate ASS",
    "tx.assGenerating": "Generating...",
    "tx.errorGeneral": "❌ Error: {error}",
    "tx.processingStatus": "⏳ {mode}... ({dur}s, {cred} credits)",
    "tx.jobFailed": "❌ Failed: {err}\n\n💰 Credits refunded",
    "tx.errorDownload": "❌ Download failed: {err}",
    "tx.noSegments": "❌ No segments data found",
    "tx.success": "✅ Done! Used {cred} credits (remaining: {bal})",

    // ── Affiliate ──
    "aff.title": "Affiliate Program",
    "aff.desc": "Refer FastCaption to friends — earn {pct}% commission for life on every credit purchase from your referral link",
    "aff.benefits": "Benefits",
    "aff.b1": "{pct}% commission on every purchase, for life",
    "aff.b2": "Personal referral link + tracking dashboard",
    "aff.b3": "View clicks, sign-ups, commissions in real-time",
    "aff.b4": "Withdraw when balance reaches ฿{amount}",
    "aff.b5": "30-day cookie — earn even if they sign up later",
    "aff.activate": "🚀 Activate Affiliate",
    "aff.activating": "Activating...",
    "aff.dashboard": "🤝 Affiliate Dashboard",
    "aff.dashDesc": "Track your FastCaption referral results",
    "aff.yourLink": "Your Referral Link",
    "aff.copy": "📋 Copy",
    "aff.copied": "✓ Copied",
    "aff.clicks": "Clicks",
    "aff.signups": "Sign-ups",
    "aff.pending": "Pending",
    "aff.totalEarned": "Total Earned",
    "aff.withdraw": "💸 Withdraw (฿{amount})",
    "aff.withdrawTitle": "Request Withdrawal",
    "aff.methodPromptpay": "PromptPay",
    "aff.methodBank": "Bank Transfer",
    "aff.accountInfo": "Account Info (number/phone)",
    "aff.submitWithdraw": "Submit Request",
    "aff.submitting": "Submitting...",
    "aff.recentComm": "Recent Commissions",
    "aff.payoutHistory": "Payout History",
    "aff.noComm": "No commissions yet",
    "aff.noPayouts": "No payouts yet",
  },

  th: {
    // ── Navbar / Layout ──
    "nav.home": "Home",
    "nav.transcribe": "Transcribe",
    "nav.dashboard": "Dashboard",
    "nav.pricing": "Pricing",
    "nav.affiliate": "Affiliate",
    "nav.login": "เข้าสู่ระบบ",
    "nav.signOut": "ออกจากระบบ",

    // ── Home ──
    "home.badge": "⚡ Powered by WhisperX AI",
    "home.title1": "แปลงเสียงเป็นซับไทเทิล",
    "home.title2": "ด้วย AI ในไม่กี่วินาที",
    "home.desc": "อัพโหลดไฟล์เสียงหรือวิดีโอ — รับ transcript JSON, SRT, TXT และ ซับ .ASS สไตล์ TikTok พร้อมใช้ทันที",
    "home.cta": "🚀 เริ่ม Transcribe ฟรี",
    "home.pricing": "💎 ดูราคา",
    "home.feat1.title": "Transcribe ถูกต้องสูง",
    "home.feat1.desc": "ใช้ WhisperX ร่วมกับ word-level timestamps สำหรับการ align ที่แม่นยำ",
    "home.feat2.title": "ซับ ASS สไตล์ TikTok",
    "home.feat2.desc": "สร้างซับไทเทิลแบบ word-by-word หรือ pause-split ทั้งแนวตั้งและแนวนอน",
    "home.feat3.title": "รองรับ 15+ ภาษา",
    "home.feat3.desc": "ไทย, อังกฤษ, จีน, ญี่ปุ่น, เกาหลี และอีกมาก พร้อม Auto-detect",
    "home.feat4.title": "เร็ว คิดตามจริง",
    "home.feat4.desc": "ไม่มีค่าสมัครรายเดือน — ซื้อ credits ใช้ตามจำนวนนาทีจริง",
    "home.feat5.title": "Align Mode",
    "home.feat5.desc": "มีบทพูดอยู่แล้ว? ให้ AI จับ timestamp ให้ตรงกับเสียงโดยไม่ผิดคำ",
    "home.feat6.title": "Export หลายรูปแบบ",
    "home.feat6.desc": "ดาวน์โหลดเป็น JSON, SRT, TXT หรือ ASS — ทุกงานเก็บใน Dashboard",
    "home.bonus.title": "สมัครใหม่รับ {credits} credits ฟรี!",
    "home.bonus.desc": "≈ 25 นาที — ไม่ต้องใส่บัตรเครดิต",
    "home.bonus.cta": "เริ่มใช้งานฟรี →",

    // ── Login ──
    "login.title": "เข้าสู่ระบบ",
    "login.desc": "เข้าสู่ระบบเพื่อเริ่มใช้งาน FastCaption",
    "login.google": "เข้าสู่ระบบด้วย Google",
    "login.github": "เข้าสู่ระบบด้วย GitHub",
    "login.loading": "กำลังเข้าสู่ระบบ...",
    "login.terms": "การเข้าสู่ระบบถือว่าคุณยอมรับ Terms of Service",
    "login.bonus": "สมัครใหม่รับ {credits} ฟรี!",

    // ── Dashboard ──
    "dash.greeting": "สวัสดี, {name} 👋",
    "dash.subtitle": "Dashboard ของคุณ",
    "dash.credits": "Credits คงเหลือ",
    "dash.totalJobs": "งานทั้งหมด",
    "dash.creditsUsed": "Credits ที่ใช้ไป",
    "dash.newTranscribe": "🎵 Transcribe ไฟล์ใหม่",
    "dash.recentJobs": "📋 งานล่าสุด",
    "dash.noJobs": "ยังไม่มีงาน — ",
    "dash.startTranscribe": "เริ่ม transcribe",
    "dash.recentTx": "💰 ธุรกรรมล่าสุด",
    "dash.noTx": "ยังไม่มีธุรกรรม",
    "dash.colDesc": "รายการ",
    "dash.colCredits": "Credits",
    "dash.colDate": "วันที่",
    "dash.done": "✓ สำเร็จ",
    "dash.processing": "⏳ กำลังทำ",
    "dash.failed": "✗ ล้มเหลว",
    "dash.queued": "รอคิว",
    "dash.minutes": "{n} นาที",
    "dash.seconds": "{n} วินาที",

    // ── Pricing ──
    "price.title": "💎 เติม Credits",
    "price.tab.card": "💳 Card / Wallet",
    "price.tab.thai": "🏦 Thai Banking",
    "price.tab.crypto": "₿ Crypto",
    "price.card.desc": "💳 Visa / Mastercard / Google Pay / Apple Pay ผ่าน Stripe",
    "price.intlFee": "+{pct}% international fee",
    "price.buyNow": "ซื้อเลย",
    "price.popular": "แนะนำ",
    "price.bonus": "สมัครใหม่ได้รับ 5,000 credits ฟรี!",
    "price.neverExpire": "Credits ไม่มีวันหมดอายุ · ไม่มีค่าสมัครรายเดือน · คิดตามการใช้จริง",
    "price.poweredBy": "Powered by Stripe · Omise · NOWPayments",
    "price.approxMin": "≈ {n} นาที",
    "price.approxHrs": "≈ {n} ชั่วโมง",
    "price.inclFee": "incl. {pct}% intl fee",
    "price.selectMethod": "เลือกช่องทางชำระเงิน",
    "price.selectCrypto": "เลือกเหรียญ",
    "price.processing": "กำลังดำเนินการ...",
    "price.redirecting": "กำลังเปิดหน้าชำระเงิน...",

    // ── Transcribe ──
    "tx.title": "🎵 Transcribe",
    "tx.desc": "อัพโหลดไฟล์เสียงหรือวิดีโอเพื่อแปลงเป็นข้อความ พร้อมสร้าง ASS Subtitle",
    "tx.modeTranscribe": "🔍 Transcribe",
    "tx.modeAlign": "🔗 Align บทพูด",
    "tx.dropzone": "ลากไฟล์มาวางตรงนี้ หรือคลิกเพื่ออัพโหลด",
    "tx.dropzoneHint": "MP3, WAV, M4A, MP4, MKV ฯลฯ — ไม่เกิน 50 MB",
    "tx.changeFile": "คลิกเพื่อเปลี่ยนไฟล์",
    "tx.language": "🌐 ภาษา",
    "tx.scriptLabel": "📝 บทพูด",
    "tx.scriptPlaceholder": "วางบทพูดตรงนี้...",
    "tx.submit": "🚀 เริ่ม Transcribe",
    "tx.submitAlign": "🚀 เริ่ม Align",
    "tx.uploading": "กำลังอัพโหลดไฟล์...",
    "tx.converting": "🎬 กำลังแปลงไฟล์...",
    "tx.convertFailed": "❌ แปลงไฟล์ไม่สำเร็จ — ลองใช้ไฟล์ MP3 แทน",
    "tx.unsupported": "❌ ไฟล์ {ext} ไม่รองรับ — ใช้ไฟล์เสียง/วิดีโอเท่านั้น",
    "tx.creditsLow": "❌ Credits ไม่พอ — ต้องใช้ {needed} credits (คงเหลือ {balance})",
    "tx.processing": "⏳ กำลัง transcribe... ({sec} วินาที, ใช้ {credits} credits)",
    "tx.success": "✅ สำเร็จ! ใช้ {credits} credits (คงเหลือ {balance})",
    "tx.failed": "❌ ล้มเหลว: {error}\n\n💰 Credits ได้คืนแล้ว",
    "tx.assTitle": "🎬 ASS Subtitle Generator",
    "tx.assDesc": "แปลงผลการ transcribe เป็นไฟล์ซับไทเทิลสไตล์ TikTok",
    "tx.assFromJob": "เลือกจากงานที่เสร็จแล้ว:",
    "tx.assFromJson": "📁 อัพโหลด JSON เพื่อแปลงเป็น ASS (ฟรี ไม่ใช้ credits)",
    "tx.assMode": "รูปแบบซับ",
    "tx.assPause": "แบ่งตามจังหวะหยุดพูด",
    "tx.assPauseDesc": "เหมาะกับซับไทเทิลทั่วไป",
    "tx.assWord": "ทีละคำ (Word-by-Word)",
    "tx.assWordDesc": "เหมาะกับ TikTok / Reels แบบเน้นคำ",
    "tx.assSmart": "Smart Split",
    "tx.assSmartDesc": "AI จัดกลุ่มคำอัตโนมัติ",
    "tx.assOrientation": "ทิศทาง",
    "tx.assPortrait": "📱 แนวตั้ง (9:16)",
    "tx.assLandscape": "🖥️ แนวนอน (16:9)",
    "tx.assGenerate": "🎬 สร้าง ASS",
    "tx.assGenerating": "กำลังสร้าง...",
    "tx.errorGeneral": "❌ เกิดข้อผิดพลาด: {error}",
    "tx.processingStatus": "⏳ กำลัง {mode}... ({dur} วินาที, ใช้ {cred} credits)",
    "tx.jobFailed": "❌ ล้มเหลว: {err}\n\n💰 Credits ได้คืนแล้ว",
    "tx.errorDownload": "❌ ดาวน์โหลดล้มเหลว: {err}",
    "tx.noSegments": "❌ ไม่มีข้อมูล segments",
    "tx.success": "✅ สำเร็จ! ใช้ {cred} credits (คงเหลือ {bal})",

    // ── Affiliate ──
    "aff.title": "Affiliate Program",
    "aff.desc": "แนะนำ FastCaption ให้เพื่อน — รับค่าคอมมิชชั่น {pct}% ตลอดชีพ จากทุกการซื้อ credits ของคนที่สมัครผ่านลิงก์ของคุณ",
    "aff.benefits": "สิทธิประโยชน์",
    "aff.b1": "ค่าคอม {pct}% จากทุกยอดซื้อ ตลอดชีพ",
    "aff.b2": "ลิงก์ referral ส่วนตัว + dashboard ติดตามผล",
    "aff.b3": "ดู clicks, sign-ups, commissions แบบ real-time",
    "aff.b4": "เบิกเงินได้เมื่อยอดสะสมถึง ฿{amount}",
    "aff.b5": "Cookie 30 วัน — ได้ค่าคอมแม้คนสมัครทีหลัง",
    "aff.activate": "🚀 เปิดใช้งาน Affiliate",
    "aff.activating": "กำลังเปิดใช้งาน...",
    "aff.dashboard": "🤝 Affiliate Dashboard",
    "aff.dashDesc": "ติดตามผลลัพธ์จากการแนะนำ FastCaption",
    "aff.yourLink": "ลิงก์แนะนำของคุณ",
    "aff.copy": "📋 คัดลอก",
    "aff.copied": "✓ คัดลอกแล้ว",
    "aff.clicks": "Clicks",
    "aff.signups": "สมัครใหม่",
    "aff.pending": "รอเบิก",
    "aff.totalEarned": "รายได้ทั้งหมด",
    "aff.withdraw": "💸 ขอเบิกเงิน (฿{amount})",
    "aff.withdrawTitle": "ขอเบิกเงิน",
    "aff.methodPromptpay": "PromptPay",
    "aff.methodBank": "โอนเข้าบัญชี",
    "aff.accountInfo": "เลขบัญชี / เบอร์โทร",
    "aff.submitWithdraw": "ส่งคำขอ",
    "aff.submitting": "กำลังส่ง...",
    "aff.recentComm": "Commission ล่าสุด",
    "aff.payoutHistory": "ประวัติการเบิก",
    "aff.noComm": "ยังไม่มี commission",
    "aff.noPayouts": "ยังไม่มีการเบิก",
  },
};

/**
 * Simple template function — replaces {key} with values
 * Example: tpl("Hello {name}", { name: "Bob" }) → "Hello Bob"
 */
export function tpl(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

/**
 * Detect locale from browser or Accept-Language header
 */
export function detectLocale(acceptLanguage?: string | null): Locale {
  if (typeof window !== "undefined") {
    // Client-side: check localStorage first, then browser language
    const saved = localStorage.getItem("fastcaption-locale");
    if (saved === "th" || saved === "en") return saved;
    return navigator.language.startsWith("th") ? "th" : "en";
  }
  // Server-side: parse Accept-Language header
  if (acceptLanguage && acceptLanguage.includes("th")) return "th";
  return "en";
}

/**
 * Create a translation function for a given locale
 */
export function createT(locale: Locale) {
  const dict = translations[locale];
  return (key: string, vars?: Record<string, string | number>): string => {
    const val = dict[key] || translations.en[key] || key;
    return vars ? tpl(val, vars) : val;
  };
}
