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

// preview selected images
const imageInput = document.getElementById('imageInput');
const imagePreview = document.getElementById('imagePreview');
imageInput.addEventListener('change', () => {
  imagePreview.innerHTML = '';
  Array.from(imageInput.files).forEach(file => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = document.createElement('img');
      img.src = reader.result;
      imagePreview.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
});

// adjust preview-container size and persist defaults
const paperWidthSelect = document.getElementById('paperWidth');
const paperHeightInput = document.getElementById('paperHeight');
// load saved defaults
const savedWidth = localStorage.getItem('paperWidth');
if (savedWidth) paperWidthSelect.value = savedWidth;
const savedHeight = localStorage.getItem('paperHeight');
if (savedHeight) paperHeightInput.value = savedHeight;
// define mm→px conversion and presets
const pxPerMm = 384/58;
const presets = {
  '50mmx4m': { width: 50, height: 4000 },
  '30mmD':    { width: 30, height: 30 },
  '80mmx3m':  { width: 80, height: 3000 }
};
const paperPreset = document.getElementById('paperPreset');
paperPreset.addEventListener('change', () => {
  if (paperPreset.value === 'custom') return;
  const mm = presets[paperPreset.value];
  const w = Math.round(mm.width * pxPerMm);
  const h = Math.round(mm.height * pxPerMm);
  paperWidthSelect.value = w;
  paperHeightInput.value = h;
  localStorage.setItem('paperWidth', w);
  localStorage.setItem('paperHeight', h);
  updatePreviewSize();
});
function updatePreviewSize() {
  // only set width for preview; height governed by CSS
  imagePreview.style.width = `${paperWidthSelect.value}px`;
}
// listeners for custom changes
paperWidthSelect.addEventListener('change', () => {
  localStorage.setItem('paperWidth', paperWidthSelect.value);
  updatePreviewSize();
});
paperHeightInput.addEventListener('change', () => {
  localStorage.setItem('paperHeight', paperHeightInput.value);
  updatePreviewSize();
});
// initialize on load
window.addEventListener('load', () => {
  updatePreviewSize();
});
