import os
import asyncio
from flask import Flask, request, render_template, jsonify
from printer import BlePrinter
import threading
import queue
import time
from metrics import metrics, get_metrics_response

# Flask app setup
app = Flask(__name__, static_folder='static', template_folder='templates')

UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

job_queue = queue.Queue()

def worker():
    while True:
        job = job_queue.get()
        start_run = time.time()
        wait_time = start_run - job['enqueued_at']
        try:
            printer = BlePrinter(job['printer_address'])
            asyncio.run(printer.print_job(job['images'], job['counts'], job['order'], job['density']))
            metrics['success_jobs'] += 1
        except Exception as e:
            if 'jam' in str(e).lower():
                metrics['paper_jams'] += 1
            metrics['failure_jobs'] += 1
        end_run = time.time()
        duration = end_run - start_run
        metrics['job_times'].append(duration)
        metrics['wait_times'].append(wait_time)
        metrics['prints'] += sum(job['counts'])
        # calculate ink usage
        ink = 0
        for idx, cnt in zip(job['order'], job['counts']):
            raster = printer.image_to_raster_bytes(job['images'][idx], job['density'])
            ink += sum(bin(b).count('1') for b in raster) * cnt
        metrics['ink_usage'] += ink
        # read temperature
        try:
            temp = printer.read_temperature()
            metrics['temperatures'].append(temp)
        except Exception:
            pass
        metrics['queue_length'] = job_queue.qsize()
        metrics['average_wait_time'] = sum(metrics['wait_times']) / len(metrics['wait_times'])
        job_queue.task_done()

threading.Thread(target=worker, daemon=True).start()

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
            enqueued_at = time.time()
            job = {
                'printer_address': printer_address,
                'images': image_paths,
                'counts': counts,
                'order': order,
                'density': density,
                'enqueued_at': enqueued_at
            }
            job_queue.put(job)
            metrics['total_jobs'] += 1
            metrics['queue_length'] = job_queue.qsize()
            success_message = 'Print job queued!'

    return render_template('index.html', error_messages=error_messages, success_message=success_message)

@app.route('/scan', methods=['GET'])
def scan_printers():
    devices = BlePrinter.scan()
    return jsonify(devices)

@app.route('/metrics', methods=['GET'])
def get_metrics():
    return jsonify(get_metrics_response())

@app.route('/queue', methods=['GET'])
def get_queue():
    return jsonify({'queue_length': job_queue.qsize()})

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.',1)[1].lower() in {'png','jpg','jpeg','bmp'}

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5004)
