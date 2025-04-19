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
const fileTableContainer = document.getElementById('fileTableContainer');

function buildFileTable(files) {
  const container = fileTableContainer;
  container.innerHTML = '';
  if (!files.length) return;
  const table = document.createElement('table');
  table.className = 'min-w-full divide-y divide-gray-200';
  const thead = document.createElement('thead');
  thead.innerHTML = `<tr class="bg-gray-50"><th class="px-4 py-2">Preview</th><th class="px-4 py-2">Filename</th><th class="px-4 py-2">Count</th><th class="px-4 py-2">Order</th></tr>`;
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  Array.from(files).forEach((file, idx) => {
    const tr = document.createElement('tr'); tr.className = 'border-b';
    const tdPrev = document.createElement('td'); tdPrev.className = 'px-4 py-2';
    const img = document.createElement('img'); img.src = URL.createObjectURL(file); img.className = 'h-16 mx-auto'; tdPrev.appendChild(img); tr.appendChild(tdPrev);
    const tdName = document.createElement('td'); tdName.className = 'px-4 py-2'; tdName.textContent = file.name; tr.appendChild(tdName);
    const tdCount = document.createElement('td'); tdCount.className = 'px-4 py-2';
    const inputCount = document.createElement('input'); inputCount.type = 'number'; inputCount.min = 1; inputCount.value = 1; inputCount.className = 'count-input border rounded px-2 py-1 w-20'; tdCount.appendChild(inputCount); tr.appendChild(tdCount);
    const tdOrder = document.createElement('td'); tdOrder.className = 'px-4 py-2';
    const inputOrder = document.createElement('input'); inputOrder.type = 'number'; inputOrder.min = 0; inputOrder.value = idx; inputOrder.className = 'order-input border rounded px-2 py-1 w-20'; tdOrder.appendChild(inputOrder); tr.appendChild(tdOrder);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);
}

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
  buildFileTable(imageInput.files);
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
// Enable/disable width & height based on preset
function togglePaperFields() {
  const isCustom = paperPreset.value === 'custom';
  paperWidthSelect.disabled = !isCustom;
  paperHeightInput.disabled = !isCustom;
  const classes = ['opacity-50','cursor-not-allowed'];
  if (!isCustom) {
    paperWidthSelect.classList.add(...classes);
    paperHeightInput.classList.add(...classes);
  } else {
    paperWidthSelect.classList.remove(...classes);
    paperHeightInput.classList.remove(...classes);
  }
}

paperPreset.addEventListener('change', () => {
  if (paperPreset.value === 'custom') {
    togglePaperFields();
    return;
  }
  const mm = presets[paperPreset.value];
  const w = Math.round(mm.width * pxPerMm);
  const h = Math.round(mm.height * pxPerMm);
  paperWidthSelect.value = w;
  paperHeightInput.value = h;
  localStorage.setItem('paperWidth', w);
  localStorage.setItem('paperHeight', h);
  updatePreviewSize();
  togglePaperFields();
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
  togglePaperFields();
});

// populate hidden CSV inputs before submit
const printForm = document.getElementById('printForm');
printForm.addEventListener('submit', () => {
  const counts = Array.from(document.querySelectorAll('.count-input')).map(i => i.value);
  const order = Array.from(document.querySelectorAll('.order-input')).map(i => i.value);
  document.getElementById('countsInput').value = counts.join(',');
  document.getElementById('orderInput').value = order.join(',');
});

// density slider preview effect
const densityInput = document.getElementById('densityInput');
const densityValue = document.getElementById('densityValue');
densityInput.addEventListener('input', () => {
  densityValue.textContent = densityInput.value;
  const contrast = densityInput.value / 128;
  document.querySelectorAll('#fileTableContainer img, #imagePreview img').forEach(img => img.style.filter = `contrast(${contrast})`);
});
// initialize preview effect
densityInput.dispatchEvent(new Event('input'));
