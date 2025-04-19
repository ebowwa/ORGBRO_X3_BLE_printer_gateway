// preview.js: handles image preview & paint-like density editing

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

// DOM references
const imageInput = document.getElementById('imageInput');
const imagePreview = document.getElementById('imagePreview');
const fileTableContainer = document.getElementById('fileTableContainer');
const densityInput = document.getElementById('densityInput');
const densityValue = document.getElementById('densityValue');
const brushSizeInput = document.getElementById('brushSizeInput');
const brushSizeValue = document.getElementById('brushSizeValue');
const resetBtn = document.getElementById('resetBtn');

// track preview items
const previewItems = [];

// handle new uploads and initial rendering
imageInput.addEventListener('change', () => {
  imagePreview.innerHTML = '';
  previewItems.length = 0;

  Array.from(imageInput.files).forEach((file) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const defaultD = parseInt(densityInput.value);
        const dm = createDensityMap(img, defaultD);
        const originalMap = dm.map.slice();
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        applyDensityMap(img, dm, ctx);

        // store for reset
        previewItems.push({dm, originalMap, img, ctx});

        // wrapper & brush cursor
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.style.display = 'inline-block';
        wrapper.appendChild(canvas);

        const brushCursor = document.createElement('div');
        brushCursor.style.position = 'absolute';
        brushCursor.style.pointerEvents = 'none';
        brushCursor.style.border = '2px solid rgba(255,0,0,0.8)';
        brushCursor.style.borderRadius = '50%';
        brushCursor.style.transform = 'translate(-50%, -50%)';
        wrapper.appendChild(brushCursor);

        let painting = false;
        canvas.addEventListener('mousedown', () => (painting = true));
        window.addEventListener('mouseup', () => (painting = false));
        canvas.addEventListener('mouseleave', () => (brushCursor.style.display = 'none'));
        canvas.addEventListener('mouseenter', () => (brushCursor.style.display = 'block'));

        canvas.addEventListener('mousemove', (e) => {
          const rect = canvas.getBoundingClientRect();
          const mx = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width));
          const my = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height));
          const localX = e.clientX - rect.left;
          const localY = e.clientY - rect.top;
          const brushSize = parseInt(brushSizeInput.value);
          brushCursor.style.width = `${brushSize * 2}px`;
          brushCursor.style.height = `${brushSize * 2}px`;
          brushCursor.style.left = `${localX}px`;
          brushCursor.style.top = `${localY}px`;

          if (painting) {
            const brushD = parseInt(densityInput.value);
            for (let dy = -brushSize; dy <= brushSize; dy++) {
              for (let dx = -brushSize; dx <= brushSize; dx++) {
                if (dx * dx + dy * dy <= brushSize * brushSize) {
                  setPixelDensity(dm, mx + dx, my + dy, brushD);
                }
              }
            }
            applyDensityMap(img, dm, ctx);
          }
        });

        imagePreview.appendChild(wrapper);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
  buildFileTable(imageInput.files);
});

// density slider preview
densityInput.addEventListener('input', () => {
  densityValue.textContent = densityInput.value;
  const contrast = densityInput.value / 128;
  document.querySelectorAll('#fileTableContainer img, #imagePreview canvas').forEach((el) => {
    el.style.filter = `contrast(${contrast})`;
  });
});
densityInput.dispatchEvent(new Event('input'));

// brush size slider preview
brushSizeInput.addEventListener('input', () => {
  brushSizeValue.textContent = brushSizeInput.value;
});
brushSizeInput.dispatchEvent(new Event('input'));

// reset edits
resetBtn.addEventListener('click', () => {
  previewItems.forEach((item) => {
    item.dm.map.set(item.originalMap);
    applyDensityMap(item.img, item.dm, item.ctx);
  });
});
