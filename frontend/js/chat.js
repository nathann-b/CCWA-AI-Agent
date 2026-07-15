// Virtual Assistant Chat Widget
(function () {
  const widget = document.querySelector('.chat-widget');
  if (!widget) return;

  const toggle = widget.querySelector('.chat-toggle');
  const bubble = widget.querySelector('.chat-bubble');
  const closeBtn = widget.querySelector('.chat-close');
  const input = widget.querySelector('.chat-input-area input');
  const sendBtn = widget.querySelector('.chat-send');
  const messages = widget.querySelector('.chat-messages');

  // Direct Line connection settings 
  const DIRECTLINE_SECRET = ''
  let token = null; 
  let conversationId = null;
  let watermark = null;
  let pollHandle = null;
  let started = false;

  // Markdown renderer (bot messages only)
  // Handles **bold**, *italic*, bullet lists (•, -, *), numbered lists,
  function renderMarkdown(raw) {
    if (!raw) return '';
 
    // Push any inline citation defs ([n]: url) onto their own line
    let text = raw.replace(/([^\n])\[(\d+)\]:\s*(https?:\/\/\S+)/g, '$1\n[$2]: $3');
 
    // Collect and strip footnote reference definitions
    const refs = {};
    text = text.replace(
      /^\[(\d+)\]:\s*(\S+)(?:\s+"([^"]*)")?[ \t]*$/gm,
      (_, n, url, title) => { refs[n] = { url, title: title || url }; return ''; }
    );
 
    const lines = text.split('\n');
    const out = [];
    let inUL = false, inOL = false;
 
    const closeList = () => {
      if (inUL) { out.push('</ul>'); inUL = false; }
      if (inOL) { out.push('</ol>'); inOL = false; }
    };
 
    lines.forEach(line => {
      if (!line.trim()) {
        closeList();
        out.push('<div class="chat-gap"></div>');
        return;
      }
 
      // ## Heading
      const h = line.match(/^#{1,3}\s+(.*)/);
      if (h) { closeList(); out.push(`<strong class="chat-heading">${fmt(h[1], refs)}</strong>`); return; }
 
      // Unordered list: •, -, *
      const ul = line.match(/^[\u2022\-\*]\s+(.*)/);
      if (ul) {
        if (inOL) { out.push('</ol>'); inOL = false; }
        if (!inUL) { out.push('<ul class="chat-md-list">'); inUL = true; }
        out.push(`<li>${fmt(ul[1], refs)}</li>`);
        return;
      }
 
      // Ordered list: 1. 2. etc.
      const ol = line.match(/^(\d+)\.\s+(.*)/);
      if (ol) {
        if (inUL) { out.push('</ul>'); inUL = false; }
        if (!inOL) { out.push('<ol class="chat-md-list">'); inOL = true; }
        out.push(`<li>${fmt(ol[2], refs)}</li>`);
        return;
      }
 
      closeList();
      out.push(`<span class="chat-line">${fmt(line, refs)}</span>`);
    });
 
    closeList();
 
    // Collapse consecutive gap divs
    return out.join('\n')
      .replace(/(<div class="chat-gap"><\/div>\s*){2,}/g, '<div class="chat-gap"></div>')
      .replace(/^(<div class="chat-gap"><\/div>)+/, '')
      .replace(/(<div class="chat-gap"><\/div>)+$/, '');
  }
 
  // Inline formatting: bold, italic, code, citation links, bare URLs
  function fmt(text, refs) {
    // Escape HTML
    text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    // **bold**
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // *italic*
    text = text.replace(/(?<!\w)\*(.+?)\*(?!\w)/g, '<em>$1</em>');
    // `code`
    text = text.replace(/`([^`]+)`/g, '<code class="chat-code">$1</code>');
    // [label][n] linked reference
    text = text.replace(/\[([^\]]+)\]\[(\d+)\]/g, (_, label, n) => {
      const r = refs[n];
      return r ? `<a href="${r.url}" target="_blank" rel="noopener" title="${r.title}">${label}</a>` : label;
    });
    // [n] citation marker → superscript link
    text = text.replace(/\[(\d+)\]/g, (match, n) => {
      const r = refs[n];
      return r ? `<sup><a href="${r.url}" target="_blank" rel="noopener" title="${r.title}">[${n}]</a></sup>` : match;
    });
    // bare URLs
    text = text.replace(/(?<!href="|">)(https?:\/\/[^\s<"]+)/g,
      '<a href="$1" target="_blank" rel="noopener">$1</a>');
    return text;
  }

// Message rendering
  function addMessage(text, type) {
    const msg = document.createElement('div');
    msg.className = `chat-msg ${type}`;
    if (type === 'bot') {
      msg.innerHTML = renderMarkdown(text);
    } else {
      msg.innerHTML = (text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
    }
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
  }
  
  // Direct Line: exchange secret for a token
  async function getToken() {
  const res = await fetch(
    'https://directline.botframework.com/v3/directline/tokens/generate',
    { method: 'POST', headers: { 'Authorization': `Bearer ${DIRECTLINE_SECRET}` } }
  );
  const data = await res.json();

  if (!data.token) {
    throw new Error('Token generation failed: ' + JSON.stringify(data));
  }
  token = data.token;
}

// Direct Line: start a conversation
async function startConversation() {
  try {
    await getToken();

    const res = await fetch(
      'https://directline.botframework.com/v3/directline/conversations',
      { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } }
    );
    const data = await res.json();

    if (!data.conversationId) {
      throw new Error('Conversation start failed: ' + JSON.stringify(data));
    }
    conversationId = data.conversationId;
    pollHandle = setInterval(pollForReply, 1500);

    // Send a silent trigger to kick off the greeting
setTimeout(async () => {
  await fetch(
    `https://directline.botframework.com/v3/directline/conversations/${conversationId}/activities`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'event',
        name: 'startConversation',
        from: { id: 'resident' }
      })
    }
  );
}, 500);

  } catch (err) {
    console.error('[CCWA Chat] startConversation failed:', err);
    addMessage('Sorry, I could not connect right now. Please call 770-960-5200.', 'bot');
  }
}

  // Direct Line: send the resident's message to the agent 
  async function sendToAgent(text) {
    await fetch(`https://directline.botframework.com/v3/directline/conversations/${conversationId}/activities`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'message',
        from: { id: 'resident' },
        text: text
      })
    });
  }

  // Direct Line: poll for the agent's replies
  async function pollForReply() {
  if (!conversationId || !token) return;

  const url = `https://directline.botframework.com/v3/directline/conversations/${conversationId}/activities` +
              (watermark ? `?watermark=${watermark}` : '');
  const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
  const data = await res.json();
  watermark = data.watermark;

  data.activities
  .filter(a => a.from.id !== 'resident' && a.type === 'message')
  .forEach(msg => {
    if (msg.text) addMessage(msg.text, 'bot');
    if (msg.suggestedActions && msg.suggestedActions.actions) {
      renderQuickReplies(msg.suggestedActions.actions);
    }
  });
}

function renderQuickReplies(actions) {
  const existing = widget.querySelector('.quick-replies');
  if (existing) existing.remove();

  const row = document.createElement('div');
  row.className = 'quick-replies';

  actions.forEach(action => {
    const btn = document.createElement('button');
    btn.className = 'quick-reply-btn';
    btn.textContent = action.title;
    btn.addEventListener('click', () => {
      row.remove();
      addMessage(action.title, 'user');
      sendToAgent(action.value || action.title);
    });
    row.appendChild(btn);
  });

  messages.appendChild(row);
  messages.scrollTop = messages.scrollHeight;
}

  // Send button now talks to the real agent instead of local keywords
  function handleSend() {
    const text = input.value.trim();
    if (!text) return;
    addMessage(text, 'user');
    input.value = '';
    sendToAgent(text);
  }

  // Toggle open/close — same as before, plus auto-start on first open
  toggle.addEventListener('click', () => {
    bubble.classList.toggle('open');
    toggle.textContent = bubble.classList.contains('open') ? '✕' : '💬';

    if (bubble.classList.contains('open') && !started) {
      started = true;
      startConversation();
    }
  });

  closeBtn?.addEventListener('click', () => {
    bubble.classList.remove('open');
    toggle.textContent = '💬';
  });

  sendBtn?.addEventListener('click', handleSend);
  input?.addEventListener('keydown', e => { if (e.key === 'Enter') handleSend(); });
})();
