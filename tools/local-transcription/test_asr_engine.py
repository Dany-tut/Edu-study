import unittest
import asr_engine as a


class LooksMixedTests(unittest.TestCase):
    def test_pure_russian_is_not_mixed(self):
        self.assertFalse(a.looks_mixed('ru', 'сегодня на уроке мы разберём клетку'))

    def test_non_ru_language_is_mixed(self):
        self.assertTrue(a.looks_mixed('en', 'hello everyone'))

    def test_korean_is_mixed(self):
        self.assertTrue(a.looks_mixed('ru', 'это слово 안녕 по-корейски'))

    def test_heavy_latin_is_mixed(self):
        self.assertTrue(a.looks_mixed('ru', 'the nucleus контролирует cell membrane'))

    def test_single_latin_term_is_tolerated(self):
        self.assertFalse(a.looks_mixed('ru', 'молекула днк хранит информацию в ядре клетки организма pH'))


class SegmentsFromCtcTests(unittest.TestCase):
    def test_splits_on_long_pause(self):
        tokens = list('аб') + [' '] + list('вг')
        # «аб» в 0.0–0.1, пауза, «вг» в 2.0–2.1 → две реплики.
        timestamps = [0.0, 0.05, 0.1, 2.0, 2.05]
        segs = a.segments_from_ctc(tokens, timestamps)
        self.assertEqual(len(segs), 2)
        self.assertEqual(segs[0]['text'], 'аб')
        self.assertEqual(segs[1]['text'], 'вг')

    def test_shift_applied(self):
        segs = a.segments_from_ctc(list('да'), [0.0, 0.1], shift=10.0)
        self.assertGreaterEqual(segs[0]['start'], 10.0)

    def test_words_when_requested(self):
        tokens = list('да') + [' '] + list('нет')
        timestamps = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5]
        segs = a.segments_from_ctc(tokens, timestamps, want_words=True)
        self.assertEqual([w['word'] for w in segs[0]['words']], ['да', 'нет'])

    def test_no_words_by_default(self):
        segs = a.segments_from_ctc(list('да'), [0.0, 0.1])
        self.assertNotIn('words', segs[0])

    def test_bpe_leading_space_tokens(self):
        # v3 e2e: пробел зашит в токен (' С', ' на'), а не отдельным токеном.
        tokens = [' С', 'е', 'го', 'д', 'н', 'я', ' на', ' у', 'ро', 'к', 'е']
        timestamps = [i * 0.1 for i in range(len(tokens))]
        segs = a.segments_from_ctc(tokens, timestamps, want_words=True)
        self.assertEqual(segs[0]['text'], 'Сегодня на уроке')
        self.assertEqual([w['word'] for w in segs[0]['words']], ['Сегодня', 'на', 'уроке'])

    def test_mismatched_lengths_return_empty(self):
        self.assertEqual(a.segments_from_ctc(['а', 'б'], [0.0]), [])


if __name__ == '__main__':
    unittest.main()
