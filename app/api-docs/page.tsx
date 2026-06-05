"use client";

import { useState } from "react";
import Link from "next/link";
import "./api-docs.css";

/* ── Reusable Code Block with Tabs ── */
function CodeBlock({
  tabs,
  defaultTab = 0,
}: {
  tabs: { label: string; code: string }[];
  defaultTab?: number;
}) {
  const [active, setActive] = useState(defaultTab);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(tabs[active].code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block-wrapper">
      {tabs.length > 1 && (
        <div className="code-tabs">
          {tabs.map((t, i) => (
            <button
              key={t.label}
              className={`code-tab ${i === active ? "active" : ""}`}
              onClick={() => setActive(i)}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      <div className={`code-block ${tabs.length <= 1 ? "no-tabs" : ""}`}>
        <button className={`copy-btn ${copied ? "copied" : ""}`} onClick={copy}>
          {copied ? "✓ Copied" : "Copy"}
        </button>
        <pre>{tabs[active].code}</pre>
      </div>
    </div>
  );
}

/* ── Data ── */
const transcribeParams = [
  { name: "audio", type: "File", required: true, desc: "Audio or video file (MP3, WAV, M4A, MP4, etc.). Max 50MB." },
  { name: "language", type: "string", required: false, desc: 'Language code, e.g. "th", "en", "ja", "ko", "zh". Default: "th"' },
  { name: "mode", type: "string", required: false, desc: '"transcribe" (default) or "align" — align requires scriptText' },
  { name: "scriptText", type: "string", required: false, desc: "Your own transcript text. Required when mode is \"align\"" },
  { name: "timestampMode", type: "string", required: false, desc: '"chunk" (default) or "word" — word-level timestamps' },
  { name: "assMaxChars", type: "number", required: false, desc: "Max characters per subtitle line. Default: 24" },
  { name: "assMode", type: "string", required: false, desc: '"smart" (default), "pause", or "word" — subtitle splitting mode' },
  { name: "assOrientation", type: "string", required: false, desc: '"portrait" (default) or "landscape"' },
];

const assParams = [
  { name: "jsonFile", type: "File", required: true, desc: "JSON file from transcription result (multipart mode)" },
  { name: "json", type: "object", required: true, desc: "JSON body with segments (JSON mode)" },
  { name: "assMode", type: "string", required: false, desc: '"smart" (default), "pause", or "word"' },
  { name: "orientation", type: "string", required: false, desc: '"portrait" (default) or "landscape"' },
  { name: "maxChars", type: "number", required: false, desc: "Max characters per line. Default: 24" },
  { name: "language", type: "string", required: false, desc: 'Language code. Default: "th"' },
];

const errorCodes = [
  { code: "200", cls: "s2xx", meaning: "Success — transcription result returned", context: "Successful request" },
  { code: "400", cls: "s4xx", meaning: "Bad Request — missing or invalid parameters", context: "Missing audio file, invalid JSON, etc." },
  { code: "401", cls: "s4xx", meaning: "Unauthorized — invalid or missing API key", context: "No Bearer token or invalid key" },
  { code: "402", cls: "s4xx", meaning: "Payment Required — insufficient credits", context: "Top up credits to continue" },
  { code: "500", cls: "s5xx", meaning: "Internal Server Error — transcription failed", context: "Server error, credits refunded" },
];

const transcribeExamples = [
  {
    label: "cURL",
    code: `curl -X POST https://fastcaption.app/api/v1/transcribe \\
  -H "Authorization: Bearer fc-YOUR_API_KEY" \\
  -F "audio=@./my-audio.mp3" \\
  -F "language=th" \\
  -F "timestampMode=word"`,
  },
  {
    label: "Python",
    code: `import requests

url = "https://fastcaption.app/api/v1/transcribe"
headers = {"Authorization": "Bearer fc-YOUR_API_KEY"}

with open("my-audio.mp3", "rb") as f:
    response = requests.post(
        url,
        headers=headers,
        files={"audio": f},
        data={
            "language": "th",
            "timestampMode": "word",
        },
    )

result = response.json()
print(result["result"]["segments"])`,
  },
  {
    label: "JavaScript",
    code: `const form = new FormData();
form.append("audio", fs.createReadStream("./my-audio.mp3"));
form.append("language", "th");
form.append("timestampMode", "word");

const response = await fetch(
  "https://fastcaption.app/api/v1/transcribe",
  {
    method: "POST",
    headers: {
      Authorization: "Bearer fc-YOUR_API_KEY",
    },
    body: form,
  }
);

const data = await response.json();
console.log(data.result.segments);`,
  },
  {
    label: "Node.js",
    code: `import fs from "fs";
import FormData from "form-data";

const form = new FormData();
form.append("audio", fs.createReadStream("./my-audio.mp3"));
form.append("language", "th");
form.append("timestampMode", "word");

const res = await fetch(
  "https://fastcaption.app/api/v1/transcribe",
  {
    method: "POST",
    headers: {
      Authorization: "Bearer fc-YOUR_API_KEY",
      ...form.getHeaders(),
    },
    body: form,
  }
);

const data = await res.json();
console.log(data.result);`,
  },
];

const assExamples = [
  {
    label: "cURL",
    code: `curl -X POST https://fastcaption.app/api/v1/ass \\
  -H "Authorization: Bearer fc-YOUR_API_KEY" \\
  -F "jsonFile=@./result.json" \\
  -F "assMode=smart" \\
  -F "orientation=portrait" \\
  -F "maxChars=24"`,
  },
  {
    label: "Python",
    code: `import requests

url = "https://fastcaption.app/api/v1/ass"
headers = {"Authorization": "Bearer fc-YOUR_API_KEY"}

# Option 1: Upload JSON file
with open("result.json", "rb") as f:
    response = requests.post(
        url,
        headers=headers,
        files={"jsonFile": f},
        data={"assMode": "smart", "orientation": "portrait"},
    )

# Option 2: Send JSON body
response = requests.post(
    url,
    headers={**headers, "Content-Type": "application/json"},
    json={
        "json": transcription_result,
        "assMode": "smart",
        "orientation": "portrait",
    },
)

ass_content = response.json()["ass"]
with open("output.ass", "w") as f:
    f.write(ass_content)`,
  },
  {
    label: "JavaScript",
    code: `// Option 1: Upload JSON file
const form = new FormData();
form.append("jsonFile", jsonBlob, "result.json");
form.append("assMode", "smart");
form.append("orientation", "portrait");

const res = await fetch(
  "https://fastcaption.app/api/v1/ass",
  {
    method: "POST",
    headers: { Authorization: "Bearer fc-YOUR_API_KEY" },
    body: form,
  }
);

const { ass } = await res.json();

// Option 2: Send JSON body
const res2 = await fetch(
  "https://fastcaption.app/api/v1/ass",
  {
    method: "POST",
    headers: {
      Authorization: "Bearer fc-YOUR_API_KEY",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      json: transcriptionResult,
      assMode: "smart",
      orientation: "portrait",
    }),
  }
);`,
  },
];

const successResponse = `{
  "success": true,
  "jobId": "cm3xyz...",
  "creditsUsed": 200,
  "balanceAfter": 4800,
  "result": {
    "text": "สวัสดีครับ ยินดีต้อนรับ...",
    "segments": [
      {
        "start": 0.0,
        "end": 2.45,
        "text": "สวัสดีครับ",
        "words": [
          { "word": "สวัสดี", "start": 0.0, "end": 1.2 },
          { "word": "ครับ", "start": 1.3, "end": 2.45 }
        ]
      }
    ],
    "language": "th"
  }
}`;

const assResponse = `{
  "success": true,
  "ass": "[Script Info]\\nTitle: FastCaption...",
  "captionCount": 42
}`;

const errorResponse = `{
  "error": "Insufficient credits",
  "creditsNeeded": 500,
  "balance": 200
}`;

/* ── Page Component ── */
export default function ApiDocsPage() {
  const [baseUrlCopied, setBaseUrlCopied] = useState(false);

  const copyBaseUrl = () => {
    navigator.clipboard.writeText("https://fastcaption.app/api/v1");
    setBaseUrlCopied(true);
    setTimeout(() => setBaseUrlCopied(false), 2000);
  };

  return (
    <div className="page">
      {/* ── Hero ── */}
      <section className="api-hero">
        <div className="api-badge">✦ Production Ready</div>
        <h1 className="api-hero-title">
          FastCaption <span className="hero-gradient">API</span>
        </h1>
        <p className="api-hero-subtitle">
          Integrate AI-powered transcription and subtitle generation into your apps, bots, and workflows.
          Get word-level timestamps, multi-language support, and TikTok-style ASS subtitles via a simple REST API.
        </p>
        <div className="api-hero-actions">
          <Link href="/dashboard/api-keys" className="btn btn-primary btn-lg">
            🔑 Get API Key
          </Link>
          <a href="#endpoints" className="btn btn-secondary btn-lg">
            📖 View Endpoints
          </a>
        </div>

        <div className="api-base-url" onClick={copyBaseUrl} title="Click to copy">
          <span className="label">Base URL</span>
          <span>{baseUrlCopied ? "✓ Copied!" : "https://fastcaption.app/api/v1"}</span>
        </div>

        <div className="api-features">
          <div className="api-feature fade-in-up">
            <div className="api-feature-icon">⚡</div>
            <div className="api-feature-title">Fast Processing</div>
            <div className="api-feature-desc">10-min audio processed in ~30 seconds. GPU-accelerated WhisperX.</div>
          </div>
          <div className="api-feature fade-in-up">
            <div className="api-feature-icon">🌍</div>
            <div className="api-feature-title">15+ Languages</div>
            <div className="api-feature-desc">Thai, English, Japanese, Korean, Chinese, and more with auto-detection.</div>
          </div>
          <div className="api-feature fade-in-up">
            <div className="api-feature-icon">💰</div>
            <div className="api-feature-title">Pay Per Use</div>
            <div className="api-feature-desc">No subscriptions. Credits never expire. Start free with 5,000 credits.</div>
          </div>
        </div>
      </section>

      <div className="container">
        <div className="api-layout">
          {/* ── Main Content ── */}
          <div>
            {/* ── Quick Start ── */}
            <section className="api-section" id="quickstart">
              <h2 className="api-section-title">🚀 Quick Start</h2>
              <p className="api-section-desc">
                Get up and running with the FastCaption API in under 2 minutes.
              </p>

              <div className="api-steps">
                <div className="api-step fade-in-up">
                  <div className="api-step-num">1</div>
                  <div className="api-step-title">Get Your API Key</div>
                  <div className="api-step-desc">
                    Go to <Link href="/dashboard/api-keys" style={{ color: "var(--accent-light)" }}>Dashboard → API Keys</Link> and create a new key. Save it securely.
                  </div>
                </div>
                <div className="api-step fade-in-up">
                  <div className="api-step-num">2</div>
                  <div className="api-step-title">Send a Request</div>
                  <div className="api-step-desc">
                    Upload audio via <code className="api-inline-code">POST /api/v1/transcribe</code> with your API key as Bearer token.
                  </div>
                </div>
                <div className="api-step fade-in-up">
                  <div className="api-step-num">3</div>
                  <div className="api-step-title">Get Results</div>
                  <div className="api-step-desc">
                    Receive JSON with word-level timestamps, or generate ASS subtitles directly.
                  </div>
                </div>
              </div>

              <CodeBlock
                tabs={[
                  {
                    label: "Quick Test",
                    code: `curl -X POST https://fastcaption.app/api/v1/transcribe \\
  -H "Authorization: Bearer fc-YOUR_API_KEY" \\
  -F "audio=@./test.mp3" \\
  -F "language=th"`,
                  },
                ]}
              />
            </section>

            <div className="api-divider" />

            {/* ── Authentication ── */}
            <section className="api-section" id="authentication">
              <h2 className="api-section-title">🔐 Authentication</h2>
              <p className="api-section-desc">
                All API requests require a valid API key sent as a Bearer token in the Authorization header.
              </p>

              <div className="auth-box">
                <h3>🔑 Authorization Header</h3>
                <p>
                  Include your API key in every request using the <code className="api-inline-code">Authorization</code> header:
                </p>
                <CodeBlock
                  tabs={[
                    {
                      label: "Header",
                      code: `Authorization: Bearer fc-YOUR_API_KEY`,
                    },
                  ]}
                />
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  ⚠️ Keep your API key secret. Do not expose it in client-side code or public repositories.
                  If compromised, delete the key immediately from your Dashboard and create a new one.
                </p>
              </div>
            </section>

            <div className="api-divider" />

            {/* ── Endpoints ── */}
            <section className="api-section" id="endpoints">
              <h2 className="api-section-title">📡 Endpoints</h2>
              <p className="api-section-desc">
                Two endpoints available — transcription (uses credits) and ASS generation (free).
              </p>

              {/* Transcribe Endpoint */}
              <div className="endpoint-card" id="transcribe">
                <div className="endpoint-header">
                  <span className="endpoint-method post">POST</span>
                  <span className="endpoint-path">/api/v1/transcribe</span>
                  <span className="endpoint-badge credits">Uses Credits</span>
                </div>
                <div className="endpoint-body">
                  <p className="endpoint-desc">
                    Upload an audio or video file and receive a transcription with word-level timestamps.
                    Supports both transcription (auto-detect speech) and alignment (match your script to audio).
                    Credits are deducted based on audio duration. Failed jobs are automatically refunded.
                  </p>

                  <div className="params-title">Request Body (multipart/form-data)</div>
                  <div style={{ overflowX: "auto" }}>
                    <table className="params-table">
                      <thead>
                        <tr>
                          <th>Parameter</th>
                          <th>Type</th>
                          <th>Required</th>
                          <th>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transcribeParams.map((p) => (
                          <tr key={p.name}>
                            <td><span className="param-name">{p.name}</span></td>
                            <td><span className="param-type">{p.type}</span></td>
                            <td>
                              <span className={`param-required ${p.required ? "yes" : "no"}`}>
                                {p.required ? "Required" : "Optional"}
                              </span>
                            </td>
                            <td style={{ color: "var(--text-secondary)", fontSize: "0.84rem" }}>{p.desc}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="params-title" style={{ marginTop: "24px" }}>Code Examples</div>
                  <CodeBlock tabs={transcribeExamples} />

                  <div className="response-label">
                    <span className="dot success" /> Success Response (200)
                  </div>
                  <CodeBlock tabs={[{ label: "JSON", code: successResponse }]} />

                  <div className="response-label">
                    <span className="dot error" /> Error Response (402)
                  </div>
                  <CodeBlock tabs={[{ label: "JSON", code: errorResponse }]} />
                </div>
              </div>

              {/* ASS Endpoint */}
              <div className="endpoint-card" id="ass">
                <div className="endpoint-header">
                  <span className="endpoint-method post">POST</span>
                  <span className="endpoint-path">/api/v1/ass</span>
                  <span className="endpoint-badge free">Free — No Credits</span>
                </div>
                <div className="endpoint-body">
                  <p className="endpoint-desc">
                    Convert a transcription JSON (from the transcribe endpoint) into a TikTok-style ASS subtitle file.
                    This endpoint is free — no credits are consumed. It runs CPU-only processing.
                    Accepts either a JSON file upload (multipart) or a JSON body.
                  </p>

                  <div className="params-title">Request Body</div>
                  <div style={{ overflowX: "auto" }}>
                    <table className="params-table">
                      <thead>
                        <tr>
                          <th>Parameter</th>
                          <th>Type</th>
                          <th>Required</th>
                          <th>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assParams.map((p) => (
                          <tr key={p.name}>
                            <td><span className="param-name">{p.name}</span></td>
                            <td><span className="param-type">{p.type}</span></td>
                            <td>
                              <span className={`param-required ${p.required ? "yes" : "no"}`}>
                                {p.required ? "Required*" : "Optional"}
                              </span>
                            </td>
                            <td style={{ color: "var(--text-secondary)", fontSize: "0.84rem" }}>{p.desc}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "24px" }}>
                    * Either <code className="api-inline-code">jsonFile</code> (multipart upload) or{" "}
                    <code className="api-inline-code">json</code> (JSON body) is required — not both.
                  </p>

                  <div className="params-title">Code Examples</div>
                  <CodeBlock tabs={assExamples} />

                  <div className="response-label">
                    <span className="dot success" /> Success Response (200)
                  </div>
                  <CodeBlock tabs={[{ label: "JSON", code: assResponse }]} />
                </div>
              </div>
            </section>

            <div className="api-divider" />

            {/* ── Error Codes ── */}
            <section className="api-section" id="errors">
              <h2 className="api-section-title">⚠️ Error Codes</h2>
              <p className="api-section-desc">
                Standard HTTP status codes are used. All error responses include a JSON body with an <code className="api-inline-code">error</code> field.
              </p>

              <div style={{ overflowX: "auto" }}>
                <table className="error-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Meaning</th>
                      <th>Common Cause</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errorCodes.map((e) => (
                      <tr key={e.code}>
                        <td><span className={`status-code ${e.cls}`}>{e.code}</span></td>
                        <td style={{ color: "var(--text-secondary)" }}>{e.meaning}</td>
                        <td style={{ color: "var(--text-muted)", fontSize: "0.84rem" }}>{e.context}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="api-divider" />

            {/* ── Credits & Pricing ── */}
            <section className="api-section" id="pricing">
              <h2 className="api-section-title">💳 Credits & Pricing</h2>
              <p className="api-section-desc">
                The API uses the same credit system as the web app. Credits are deducted based on audio duration.
              </p>

              <div className="credits-info">
                <h3>📊 How Credits Work</h3>
                <p>
                  Credits are calculated per second of audio. The formula is:
                </p>
                <div className="credits-formula">
                  credits = ceil(duration_seconds × 1000 / 300)
                </div>
                <p style={{ marginTop: "16px" }}>
                  This means <strong>1,000 credits ≈ 5 minutes</strong> of audio.
                  New accounts get <strong>5,000 free credits</strong> (~25 minutes).
                </p>

                <div style={{ marginTop: "24px" }}>
                  <div style={{ overflowX: "auto" }}>
                    <table className="params-table" style={{ maxWidth: "500px" }}>
                      <thead>
                        <tr>
                          <th>Audio Duration</th>
                          <th>Credits Used</th>
                          <th>Cost (THB)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>1 minute</td>
                          <td style={{ color: "var(--accent-light)" }}>200</td>
                          <td style={{ color: "var(--text-muted)" }}>~฿4</td>
                        </tr>
                        <tr>
                          <td>5 minutes</td>
                          <td style={{ color: "var(--accent-light)" }}>1,000</td>
                          <td style={{ color: "var(--text-muted)" }}>~฿20</td>
                        </tr>
                        <tr>
                          <td>30 minutes</td>
                          <td style={{ color: "var(--accent-light)" }}>6,000</td>
                          <td style={{ color: "var(--text-muted)" }}>~฿120</td>
                        </tr>
                        <tr>
                          <td>1 hour</td>
                          <td style={{ color: "var(--accent-light)" }}>12,000</td>
                          <td style={{ color: "var(--text-muted)" }}>~฿240</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <p style={{ marginTop: "16px" }}>
                  The <strong>/api/v1/ass</strong> endpoint is completely free — no credits needed.
                  <br />
                  Failed transcriptions are <strong>automatically refunded</strong>.
                  <br />
                  <Link href="/pricing" style={{ color: "var(--accent-light)" }}>
                    View credit packs →
                  </Link>
                </p>
              </div>
            </section>

            <div className="api-divider" />

            {/* ── Rate Limits ── */}
            <section className="api-section" id="limits">
              <h2 className="api-section-title">🛡️ Rate Limits</h2>
              <p className="api-section-desc">
                The API is rate-limited by your credit balance. There are no per-minute request limits,
                but the following constraints apply:
              </p>

              <div className="auth-box">
                <div style={{ display: "grid", gap: "16px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                    <span style={{ fontSize: "1.2rem" }}>📁</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.92rem", marginBottom: "4px" }}>Max File Size</div>
                      <div style={{ fontSize: "0.86rem", color: "var(--text-secondary)" }}>50MB per upload</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                    <span style={{ fontSize: "1.2rem" }}>🔑</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.92rem", marginBottom: "4px" }}>API Keys</div>
                      <div style={{ fontSize: "0.86rem", color: "var(--text-secondary)" }}>Up to 5 keys per account</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                    <span style={{ fontSize: "1.2rem" }}>⏱️</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.92rem", marginBottom: "4px" }}>Concurrent Requests</div>
                      <div style={{ fontSize: "0.86rem", color: "var(--text-secondary)" }}>Requests are processed sequentially per user. For batch processing, send requests one at a time.</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                    <span style={{ fontSize: "1.2rem" }}>🎧</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.92rem", marginBottom: "4px" }}>Supported Formats</div>
                      <div style={{ fontSize: "0.86rem", color: "var(--text-secondary)" }}>MP3, WAV, M4A, AAC, FLAC, OGG, WEBM, MP4, MOV, and more</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className="api-divider" />

            {/* ── CTA ── */}
            <section className="api-section" style={{ textAlign: "center", paddingBottom: "80px" }}>
              <div className="cta-banner">
                <h2 className="section-title">Ready to build?</h2>
                <p>
                  Get your API key and start integrating FastCaption into your workflow today.
                  5,000 free credits included with every account.
                </p>
                <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
                  <Link href="/dashboard/api-keys" className="btn btn-primary btn-lg">
                    🔑 Create API Key
                  </Link>
                  <Link href="/pricing" className="btn btn-secondary btn-lg">
                    💰 View Pricing
                  </Link>
                </div>
              </div>
            </section>
          </div>

          {/* ── Sidebar TOC ── */}
          <aside className="api-toc">
            <div className="api-toc-title">On This Page</div>
            <a href="#quickstart">Quick Start</a>
            <a href="#authentication">Authentication</a>
            <a href="#endpoints">Endpoints</a>
            <a href="#transcribe" style={{ paddingLeft: "12px" }}>↳ /transcribe</a>
            <a href="#ass" style={{ paddingLeft: "12px" }}>↳ /ass</a>
            <a href="#errors">Error Codes</a>
            <a href="#pricing">Credits & Pricing</a>
            <a href="#limits">Rate Limits</a>
          </aside>
        </div>
      </div>
    </div>
  );
}
