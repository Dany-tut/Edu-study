import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import model_cache as m

class ModelCacheTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(); self.root=Path(self.tmp.name)
        self.patch=patch.object(m,'cache_root',return_value=self.root);self.patch.start()
        self.repo,self.kind=m.MODEL_SPECS[0]
        self.folder=self.root/('models--'+self.repo.replace('/','--'))/'snapshots'/('a'*40)
        self.folder.mkdir(parents=True)
    def tearDown(self):self.patch.stop();self.tmp.cleanup()
    def complete(self, folder=None):
        folder=folder or self.folder
        (folder/'config.json').write_text('{"n_mels":128}')
        (folder/'weights.safetensors').write_bytes(b'unchanged weights')
    def test_weights_without_config_are_repaired_same_revision(self):
        weights=self.folder/'weights.safetensors';weights.write_bytes(b'preserve weights')
        self.assertIsNone(m.find_model(self.repo,self.kind));stages=[]
        def download(repo,revision):
            self.assertEqual(revision,'a'*40)
            (self.folder/'config.json').write_text('{"n_mels":128}')
            return self.folder
        with patch.object(m,'download_snapshot',side_effect=download),patch.object(m,'repair_file') as repair:
            result=m.ensure_model(self.repo,self.kind,stages.append)
        self.assertEqual(result,self.folder); self.assertEqual(weights.read_bytes(),b'preserve weights');repair.assert_not_called()
        self.assertEqual(len(stages),1)
    def test_complete_snapshot_needs_no_network(self):
        self.complete()
        with patch.object(m,'download_snapshot') as download:
            self.assertEqual(m.ensure_model(self.repo,self.kind,lambda _:None),self.folder)
        download.assert_not_called()
    def test_bad_first_snapshot_does_not_hide_complete_one(self):
        (self.folder/'weights.safetensors').write_bytes(b'weights')
        other=self.folder.parent/('b'*40);other.mkdir();self.complete(other)
        self.assertEqual(m.require_model(self.repo,self.kind),other)
    def test_corrupt_json_is_redownloaded(self):
        self.complete();(self.folder/'config.json').write_text('{broken')
        def repair(repo,folder,name):self.assertEqual(name,'config.json');(folder/name).write_text('{"n_mels":128}')
        with patch.object(m,'download_snapshot',return_value=self.folder),patch.object(m,'repair_file',side_effect=repair) as fix:
            self.assertEqual(m.ensure_model(self.repo,self.kind,lambda _:None),self.folder)
        fix.assert_called_once()
    def test_failed_repair_is_actionable_not_ready(self):
        with patch.object(m,'download_snapshot',side_effect=OSError('offline')):
            with self.assertRaisesRegex(ValueError,'докачает'):
                m.ensure_model(self.repo,self.kind,lambda _:None)
        self.assertIsNone(m.find_model(self.repo,self.kind))
    def test_topics_require_tokenizer_and_all_shards(self):
        for name in ['config.json','tokenizer.json','tokenizer_config.json']:(self.folder/name).write_text('{"ok":true}')
        (self.folder/'model.safetensors.index.json').write_text(json.dumps({'weight_map':{'a':'model-1.safetensors','b':'model-2.safetensors'}}))
        (self.folder/'model-1.safetensors').write_bytes(b'weights')
        self.assertEqual(m.missing_files(self.folder,'topics'),['model-2.safetensors'])
        (self.folder/'model-2.safetensors').write_bytes(b'weights')
        self.assertEqual(m.missing_files(self.folder,'topics'),[])
        (self.folder/'tokenizer.json').unlink()
        self.assertIn('tokenizer.json',m.missing_files(self.folder,'topics'))
    def test_broken_weight_symlink_is_not_complete(self):
        (self.folder/'config.json').write_text('{"n_mels":128}')
        (self.folder/'weights.safetensors').symlink_to(self.root/'absent')
        self.assertIsNone(m.find_model(self.repo,self.kind))

if __name__=='__main__':unittest.main()
