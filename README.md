# ORGBRO X3 BLE Printer Gateway

A lightweight web gateway for driving your ORGBRO X3 thermal sticker printer over Bluetooth Low Energy.

---

## 🔧 Features

- **Single or multiple images** (no minimum).
- **Auto‑scan** for nearby BLE printers on page load + manual rescan.
- **Select** your ORGBRO X3 from a drop‑down.
- **Configure print density** (0–255 via `ESC SP n`) and roll type (paper vs. sticker).
- **Set count & order** for batch jobs.
- **Optional logging** of each job (printer ID, timestamp, image names, location).
- **Built‑in throughput metrics** (~10 small stickers/min at 300 DPI).
- **Supports** both plain thermal rolls and self‑adhesive pods.

---

## 📋 Requirements

- **macOS**, **Linux**, or **Windows**  
- **Python 3.10+** with `uv` (for BLE + Flask/Uvicorn)  
- **Node.js 16+** and **pnpm**  
- ORGBRO X3 with BLE enabled  

---

## 🚀 Quickstart

1. **Clone & enter**:
   ```bash
   git clone https://github.com/yourname/ORGBRO_X3_BLE_printer_gateway.git
   cd ORGBRO_X3_BLE_printer_gateway
   ```
2. **Run the helper**:
   ```bash
   bash runner.sh
   ```
   - Installs both backend & frontend deps  
   - Launches Flask/Uvicorn on port 5004  
   - Launches React frontend on port 5174  
   - Opens `http://localhost:5174` in your browser  

3. **In the UI**:
   - Wait for—or click—**Scan**  
   - Select your printer  
   - Upload PNG/JPEG files  
   - Adjust **Count**, **Order**, **Density**, **Roll Type**  
   - Click **Print**  

---

## ⚙️ Configuration

Copy and edit `backend/.env.example` → `backend/.env`:

```dotenv
BLE_SCAN_INTERVAL=5         # seconds between auto‑scans
LOGGING_ENABLED=true        # write logs to logs/print_jobs.log
PRINTER_SERVICE_UUID=fff0   # BLE service
PRINTER_CHAR_UUID=fff2      # write char
```

Density and roll type can also be overridden per job from the frontend.

---

## 🛠 Thermal‑Head & Paper Insights

- **Head construction**: thin‑film resistive elements on ceramic substrate, glazed for wear resistance.  
- **Resolution**: 203 DPI standard; ORGBRO supports up to 300 DPI (≈50 mm width).  
- **Element specs**: ~20 mΩ resistors, heat to ~200–300 °C in 1–10 ms.  
- **Drive power**: ~20–60 mA per element (total head draw ~2–5 A).  
- **Paper chemistry**: microencapsulated leuco dye reacts at ~65–200 °C → instant black; cools back to clear if below threshold.  
- **Grayscale**: achieved via pulse‑width modulation or dithering, but each extra shade → ↑ dwell time and ↓ head life.  
- **Print‑density trade‑off**:  
  - 0 = lightest (fastest pass, less heat)  
  - 255 = darkest (slower advance, more heat)  
  - Sweet spot ≈ 120–150 for crisp lines & longevity.

---

## 📈 Performance & Optimization

- **Throughput**: ~10 small (50 mm×50 mm) stickers/min at 300 DPI (full‑width images).  
- **Head life**: ~100 km of total print length under recommended density.  
- **BLE scan**:  
  - Default interval 5 s; decrease for more responsive UI, increase to reduce power.  
  - Keep within ~10 m range for stable link.  
- **Image prep**:  
  - Pure black‑white line art → fastest, sharpest.  
  - Grayscale/dithered artwork → slower strips & potential head wear.  
  - Transparent backgrounds OK—only the pixels you send draw heat.

---

## 📦 Consumables

- **Thermal rolls** (50 mm×4 m), non‑adhesive  
- **Sticker pods** (same dims, self‑adhesive)  

Select “paper” vs. “sticker” in the UI so you can track supply levels & cost.

---

## 🗂️ API Endpoints

| Route    | Method | Description                                   |
| -------- | ------ | --------------------------------------------- |
| `/scan`  | GET    | Trigger BLE scan; return available devices    |
| `/print` | POST   | Send images + params (count, density, order)  |

**Example POST JSON**:
```jsonc
{
  "printerId": "XX:XX:XX:XX:XX:XX",
  "images": ["data:image/png;base64,…", …],
  "density": 128,
  "order": [0,1,2],
  "count": [2,1,1],
  "rollType": "sticker"
}
```

---

## 🐞 Troubleshooting

- **“Exception on /scan”**  
  - Ensure BLE adapter is on & drivers installed.  
  - Verify `uv pip show bleak` returns correct package.  
- **No devices**  
  - Move closer (< 10 m) or increase `BLE_SCAN_INTERVAL`.  
- **Too light/dark**  
  - Adjust **Density** slider; reprint.  

---

## 📊 Logging & Analytics

If `LOGGING_ENABLED=true`, each print job is appended to `logs/print_jobs.log` (JSONL):

```json
{
  "printerId":"XX:…",
  "timestamp":"2025-04-18T20:20:50Z",
  "images":["img1.png","img2.png"],
  "density":128,
  "count":[1,2],
  "rollType":"paper",
  "location":null
}
```

Use these logs to analyze distribution points, timestamps, and success rates. You can even add GPS hooks for guerrilla sticker campaigns.
