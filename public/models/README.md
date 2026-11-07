# Готовые меши для 3D-моделей конспекта

`bp3d-heart.glb`, `bp3d-eye.glb`, `bp3d-brain.glb`, `bp3d-lungs.glb`,
`bp3d-urinary.glb`, `bp3d-skull.glb`, `bp3d-digestive.glb` — BodyParts3D, © The Database Center for Life
Science, CC BY 4.0 (https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html).
Собраны из OBJ-деталей архива `partof_BP3D_4.0_obj_99.zip` скриптом
`scripts/models3d/obj2glb.mjs`: один узел на часть, имена узлов — ключи в
`src/lib/models3d/gltfModels.ts`. Какие детали (FJ-файлы) входят в часть —
по таблицам `partof_parts_list_e.txt` и `partof_element_parts.txt` базы.

Лёгкие: в архиве partof нет поверхности долей — только бронхиальное дерево и
лёгочные сосуды, поэтому модель называется «Дыхательные пути и сосуды лёгких».
Печень собрана из гепатовенозных сегментов II–VIII и хвостатой доли, без
внутрипечёночных сосудов и протоков; поджелудочная — только паренхима.
