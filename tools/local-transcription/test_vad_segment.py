import unittest
import vad_segment as v


class PlanCutsTests(unittest.TestCase):
    def test_short_recording_not_cut(self):
        self.assertEqual(v.plan_cuts([(0, 50)], 60, chunk_max=90), [])

    def test_cuts_land_in_silence_near_target(self):
        # Речь с паузой около 85 с: граница должна сесть в середину паузы, не на 90.
        speech = [(0, 85), (88, 170)]
        cuts = v.plan_cuts(speech, 170, chunk_max=90, min_chunk=20)
        self.assertEqual(len(cuts), 1)
        self.assertAlmostEqual(cuts[0], 86.5, places=1)  # (85+88)/2

    def test_full_contiguous_coverage(self):
        # Из точек реза получаются подряд идущие куски, покрывающие [0, total].
        speech = [(0, 40), (45, 130), (135, 220)]
        total = 220
        cuts = v.plan_cuts(speech, total, chunk_max=90, min_chunk=20)
        bounds = [0.0] + cuts + [total]
        for a, b in zip(bounds, bounds[1:]):
            self.assertLess(a, b)
            self.assertLessEqual(b - a, 90 + 1e-6)
        self.assertEqual(bounds[0], 0.0)
        self.assertEqual(bounds[-1], total)

    def test_hard_cut_when_no_pause(self):
        # Непрерывная речь длиннее chunk_max — режем жёстко по цели.
        cuts = v.plan_cuts([(0, 300)], 300, chunk_max=90, min_chunk=20)
        self.assertEqual(cuts[0], 90.0)
        self.assertTrue(all(b - a <= 90 + 1e-6 for a, b in zip([0] + cuts, cuts + [300])))


if __name__ == '__main__':
    unittest.main()
