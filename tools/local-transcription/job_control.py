"""One isolated process group per job; cancellation never targets shared Pythons."""
import json
import os
import signal
import subprocess
import time


def members(group):
    out = subprocess.run(['/bin/ps', '-axo', 'pid=,pgid=,stat='], capture_output=True, text=True, check=True)
    return [int(p) for line in out.stdout.splitlines() for p, g, state in [line.split()[:3]]
            if int(g) == group and not state.startswith('Z')]


def stop_group(group):
    # The worker was started with start_new_session=True. All ffmpeg, Python,
    # curl and model-loading descendants inherit this dedicated process group.
    for sig, grace in [(signal.SIGTERM, 2), (signal.SIGKILL, 3)]:
        try: os.killpg(group, sig)
        except ProcessLookupError: return
        deadline = time.monotonic() + grace
        while time.monotonic() < deadline:
            if not members(group): return
            time.sleep(.1)
    # Never declare cancellation complete/release the gate while code is alive.
    while members(group):
        print(f'Waiting for job process group {group} to stop', flush=True)
        time.sleep(2)


def existing_worker(folder, command):
    """Recover supervision after a service restart, without trusting a reused PID."""
    try:
        info = json.loads((folder / '.process.json').read_text())
        pid = int(info['pid'])
        if os.getpgid(pid) != pid: return None
        actual = subprocess.run(['/bin/ps', '-p', str(pid), '-o', 'command='], capture_output=True, text=True).stdout.strip()
        if actual == ' '.join(command): return pid
    except (OSError, ValueError, KeyError): pass
    return None


def supervise(folder, command, observe):
    pid = existing_worker(folder, command)
    process = None
    if pid is None:
        if (folder / '.cancel').exists(): return
        process = subprocess.Popen(command, start_new_session=True)
        pid = process.pid
        (folder / '.process.json').write_text(json.dumps({'pid': pid}))
    print(f'Job {folder.name}: worker group {pid}', flush=True)
    try:
        while True:
            observe()
            if (folder / '.cancel').exists():
                stop_group(pid)
                break
            if process is not None:
                if process.poll() is not None:
                    # A failed worker may have left a child behind.
                    stop_group(pid)
                    break
            elif not members(pid): break
            time.sleep(.25)
    except BaseException:
        # Observation/logging failure must not leave a live worker behind or
        # block forever in wait(). Keep termination within this owned group.
        stop_group(pid)
        raise
    finally:
        if process is not None: process.wait()
        (folder / '.process.json').unlink(missing_ok=True)
