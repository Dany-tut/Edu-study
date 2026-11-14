"""Isolated job entrypoint, supervised by the loopback service."""
import json
import sys
import server

if __name__ == '__main__':
    jid = sys.argv[1]
    folder = server.JOBS / jid
    job = json.loads((folder / 'job.json').read_text())
    server.gate.acquire()
    server.run_pipeline(job, folder, job['link'])
