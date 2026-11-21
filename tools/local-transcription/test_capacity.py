import unittest

import capacity
from capacity import QueueConfig, can_start


class CapacityControllerTests(unittest.TestCase):
    def setUp(self):
        self.cfg = QueueConfig(job_ram_gb=3.0, ram_floor_gb=1.5, max_parallel=3, cpu_ceil=0.9)

    def test_first_job_always_starts_even_when_memory_is_tight(self):
        # Очередь не должна висеть: если ничего не идёт — запускаем всегда.
        self.assertTrue(can_start(0, 0.1, 5.0, self.cfg))
        self.assertTrue(can_start(0, None, None, self.cfg))

    def test_parallel_ceiling_is_hard(self):
        # С запасом памяти, но потолок достигнут — больше не запускаем.
        self.assertFalse(can_start(3, 64.0, 0.0, self.cfg))

    def test_second_job_waits_until_ram_headroom(self):
        # После старта нового должно остаться не меньше пола свободной RAM.
        self.assertTrue(can_start(1, 10.0, 0.0, self.cfg))     # 10 - 3 = 7 ≥ 1.5
        self.assertFalse(can_start(1, 4.0, 0.0, self.cfg))     # 4 - 3 = 1 < 1.5
        self.assertFalse(can_start(1, 3.0, 0.0, self.cfg))

    def test_unknown_ram_stays_serial(self):
        # Не смогли измерить память — осторожно, сверх текущего не добавляем.
        self.assertFalse(can_start(1, None, 0.0, self.cfg))

    def test_cpu_is_a_soft_brake_above_ceiling(self):
        self.assertTrue(can_start(1, 32.0, 0.9, self.cfg))
        self.assertFalse(can_start(1, 32.0, 1.5, self.cfg))
        # Неизвестный CPU не мешает, если памяти хватает.
        self.assertTrue(can_start(1, 32.0, None, self.cfg))

    def test_config_reads_env_defaults_and_overrides(self):
        default = capacity.load_config({})
        self.assertEqual((default.job_ram_gb, default.ram_floor_gb, default.max_parallel), (3.0, 1.5, 3))
        tuned = capacity.load_config({'ISKRA_JOB_RAM_GB': '5', 'ISKRA_MAX_PARALLEL': '2', 'ISKRA_RAM_FLOOR_GB': '2.5'})
        self.assertEqual((tuned.job_ram_gb, tuned.ram_floor_gb, tuned.max_parallel), (5.0, 2.5, 2))
        # Мусор в env не роняет модуль — берём дефолт.
        self.assertEqual(capacity.load_config({'ISKRA_MAX_PARALLEL': 'nonsense'}).max_parallel, 3)
        # Потолок не опускается ниже одного.
        self.assertEqual(capacity.load_config({'ISKRA_MAX_PARALLEL': '0'}).max_parallel, 1)

    def test_available_ram_measurement_is_nonnegative_or_none(self):
        value = capacity.available_ram_gb()
        self.assertTrue(value is None or value >= 0)


if __name__ == '__main__':
    unittest.main()


class PickNextTests(unittest.TestCase):
    def test_second_slides_job_waits_others_pass_it(self):
        from capacity import pick_next
        slides = {'s1', 's2'}.__contains__
        self.assertEqual(pick_next(['s2', 't1'], {'s1'}, slides), 't1')
        self.assertIsNone(pick_next(['s2'], {'s1'}, slides))
        self.assertEqual(pick_next(['s2', 't1'], {'t0'}, slides), 's2')
        self.assertEqual(pick_next(['t1', 's2'], set(), slides), 't1')
