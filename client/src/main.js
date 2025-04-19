// client/src/main.js

async function scanPrinters() {
  const btn = document.getElementById('scanBtn');
  const origText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Scanning...';
  try {
    const resp = await fetch('/scan');
    const devices = await resp.json();
    const sel = document.getElementById('printerSelect');
    sel.innerHTML = '<option value="">-- Select Printer --</option>';
    devices.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.address;
      opt.textContent = `${d.name} (${d.address})`;
      sel.appendChild(opt);
    });
  } catch (err) {
    console.error('Scan error:', err);
  } finally {
    btn.disabled = false;
    btn.textContent = origText;
  }
}

document.getElementById('scanBtn').addEventListener('click', scanPrinters);
window.addEventListener('load', scanPrinters);
