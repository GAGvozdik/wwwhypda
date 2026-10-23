# Stage011 — диагностика раскладки

Packing: afacad-600-grid-v5. Geometry: svg-original-v2. Font: Afacad_Flux600,
Canvas actual bounding box + SVG getBBox, geometricPrecision. Каталог:85 имён.
A/B измерены до увеличения C W-hole (их transforms/config/metrics не менялись);
C повторно измерена после окончательного scale8/translate270,358.
Время — наблюдение одной локальной генерации, не SLA и не benchmark всех устройств.

Для всех18:outside=0,overlaps=0. Проверенные SVG:boundsMismatches=0.
Каждый регион получает слова; B-регионы соответствуют реальным семи буквам,
A/C-регионы — четырём квадрантам. Bbox coverage — доля всего прямоугольного поля,
не доля чернил и не процент заполнения разрешённой геометрии.

| ID | Слов | Уникальных | Вертикальных | Максимальный повтор | Bbox coverage | ms | Слов по регионам |
|---|---:|---:|---:|---:|---:|---:|---|
|A1|66|39|15.15%|4.55%|16.71%|845|18/22/14/12|
|A2|75|40|70.67%|4.00%|16.64%|884|26/20/15/14|
|A3|90|60|50.00%|4.44%|15.37%|753|26/25/18/21|
|A4|149|80|34.90%|4.03%|15.00%|629|40/39/37/33|
|A5|64|42|29.69%|4.69%|11.15%|378|16/19/14/15|
|A6|151|64|50.33%|3.97%|16.15%|797|49/40/31/31|
|B1|242|63|9.92%|4.13%|15.82%|2528|41/46/32/26/25/40/32|
|B2|309|85|69.90%|4.21%|17.83%|2542|59/53/33/34/31/50/49|
|B3|316|85|47.78%|4.43%|14.26%|2268|57/58/39/32/43/50/37|
|B4|431|85|39.91%|4.41%|11.74%|1605|66/64/59/56/71/69/46|
|B5|239|77|15.06%|4.18%|11.73%|1246|42/44/32/25/31/37/28|
|B6|526|85|50.00%|4.37%|15.52%|2079|92/91/74/55/70/83/61|
|C1|138|72|5.07%|4.35%|33.70%|944|35/39/34/30|
|C2|134|78|5.22%|3.73%|22.09%|461|35/35/34/30|
|C3|182|85|49.45%|4.40%|28.41%|849|42/44/52/44|
|C4|150|64|70.00%|4.00%|32.92%|976|33/41/35/41|
|C5|194|85|40.21%|4.12%|20.13%|520|48/39/55/52|
|C6|255|84|50.20%|4.31%|30.12%|831|75/64/57/59|

Число SVG nodes каждой новой композиции:слов+2(root/title). Для A1–A6,
B1–B6,C1–C6 соблюдены целевые направления с допуском10п.п. Порог повторов5%
не превышен; длинные имена не исключались из входного пула. Самые маленькие
размеры12px (воздушные —16px), самые крупные40px.

Геометрические проверки не заменяют художественную оценку. Все18 осмотрены
в увеличенном Fit, C повторно после изменения отверстия. Нужна оценка владельцем
узнаваемости/плотности, особенно воздушных и опорных вариантов. Скриншоты находятся
в протоколе browser tool; файловые изображения/контактный лист ещё требуется сохранить.

Revision 3: тот же набор из 85 публичных названий сохранён в rockNames.snapshot.json без автоматического обновления. Исторические агрегаты выше описывают этот набор; после перехода C6 повторно проверена: 255 слов, те же регионы/bboxCoverage, outside=overlaps=boundsMismatches=0.

## Revision 8 — SVG outlines and larger studies

C W scale9.6, translate186.585,333.181; filled-area centroid aligned with700,700.
All 18 initial outline layouts: outside=overlaps=boundsMismatches=0.
The six large variants were then refined without changing renderer/animation:
gridStep A7/A8=20, B7/B8=16, C7=20/C8=24, repeatLimit12.

| ID | Words | SVG sizes | Outside / overlaps / bounds mismatch |
| --- | ---: | --- | --- |
| A7 | 41 | 64/56/48 | 0/0/0 |
| A8 | 18 | 112/96/80 | 0/0/0 |
| B7 | 97 | 80/64/56 | 0/0/0 |
| B8 | 50 | 112/96/80 | 0/0/0 |
| C7 | 73 | 64/56/48 | 0/0/0 |
| C8 | 36 | 112/96/80 | 0/0/0 |

54 reveal/replay combinations (double replay): static transforms/hrefs, no duplicate IDs,
no live SVG text. Mid-animation C7 screen bounds drift <=0.0000401 CSS px with16–27
partially visible words in four captured frames. This is float rounding, not a glyph shift.
Screenshots inspected in browser protocol. Owner-browser visual QA remains separate.
## Revision 10 — three intermediate studies replace all six 7/8 studies

15 current compositions. Former 7/8 rows above are historical.

| ID | Words | SVG sizes | Outside / overlaps / bounds mismatch |
| --- | ---: | --- | --- |
| A9 | 53 | 42/36/30 | 0/0/0 |
| B9 | 148 | 50/40/34 | 0/0/0 |
| C9 | 90 | 44/38/32 | 0/0/0 |

Nine mode/replay combinations with double replay passed; outline transforms unchanged.
Default animation restored to Left to right. A9 has maxRepeat3/53=5.66% with the
standard minimum repeat limit3; B9/C9 remain below5%. No names were shortened.