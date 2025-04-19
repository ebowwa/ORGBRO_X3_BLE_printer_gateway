# ORGBRO X3 BLE Printer Gateway v4

## What's New
- **Single or multiple** images (no minimum count).
- **Automatic** and manual printer scan on page load/button click.
- **Select** your BLE printer directly in the form.
- **Configure** print density (0-255) via HTML input (sent via ESC SP n).

## Setup & Run
```bash
unzip ble_printer_gateway_v4.zip
cd ble_printer_gateway_v4
python3 -m venv venv
source venv/bin/activate
uv pip install -r requirements.txt
uv run  app.py
```
Open your browser at http://localhost:5004, select a printer, upload images, set counts/order/density, and hit **Print**.
