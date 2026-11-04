import unittest
from chapter_titles import checked_title

class ChapterTitlesTest(unittest.TestCase):
    def test_invalid_translation_is_not_published(self):
        self.assertEqual(checked_title('Операции по抓捕与合同',lambda _: 'Операции по抓捕与合同',8),'Фрагмент 8')
    def test_successful_translation(self):
        self.assertEqual(checked_title('Министерство по应急管理',lambda _: 'Работа министерства',4),'Работа министерства')
    def test_valid_title_does_not_retry(self):
        def forbidden(_):raise AssertionError('Unexpected retry')
        self.assertEqual(checked_title('Строение ДНК',forbidden,1),'Строение ДНК')
    def test_empty_model_response(self):
        self.assertEqual(checked_title('',lambda _: '',1),'Фрагмент 1')
if __name__=='__main__':unittest.main()
