import './preview.js';

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

// density-paint helpers
function createDensityMap(img, defaultD = 127) {
  const {width, height} = img;
  return {map: new Uint8Array(width * height).fill(defaultD), width, height};
}
function setPixelDensity(dm, x, y, d) {
  if (x < 0 || y < 0 || x >= dm.width || y >= dm.height) return;
  dm.map[y * dm.width + x] = d;
}
function applyDensityMap(img, dm, ctx) {
  ctx.drawImage(img, 0, 0);
  const dp = ctx.getImageData(0, 0, dm.width, dm.height);
  const data = dp.data;
  for (let i = 0; i < dm.map.length; i++) {
    const v = data[i * 4];
    const thresh = dm.map[i];
    const out = v < thresh ? 0 : 255;
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = out;
  }
  ctx.putImageData(dp, 0, 0);
}

let previewItems = [];

imageInput.addEventListener('change', () => {
  return; // skip duplicate preview, handled in preview.js
  imagePreview.innerHTML = '';
  previewItems = [];
  Array.from(imageInput.files).forEach((file, idx) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const defaultD = parseInt(document.getElementById('densityInput').value);
        const dm = createDensityMap(img, defaultD);
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        applyDensityMap(img, dm, ctx);

        // store a copy of original density map for reset
        const originalMap = dm.map.slice();
        previewItems.push({dm, originalMap, img, ctx});

        // wrap canvas in a relative container and add brush cursor overlay
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.style.display = 'inline-block';
        // ensure preview container is relative for absolute overlay
        imagePreview.style.position = 'relative';
        // append canvas into wrapper
        wrapper.appendChild(canvas);
        // create brush cursor indicator
        const brushCursor = document.createElement('div');
        brushCursor.style.position = 'absolute';
        brushCursor.style.pointerEvents = 'none';
        brushCursor.style.border = '2px solid rgba(255,0,0,0.8)';
        brushCursor.style.borderRadius = '50%';
        brushCursor.style.transform = 'translate(-50%, -50%)';
        wrapper.appendChild(brushCursor);
        // painting state
        let painting = false;
        canvas.addEventListener('mousedown', () => (painting = true));
        window.addEventListener('mouseup', () => (painting = false));
        canvas.addEventListener('mouseleave', () => (brushCursor.style.display = 'none'));
        canvas.addEventListener('mouseenter', () => (brushCursor.style.display = 'block'));
        canvas.addEventListener('mousemove', e => {
          const rect = canvas.getBoundingClientRect();
          const mx = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width));
          const my = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height));
          const localX = e.clientX - rect.left;
          const localY = e.clientY - rect.top;
          // update cursor size and position
          const brushSize = parseInt(document.getElementById('brushSizeInput').value);
          brushCursor.style.width = `${brushSize * 2}px`;
          brushCursor.style.height = `${brushSize * 2}px`;
          brushCursor.style.left = `${localX}px`;
          brushCursor.style.top = `${localY}px`;
          if (painting) {
            const brushD = parseInt(document.getElementById('densityInput').value);
            // paint circular brush mask
            for (let dy = -brushSize; dy <= brushSize; dy++) {
              for (let dx = -brushSize; dx <= brushSize; dx++) {
                if (dx*dx + dy*dy <= brushSize*brushSize) {
                  setPixelDensity(dm, mx + dx, my + dy, brushD);
                }
              }
            }
            applyDensityMap(img, dm, ctx);
          }
        });
        // add wrapper (with canvas & overlay) to preview
        imagePreview.appendChild(wrapper);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
  buildFileTable(imageInput.files);
});

function buildFileTable(files) {
  const container = fileTableContainer;
  container.innerHTML = '';
  if (!files.length) return;
  const table = document.createElement('table');
  table.className = 'min-w-full divide-y divide-gray-200';
  const thead = document.createElement('thead');
  thead.innerHTML = `<tr class="bg-gray-50"><th class="px-4 py-2">Filename</th><th class="px-4 py-2">Count</th><th class="px-4 py-2">Order</th></tr>`;
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  Array.from(files).forEach((file, idx) => {
    const tr = document.createElement('tr'); tr.className = 'border-b';
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

// brush size preview effect
const brushSizeInput = document.getElementById('brushSizeInput');
const brushSizeValue = document.getElementById('brushSizeValue');
brushSizeInput.addEventListener('input', () => {
  brushSizeValue.textContent = brushSizeInput.value;
});
// initialize brush size display
brushSizeInput.dispatchEvent(new Event('input'));

// reset edits: restore original density maps
const resetBtn = document.getElementById('resetBtn');
resetBtn.addEventListener('click', () => {
  previewItems.forEach(item => {
    item.dm.map.set(item.originalMap);
    applyDensityMap(item.img, item.dm, item.ctx);
  });
});
