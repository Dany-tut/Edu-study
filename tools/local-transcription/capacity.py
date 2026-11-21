"""Adaptive admission control for the transcription queue.

The module runs heavy speech/topic models as isolated worker processes. Running
too many at once makes macOS swap, which stalls or kills the models — far worse
than waiting. So admission is RAM-led: a new worker starts only while enough
real memory stays free, with a hard ceiling on parallelism and a soft CPU brake.
One worker is always allowed, so the queue can never stall.

Every threshold is an env-tunable default, so Dani can adjust без пересборки.
"""
import os
import re
import subprocess
from dataclasses import dataclass

GIB = 1024 ** 3


@dataclass(frozen=True)
class QueueConfig:
    # Память, которую, по опыту, занимает одно тяжёлое задание (whisper/GigaAM).
    job_ram_gb: float = 3.0
    # Сколько RAM всегда оставляем свободной под систему — чтобы не свопить.
    ram_floor_gb: float = 1.5
    # Жёсткий потолок параллельности.
    max_parallel: int = 3
    # Мягкий тормоз по CPU: 1-мин load average на ядро.
    cpu_ceil: float = 0.9
    # Как часто диспетчер перепроверяет ёмкость, пока очередь ждёт.
    poll_sec: float = 2.0
    # Пауза после запуска задания, чтобы его память успела «проявиться»
    # до следующего решения (иначе запустим слишком много разом).
    warmup_sec: float = 8.0


def _num(env, name, default, cast):
    try:
        value = cast(env.get(name, default))
    except (TypeError, ValueError):
        return default
    return value


def load_config(env=None):
    env = os.environ if env is None else env
    return QueueConfig(
        job_ram_gb=_num(env, 'ISKRA_JOB_RAM_GB', 3.0, float),
        ram_floor_gb=_num(env, 'ISKRA_RAM_FLOOR_GB', 1.5, float),
        max_parallel=max(1, _num(env, 'ISKRA_MAX_PARALLEL', 3, lambda v: int(float(v)))),
        cpu_ceil=_num(env, 'ISKRA_CPU_CEIL', 0.9, float),
        poll_sec=max(0.2, _num(env, 'ISKRA_QUEUE_POLL_SEC', 2.0, float)),
        warmup_sec=max(0.0, _num(env, 'ISKRA_QUEUE_WARMUP_SEC', 8.0, float)),
    )


_PAGE_SIZE = re.compile(r'page size of (\d+) bytes')


def available_ram_gb():
    """Свободная (не требующая свопа) память, в ГиБ. None — измерить не удалось."""
    try:
        import psutil  # optional; not a hard dependency of the module
        return psutil.virtual_memory().available / GIB
    except Exception:
        pass
    try:
        out = subprocess.run(['/usr/bin/vm_stat'], capture_output=True, text=True, timeout=5).stdout
        page = int(_PAGE_SIZE.search(out).group(1)) if _PAGE_SIZE.search(out) else 4096

        def pages(label):
            match = re.search(rf'{label}:\s+(\d+)\.', out)
            return int(match.group(1)) if match else 0
        # Консервативно: только то, что система может отдать без свопа.
        free = pages('Pages free') + pages('Pages inactive') + pages('Pages speculative') + pages('Pages purgeable')
        return free * page / GIB
    except Exception:
        return None


def load_per_core():
    """1-минутный load average, делённый на число ядер. None — неизвестно."""
    try:
        return os.getloadavg()[0] / (os.cpu_count() or 1)
    except (OSError, AttributeError):
        return None


def can_start(running_count, available_gb, load, cfg):
    """Можно ли запустить ещё одно задание прямо сейчас.

    running_count — сколько уже идёт; available_gb/load — свежие замеры
    (None — измерить не вышло); cfg — пороги. Логика RAM-ведущая:
    — пока ничего не идёт, запускаем всегда (очередь не висит);
    — иначе не превышаем потолок параллельности;
    — не стартуем, если после старта свободной RAM станет меньше пола;
    — если RAM измерить не удалось — осторожно, не добавляем сверх текущего;
    — CPU — мягкий тормоз сверху.
    """
    if running_count <= 0:
        return True
    if running_count >= cfg.max_parallel:
        return False
    if available_gb is None:
        return False
    if available_gb - cfg.job_ram_gb < cfg.ram_floor_gb:
        return False
    if load is not None and load > cfg.cpu_ceil:
        return False
    return True


def pick_next(pending, running, exclusive):
    """Первое задание из очереди, которое можно запустить рядом с идущими.

    exclusive(jid) — задание из тех, что идут строго по одному (сейчас —
    «По слайдам»: два Vision-прохода разом на одном Mac вешали хелпер при
    загрузке модели). Такое задание ждёт, пока идёт другое такое же, а
    задания за ним в очереди не ждут и запускаются как раньше.
    """
    busy = any(exclusive(jid) for jid in running)
    for jid in pending:
        if not (busy and exclusive(jid)):
            return jid
    return None
