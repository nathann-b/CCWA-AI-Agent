// CCWA Virtual Assistant Chat Widget
(function () {
  const widget = document.querySelector('.chat-widget');
  if (!widget) return;

  const toggle = widget.querySelector('.chat-toggle');
  const bubble = widget.querySelector('.chat-bubble');
  const closeBtn = widget.querySelector('.chat-close');
  const input = widget.querySelector('.chat-input-area input');
  const sendBtn = widget.querySelector('.chat-send');
  const messages = widget.querySelector('.chat-messages');

  const botReplies = {
    'pay': 'You can pay your bill online at <strong>Pay My Bill</strong>, by phone at 770-960-5200, or in person at 1600 Battle Creek Road, Morrow, GA.',
    'bill': 'You can pay your bill online, by phone at 770-960-5200, or at our main office. Would you like the link to online payments?',
    'leak': 'To report a water leak, please call our 24-hour emergency line at <strong>770-960-5200</strong> or use the Report an Issue page.',
    'outage': 'For water outages, call our emergency line at <strong>770-960-5200</strong> available 24/7.',
    'hours': 'Our office is open Monday–Friday, 8:00 AM – 5:00 PM. We are closed on observed holidays.',
    'address': 'Our main office is located at 1600 Battle Creek Road, Morrow, GA 30260.',
    'phone': 'You can reach us at <strong>770-960-5200</strong>.',
    'drought': 'We are currently under a Level 1 Drought Response. Please restrict outdoor watering to between 10 AM and 4 PM each day and check for household leaks.',
    'account': 'To access your account, visit the My Account portal link in the top navigation bar.',
    'quality': 'CCWA provides high-quality drinking water that meets all federal and state standards. View our annual Water Quality Report under Resources & Facilities.',
    default: "Thanks for reaching out! For immediate assistance, please call <strong>770-960-5200</strong> or browse the site menu. How else can I help?"
  };

  function addMessage(text, type) {
    const msg = document.createElement('div');
    msg.className = `chat-msg ${type}`;
    msg.innerHTML = text;
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
  }

  function getBotReply(text) {
    const t = text.toLowerCase();
    for (const [key, reply] of Object.entries(botReplies)) {
      if (key !== 'default' && t.includes(key)) return reply;
    }
    return botReplies.default;
  }

  function handleSend() {
    const text = input.value.trim();
    if (!text) return;
    addMessage(text, 'user');
    input.value = '';
    setTimeout(() => addMessage(getBotReply(text), 'bot'), 600);
  }

  toggle.addEventListener('click', () => {
    bubble.classList.toggle('open');
    toggle.textContent = bubble.classList.contains('open') ? '✕' : '💬';
  });

  closeBtn?.addEventListener('click', () => {
    bubble.classList.remove('open');
    toggle.textContent = '💬';
  });

  sendBtn?.addEventListener('click', handleSend);
  input?.addEventListener('keydown', e => { if (e.key === 'Enter') handleSend(); });
})();
