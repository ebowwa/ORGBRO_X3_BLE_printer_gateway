import os
import asyncio
from flask import Flask, request, render_template, jsonify
from printer import BlePrinter

# Flask app setup
app = Flask(__name__, static_folder='static', template_folder='templates')

UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/', methods=['GET', 'POST'])
def index():
    error_messages = []
    success_message = None
    if request.method == 'POST':
        printer_address = request.form.get('printer_address')
        if not printer_address:
            error_messages.append('Please select a printer before printing.')

        images = request.files.getlist('images')
        image_paths = []
        for img in images:
            if img and allowed_file(img.filename):
                save_path = os.path.join(UPLOAD_FOLDER, img.filename)
                img.save(save_path)
                image_paths.append(save_path)
            else:
                error_messages.append(f'Invalid file skipped: {img.filename}')

        counts = [int(x.strip()) for x in request.form['counts'].split(',') if x.strip().isdigit()]
        order  = [int(x.strip()) for x in request.form['order'].split(',')  if x.strip().isdigit()]
        density = int(request.form.get('density', 127))  # parse density to avoid NameError

        if len(image_paths) < 1:
            error_messages.append('Please upload at least one image.')
        if len(image_paths) != len(counts):
            error_messages.append('The number of counts must match the number of images.')
        if any(idx < 0 or idx >= len(image_paths) for idx in order):
            error_messages.append('Order indices out of range.')

        if not error_messages:
            printer = BlePrinter(printer_address)
            asyncio.run(printer.print_job(image_paths, counts, order, density))
            success_message = 'Print job dispatched!'

    return render_template('index.html', error_messages=error_messages, success_message=success_message)

@app.route('/scan', methods=['GET'])
def scan_printers():
    devices = BlePrinter.scan()
    return jsonify(devices)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.',1)[1].lower() in {'png','jpg','jpeg','bmp'}

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5004)
