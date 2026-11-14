"""Validate complete model snapshots; repair metadata without discarding weights."""
import json
import os
from pathlib import Path

MODEL_SPECS = (
    ('mlx-community/whisper-large-v3-turbo', 'whisper'),
    ('mlx-community/Qwen2.5-3B-Instruct-4bit', 'topics'),
)


def cache_root():
    return Path(os.environ.get('HF_HUB_CACHE', str(Path(os.environ.get('HF_HOME', str(Path.home()/'.cache/huggingface'))) / 'hub')))


def candidates(repo):
    root = cache_root() / ('models--' + repo.replace('/', '--'))
    paths = sorted((root/'snapshots').glob('*'), key=lambda p: p.stat().st_mtime, reverse=True)
    try:
        preferred = root/'snapshots'/(root/'refs/main').read_text().strip()
        if preferred in paths: paths.remove(preferred); paths.insert(0, preferred)
    except OSError:
        pass
    return [p for p in paths if p.is_dir()]


def json_file(path):
    try:
        value = json.loads(path.read_text())
        return value if isinstance(value, dict) and value else None
    except (OSError, ValueError):
        return None


def missing_files(folder, kind):
    required = ['config.json'] + (['tokenizer.json', 'tokenizer_config.json'] if kind == 'topics' else [])
    missing = [name for name in required if json_file(folder/name) is None]
    if kind == 'whisper':
        weights = ['weights.safetensors']
    elif (folder/'model.safetensors.index.json').exists():
        index = json_file(folder/'model.safetensors.index.json') or {}
        mapping = index.get('weight_map')
        weights = sorted(set(mapping.values())) if isinstance(mapping, dict) and mapping and all(isinstance(v, str) for v in mapping.values()) else []
        if not weights: missing.append('model.safetensors.index.json')
    else:
        weights = ['model.safetensors']
    for name in weights:
        path = folder/name
        # Shards must belong to this snapshot, never another path named by metadata.
        if Path(name).name != name or not path.is_file() or path.stat().st_size == 0:
            missing.append(name)
    return missing


def find_model(repo, kind):
    return next((p for p in candidates(repo) if not missing_files(p, kind)), None)


def require_model(repo, kind):
    path = find_model(repo, kind)
    if path is None:
        raise ValueError('Модель ещё не подготовлена. Повторите обработку: Искра восстановит недостающие файлы.')
    return path


def download_snapshot(repo, revision=None):
    from huggingface_hub import snapshot_download
    return Path(snapshot_download(repo_id=repo, revision=revision, cache_dir=str(cache_root()),
                                  allow_patterns=['*.json', '*.safetensors', '*.txt', '*.jinja']))


def repair_file(repo, folder, name):
    from huggingface_hub import hf_hub_download
    hf_hub_download(repo_id=repo, revision=folder.name, filename=name,
                    cache_dir=str(cache_root()), force_download=True)


def ensure_model(repo, kind, stage):
    ready = find_model(repo, kind)
    if ready is not None: return ready
    label = 'распознавания речи' if kind == 'whisper' else 'глав'
    stage('Подготавливаем модель ' + label)
    partial = candidates(repo)
    # Recover the same revision so an incomplete cache need not download weights again.
    revision = partial[0].name if partial and len(partial[0].name) == 40 and all(c in '0123456789abcdef' for c in partial[0].name) else None
    try:
        folder = download_snapshot(repo, revision)
        # Hub may reuse a corrupt cached JSON/blob; refetch only invalid/missing files.
        for name in missing_files(folder, kind):
            if Path(name).name == name: repair_file(repo, folder, name)
        missing = missing_files(folder, kind)
        if missing:
            raise RuntimeError('Incomplete model snapshot: ' + ', '.join(missing))
        return folder
    except Exception as error:
        print(f'Model preparation failed ({repo}): {type(error).__name__}: {error}', flush=True)
        raise ValueError('Не удалось подготовить модель ' + label + '. Проверьте интернет и свободное место. При повторной попытке Искра докачает недостающие файлы.') from error
