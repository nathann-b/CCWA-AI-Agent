# Utility Services Agent — Prototype

A conversational AI agent that lets residents report utility issues, check service
status, and submit work orders in natural language, and turns those conversations into
real, classified work orders in an enterprise CMMS without staff intervention.

Built as a working prototype during an enterprise data engineering internship, then
rebuilt here as a generic, de-branded demonstration.

<!-- TODO: add a GIF of the chat widget handling a leak report end-to-end. This is the
     highest-value thing you can add to this README — it shows the whole system in
     five seconds. -->
![Chat widget](docs/demo.gif)

## The Problem

Residents report leaks, main breaks, and service issues by phone. Staff transcribe those
calls into the CMMS by hand, slow, inconsistent, and unavailable after hours. This agent
handles intake conversationally on the public website and writes the work order directly.

## Architecture

```
  Resident (browser)
        │
        ▼
  Chat widget  ──────────►  Direct Line API  ──────────►  Copilot Studio Agent
  (vanilla JS)                                                    │
        ▲                                                         │  topic matches
        │                                                         ▼
        │                                              Power Automate Flow
        │                                                         │
        │                                              ┌──────────┴──────────┐
        │                                              ▼                     ▼
        │                                      Azure Key Vault        CMMS REST API
        │                                      (credentials)       (work order create)
        │                                                                    │
        └──────────── confirmation number ◄──────────────────────────────────┘
```

**Conversation → work order, end to end.** The agent collects structured fields (name,
phone, issue address, issue type, description), Power Automate maps them to the CMMS work
order schema, fires the API call, and the resident gets a confirmation number back in the
chat before the conversation ends.

## Features

**Conversation topics**

| Topic | Behavior |
|---|---|
| Report a Leak / Emergency | Collects location and details, creates a work order, flags urgency |
| Pay My Bill | Routes to the payment portal |
| Start / Stop Service | Guides to the correct form or escalates |
| Office Hours & Location | Structured answer from indexed knowledge |
| Drought Restrictions | Returns current restriction level |
| Escalate to Human | Triggered by explicit request or frustration signals |
| After-Hours | Time-of-day condition, surfaces the emergency line, sets response expectations |

**Emergency escalation.** Flooding, main breaks, and sewage backups bypass the standard
intake path and route immediately to live support with the emergency number surfaced.

**Grounded knowledge.** The agent indexes site content and uploaded documents (rate
sheets, ordinances, service policies) rather than relying on hand-authored Q&A pairs.

## The Chat Client

The widget is **dependency-free vanilla JavaScript**, no framework, no build step, one
`<script>` tag to embed. It implements the Direct Line REST protocol directly:

- **Token exchange** — trades a secret for a scoped, short-lived conversation token
- **Conversation lifecycle** — starts the conversation, fires a silent `startConversation`
  event to trigger the agent's greeting
- **Watermark-based polling** — polls activities on an interval, passing the watermark so
  each poll returns only messages since the last one
- **Quick replies** — renders `suggestedActions` as buttons, posts the action value back
- **Custom markdown renderer** — bold, italic, inline code, headings, ordered and
  unordered lists, bare URL linking, and footnote-style citation resolution
  (`[1]: url "title"` → superscript links)
- **XSS-safe rendering** — bot output is HTML-escaped *before* markdown formatting is
  applied, so agent responses can't inject markup
- **Graceful degradation** — connection failure surfaces the phone number rather than
  failing silently

## Security: Direct Line Token Handling

**This is the part worth reading.**

The naive integration embeds the Direct Line secret in client-side JavaScript and calls
`/tokens/generate` from the browser. This is wrong, and the original prototype did it:

- The secret ships to every visitor and is readable in dev tools
- A Direct Line secret is **account-scoped**, anyone holding it can mint tokens, open
  conversations, and drive usage against your agent
- It defeats the purpose of the token endpoint, which exists precisely so the secret can
  stay server-side

**The correct pattern**, implemented here:

```
Browser  ──►  /api/token  ──►  Direct Line /tokens/generate
              (your server,      (returns scoped,
               holds secret)      short-lived token)
```

The browser never sees anything long-lived. `token-server/` contains a minimal
implementation; the client's `getToken()` fetches from that endpoint instead of calling
Microsoft directly with an `Authorization: Bearer <secret>` header.

Additionally: agents with Entra/Microsoft authentication enabled on the connection will
reject the browser-side secret flow outright,  server-side exchange is the only path that
works for authenticated agents, not merely the safer one.

<!-- TODO: build token-server/ before publishing, or move this section under "Roadmap"
     and describe it as the planned fix. Don't document it as done if it isn't. -->

## Repo Structure

```
├── index.html              # Prototype site homepage
├── pages/
│   ├── report.html         # Report an issue
│   ├── pay.html            # Pay my bill
│   └── contact.html        # Contact
├── css/main.css            # Site + chat widget styles
├── js/
│   ├── main.js             # Carousel, mobile nav, calendar, form handling
│   └── chat.js             # Direct Line client + markdown renderer
├── token-server/           # Minimal token exchange endpoint
└── docs/
    ├── topics.md           # Copilot Studio topic definitions
    └── flow.md             # Power Automate flow + CMMS field mapping
```

## Running It

The site is plain HTML/CSS/JS — no build step:

```bash
git clone https://github.com/YOUR-USERNAME/municipal-services-agent.git
cd municipal-services-agent
python -m http.server 8000     # or any static server
```

Token server:

```bash
cd token-server
npm install
cp .env.example .env           # add DIRECTLINE_SECRET
npm start
```

The chat widget requires a published Copilot Studio agent and its Direct Line channel.
Without one, the site runs and the widget renders, it just can't connect.

## Tech Stack

**Frontend:** Vanilla JavaScript · HTML · CSS · Bot Framework Direct Line API
**Agent:** Microsoft Copilot Studio
**Automation:** Power Automate · Azure Key Vault · CMMS REST API
**Backend:** Node.js (token server)

## Status & Limitations

- **Prototype.** Built to demonstrate the integration pattern, not to run production traffic.
- **Safety.** No real credentials, endpoints, or internal
  configuration are present in this repository.
- **CMMS integration** assumes an externally reachable API. Where the CMMS sits behind a
  firewall, this requires an on-premises data gateway, or a mocked response for local
  development.
- **No test suite.** The Direct Line client's markdown renderer and polling logic are the
  obvious candidates.

## License

MIT
