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

Сжатие (07.11.2026): gltf-transform 4.5 — `weld` → `simplify --ratio 0.5
--error 0.0004` → `meshopt --level medium`. 21 МБ → 4,6 МБ. Загрузчику нужен
MeshoptDecoder (подключён в gltfModels.ts). Пересобирая из OBJ, повторять эти
три шага.

**Состав каждой модели** (часть → FJ-файлы и обрезка) — `scripts/models3d/bp3d-parts.json`.
Пересборка одной модели:

    unzip partof_BP3D_4.0_obj_99.zip -d obj   # архив 62 МБ с сайта BodyParts3D
    node scripts/models3d/obj2glb.mjs obj/partof_BP3D_4.0_obj_99 raw.glb "$(jq -c '."bp3d-heart".parts' scripts/models3d/bp3d-parts.json)" "$(jq -c '."bp3d-heart".opt' scripts/models3d/bp3d-parts.json)"
    npx @gltf-transform/cli weld raw.glb w.glb && npx @gltf-transform/cli simplify w.glb s.glb --ratio 0.5 --error 0.0004 && npx @gltf-transform/cli meshopt s.glb public/models/bp3d-heart.glb --level medium

Как искать детали: в `partof_element_parts.txt` у файла много концептов (от
«human body» до конкретной детали); сама деталь — концепт с наименьшим числом
файлов. Чего в архиве нет: поверхность лёгких, сетчатка, зрительный нерв,
ресничное тело, слёзные мышцы-названия; у сердца нет межжелудочковой перегородки
и проводящей системы.
