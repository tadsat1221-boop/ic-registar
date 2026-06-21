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

function applyIcCardNumber(raw) {
  const cleaned = raw.toUpperCase().replace(/[^0-9A-Z]/g, '');
  const match = cleaned.match(/[A-Z]{2}[0-9A-Z]{3}[0-9]{4}[0-9]{4}/);
  if (!match) {
    return false;
  }
  const value = match[0];
  icSegments[0].el.value = value.slice(0, 2);
  icSegments[1].el.value = value.slice(2, 5);
  icSegments[2].el.value = value.slice(5, 9);
  icSegments[3].el.value = value.slice(9, 13);
  return true;
}

const scanBtn = document.getElementById('scan-btn');
const scanOverlay = document.getElementById('scan-overlay');
const scanVideo = document.getElementById('scan-video');
const scanCanvas = document.getElementById('scan-canvas');
const scanHint = document.getElementById('scan-hint');
const scanCaptureBtn = document.getElementById('scan-capture-btn');
const scanCancelBtn = document.getElementById('scan-cancel-btn');

let scanStream = null;

async function openScanner() {
  try {
    scanStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
    });
  } catch (err) {
    messageEl.textContent = 'カメラを起動できませんでした。カメラへのアクセスを許可してください。';
    messageEl.classList.add('error');
    return;
  }
  scanVideo.srcObject = scanStream;
  scanOverlay.classList.remove('hidden');
}

function closeScanner() {
  if (scanStream) {
    scanStream.getTracks().forEach((track) => track.stop());
    scanStream = null;
  }
  scanOverlay.classList.add('hidden');
}

async function captureAndRead() {
  const guide = document.querySelector('.scan-guide');
  const videoRect = scanVideo.getBoundingClientRect();
  const guideRect = guide.getBoundingClientRect();
  const scaleX = scanVideo.videoWidth / videoRect.width;
  const scaleY = scanVideo.videoHeight / videoRect.height;

  const sx = (guideRect.left - videoRect.left) * scaleX;
  const sy = (guideRect.top - videoRect.top) * scaleY;
  const sw = guideRect.width * scaleX;
  const sh = guideRect.height * scaleY;

  scanCanvas.width = sw;
  scanCanvas.height = sh;
  const ctx = scanCanvas.getContext('2d');
  ctx.drawImage(scanVideo, sx, sy, sw, sh, 0, 0, sw, sh);

  scanCaptureBtn.disabled = true;
  scanHint.textContent = '読み取り中...';

  try {
    const { data } = await Tesseract.recognize(scanCanvas, 'eng', {
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    });

    if (applyIcCardNumber(data.text)) {
      closeScanner();
      messageEl.textContent = 'ICカード番号を読み取りました。内容をご確認ください。';
      messageEl.classList.add('success');
    } else {
      scanHint.textContent = '読み取れませんでした。枠内に番号を収めて再度撮影してください。';
    }
  } catch (err) {
    scanHint.textContent = '読み取りに失敗しました。再度撮影してください。';
  } finally {
    scanCaptureBtn.disabled = false;
  }
}

scanBtn.addEventListener('click', openScanner);
scanCancelBtn.addEventListener('click', closeScanner);
scanCaptureBtn.addEventListener('click', captureAndRead);

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
