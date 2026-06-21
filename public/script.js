const form = document.getElementById('register-form');
const messageEl = document.getElementById('message');
const submitBtn = document.getElementById('submit-btn');
const registerView = document.getElementById('register-view');
const sentView = document.getElementById('sent-view');

const icSegments = [
  { el: document.getElementById('icCard1'), pattern: /[^A-Za-z]/g, maxLength: 2 },
  { el: document.getElementById('icCard2'), pattern: /[^0-9A-Za-z]/g, maxLength: 3 },
  { el: document.getElementById('icCard3'), pattern: /[^0-9]/g, maxLength: 4 },
  { el: document.getElementById('icCard4'), pattern: /[^0-9]/g, maxLength: 4 },
];

icSegments.forEach((segment, index) => {
  segment.el.addEventListener('input', () => {
    segment.el.value = segment.el.value.replace(segment.pattern, '').toUpperCase().slice(0, segment.maxLength);

    if (segment.el.value.length >= segment.maxLength && index < icSegments.length - 1) {
      icSegments[index + 1].el.focus();
    }
  });

  segment.el.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && segment.el.value === '' && index > 0) {
      icSegments[index - 1].el.focus();
    }
  });
});

function getIcCardNumber() {
  return icSegments.map((segment) => segment.el.value).join('');
}

function getIcCardNumberForDisplay() {
  return icSegments.map((segment) => segment.el.value).join(' ');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  messageEl.textContent = '';
  messageEl.className = 'message';

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const icCardNumber = getIcCardNumber();

  const confirmed = window.confirm(
    `以下の内容で登録します。よろしいですか？\n\nメールアドレス: ${email}\nICカード番号: ${getIcCardNumberForDisplay()}`
  );
  if (!confirmed) {
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = '送信中...';

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, icCardNumber }),
    });

    const data = await res.json();

    if (!res.ok) {
      messageEl.textContent = (data.errors || ['登録に失敗しました。']).join('\n');
      messageEl.classList.add('error');
      return;
    }

    form.reset();
    registerView.classList.add('hidden');
    sentView.classList.remove('hidden');
  } catch (err) {
    messageEl.textContent = '通信エラーが発生しました。再度お試しください。';
    messageEl.classList.add('error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '登録する';
  }
});
