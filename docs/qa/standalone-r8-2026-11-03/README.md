# R8 standalone recovery — промежуточная проверка

Exact SHA `95bf185146fe9027404b414cfa42111cdf8e1c0c`, версия `1.0.1957`. Кандидат `/tmp/iskra-ios-password-rc-r8` чистый; product source не менялся. На exact source выполнен `node scripts/checkStandaloneHomeworkRecovery.mjs`: PASS. Проверены transient0/408/429/503/timeout, recovery,200[],401/403, freshprogress, student/group/Auth/permission/session isolation, lateA/B, optionalmetadata/partialbank. Это controlled-dependency actual-loader regression без API и DBwrites.

Runtime hashes обоих изменённых файлов совпадают с ранее проверенной isolated patch; точные SHA256 и source test hash записаны в manifest.json. Предыдущая настоящая localDB desktop UI проверка red→green относится к этому же runtime code, но не является новой визуальной/аппаратной приёмкой R8.

Публичный static dist заморожен в `/tmp/iskra-chrome-r8-static-snapshot`, полный manifest SHA256 сохранён до любых последующих изменений. Chrome аппаратно НЕ запускался: root остановил промежуточные device-повторы до исправления нового studentlogout дефекта и обновления main. Нативный цикл ДЗ и его bridge не прерывались; телефон не использовался, форма не отправлялась, данные не менялись.

Итог: PASS exactR8 recovery guard; NOT TESTED R8 Chrome/native/E2E. Следующий аппаратный Chrome — только на финальном кандидате в свободное согласованное окно.
