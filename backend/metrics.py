metrics = {
    'total_jobs': 0,
    'success_jobs': 0,
    'failure_jobs': 0,
    'job_times': [],
    'wait_times': [],
    'prints': 0,
    'queue_length': 0,
    'average_wait_time': 0,
    'ink_usage': 0,
    'temperatures': [],
    'paper_jams': 0
}


def get_metrics_response():
    return {
        'total_jobs': metrics['total_jobs'],
        'success_jobs': metrics['success_jobs'],
        'failure_jobs': metrics['failure_jobs'],
        'average_job_time': sum(metrics['job_times']) / len(metrics['job_times']) if metrics['job_times'] else 0,
        'prints': metrics['prints'],
        'queue_length': metrics['queue_length'],
        'average_wait_time': metrics['average_wait_time'],
        'ink_usage': metrics['ink_usage'],
        'paper_jams': metrics['paper_jams'],
        'error_rate': metrics['failure_jobs'] / metrics['total_jobs'] if metrics['total_jobs'] else 0,
        'average_temperature': sum(metrics['temperatures']) / len(metrics['temperatures']) if metrics['temperatures'] else 0
    }