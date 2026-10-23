Revision 8 актуальнее исторических проверок ниже: 18 вариантов (A3/A4/A6/A7/A8, B1–B8, C1–C3/C7/C8), только Multicolour, три reveal. Проверить увеличенную W и её оптическое положение, различимость новых больших слов, три анимации на SVG-контурах. Прежний отчёт о неподвижных координатах не подтвердил отсутствие видимого дрожания; владелец сообщил о его сохранении.


Актуально с revision 6: 12 вариантов A3/A4/A6, B1–B6, C1–C3; три анимации Left to right (default), Word sequence, Centre outward. Soft reveal и A1/A2/A5/C4/C5/C6 исключены. Стенды используют штатный тёмный фон/controls сайта локально; переключение общей темы не должно осветлять lab. Предыдущие количества и матрицы ниже — история прежней реализации.
# Stage 011 — локальная приёмка и проверка владельца

Статус: локальная реализация есть; финальная приёмка не завершена, план активен.
URL: http://localhost:8080/logo-lab. При просмотре Vercel владелец открывает тот же путь на своём frontend deployment; лаборатория использует встроенный JSON-снимок и не зависит от доступности API каталога. Search продолжает использовать сервер. Публикация агентом не выполнялась.

## Проверено локально

- Публичный runtime-каталог:102 записи,86 листьев,85 полных отображаемых имён. Внутренние пробелы/запятые/орфография сохранены, status не фильтруется.
- Семь Node tests через штатный frontend Docker: JSON snapshot validation, extraction, полное покрытие bbox/integral с вогнутым участком/дыркой, spatial hash, детерминизм/отмена/полные названия, контраст20 inks, четыре reveal/replay/cleanup/reduced-motion через controlled media fixture.
- TypeScript, Vite и legal source checks проходят. Scoped ESLint новых TS/TSX и mainBody проходит. Полный lint:58 прежних errors/14 warnings; список областей — журнал плана.
- Встроенный Chromium: 320/390/768/1280/1440 CSS px; у проверенной страницы нет внешнего горизонтального overflow. Историческая проверка dialog отменена в revision 4: увеличенный просмотр удалён.
- Матрица144 вариантов18×4палитры×2подложки: computed contrast минимум5.547:1. Режим tones использует6 оттенков двух семейств, multi8 цветов, duo2, mono1. Вся матрица пройдена на packing v5 до последнего увеличения C W-hole; styles/animation не менялись.
- Для всех18 четыре reveal с двойным replay во время движения; смена настроек показывает итог. Полные placements до/после матрицы совпали. A2 остаётся видимой при replay A1; исходник независим; duplicate SVG IDs не обнаружены.
- До revision 4 все18 осмотрены увеличенно в Fit, скриншоты показаны в протоколе браузера. Файловый контактный лист ещё не сохранён.
- Public routes и anonymous guards: smoke /,/search,/documents,/about,/contribute,/login,/register,/forgot-password, три legal и/account,/superaccount,/read,/input,/edit вdark/light. Защищённые URL показали login; реальные ordinary/superuser страницы не проверялись. Тема восстановлена вdark.
- С false-флагом выполнены rebuild, direct URL и reload: существующий NotFound,0 lab cards; в Nginx за2мин0 запросов rock_type и LogoLabPage. Vite не включил lab chunk в false build. Возвращён true для демонстрации.
- До replay исходник статичен и не монтирует AnimatedLogo. После replay остаются прежние GSAP target null/undefined warnings из неизменённого Home AnimatedLogo (не маскируются). Знак W добавлен только в lab по уточнению владельца.

## Что проверить владельцу после своего commit/push

1. Открыть /logo-lab: исходный образец и18 карточек A1–A6/B1–B6/C1–C6. Подписи полностью английские; кнопки/селекты оформлены как поля сайта. В network при открытии и reload lab не должно быть запросов /rocks/rock_type. Встроенный rockNames.snapshot.json содержит 85 имён; серверные изменения не должны менять логотипы. Ошибки подготовки раскладки/шрифта и retry проверять отдельно; сетевые состояния каталога для lab отменены владельцем в revision 3.
2. В Chrome и Firefox осмотреть все18 в карточках: полные названия, читаемость, отсутствие наложений/обрезки, WWHYPDA, просветыP/D/A. Для C отрицательная W должна читаться как W, через неё виден фон. Оценить плотность, особенно воздушные и опорные варианты.
3. Проверить палитры в обеих темах сайта и четыре reveal, несколько replay во время движения, пару карточек одновременно. После финиша всё видно, координаты не меняются; фон preview совпадает с фоном сайта.
4. Проверить системный reduced motion до открытия и во время проигрывания, клавиатурное управление Tab/Shift+Tab, 200% browser zoom. Повторить на320/390/768 иdesktop1280/1440; управление должно оставаться доступным.
5. Проверить публичность /logo-lab для anonymous/ordinary/superuser без обхода guards; Home/Search и остальные маршруты в обеих темах, с доступными локальными ролями. Не отправлять реальные письма ради smoke.
6. Проверить network/console и уход со страницы: lab не обращается к Google/новым внешним сервисам, нет зависших запросов/новых ошибок. Отличать прежние warnings исходного AnimatedLogo.
7. Сохранить локальные снимки/контактный лист, включая C на контрастной шахматной подложке; подтвердить результаты в активном плане. Проверка шахматной подложки ещё обязательна и не заменена отсутствием path в DOM.

Firefox/OS media/200% zoom, authenticated roles, smoke authenticated-содержимого, проверка ошибки подготовки раскладки и retry и файловые изображения не объявлены выполненными. Владелец не исключал эти проверки из объёма. До подтверждения либо явного исключения обязательных пунктов docs/WORKFLOW.md запрещает completed/archive.

Предлагаемое название коммита: feat(stage-011): add experimental word logo lab. Commit/push выполняет владелец.

Финальная C scale8 regression: все6 outside=overlaps=0, boundsMismatches=0, все6 повторно осмотрены вFit. Агрегаты: [diagnostics.md](diagnostics.md). Финальные точные build/lint команды изvalidation.md выполнены; buildpass, полныйlint58errors/14warnings, scopedlintpass, tests6/6pass.

Revision 3: источник lab заменён на статический JSON по прямому указанию владельца. Предыдущие результаты чтения runtime-каталога описывают происхождение снимка, а не текущий runtime lab. Проверка снимка прошла (7/7 tests); browser/Nginx подтвердили 0 GET каталога на lab, 1 GET при переходе на Search и отсутствие добавочного GET при возврате на lab. Все 18 карточек доступны; C6 сохранила 255 слов и нулевые outside/overlaps/boundsMismatches.

Revision 4: Enlarge и весь увеличенный просмотр с zoom/pan удалены по указанию владельца. Приёмка выполняется в карточках; требования dialog/Escape/возврата фокуса и внутреннего pan исключены. Browser zoom остаётся проверкой адаптивности страницы.

Проверка revision 4: build и scoped lint LogoLabCard прошли, tests 7/7, полный lint остаётся 58 errors/14 warnings. Обновлённый localhost bundle: 18 карточек, Enlarge/zoom/Fit=0, dialog=0; A1 содержит palette/reveal/surface и replay, запуск проверен в браузере.

Revision 5: прежние проверки explicit light/dark surface относятся к предыдущей реализации. Сейчас отдельного выбора подложки нет: preview использует --body-color общей темы, палитра автоматически выбирает соответствующие inks. Все подписи английские. Для проверки подёргивания повторить четыре reveal (в том числе replay во время движения) на своём браузере/Vercel; SVG text больше не является целью анимации, opacity меняется только у обёртки через AttrPlugin.

Локальная проверка revision 5: 18 карточек; кириллицы в main нет, surface controls отсутствуют; кнопки/селекты используют общие CSS classes. Body/preview: light rgb(242,220,179), dark rgb(25,30,36). A2: x/y/rotation/style не менялись при четырёх replay, opacity обёрток принимает промежуточные значения; boundsMismatches=0. На 390px controls помещаются без горизонтального overflow. Скриншот недоступен (браузер отказал в захвате); оценку подёргивания на Vercel владельцем не считать выполненной.

Проверки revision 6: build pass после исправления завершающей запятой JSON; tests 7/7, scoped lint pass, полный lint — прежние 58 errors/14 warnings. В браузере подтверждены ровно 12 ожидаемых IDs, 3 режима без Soft reveal, default Left to right. При общей light теме lab/preview сохраняют dark rgb(25,30,36) и светлый ink; общая тема восстановлена dark. Replay A3 работает, boundsMismatches=0.

Revision 7: только Multicolour, без выбора палитры. Build/scoped lint pass; полный lint — прежние 58 errors/14 warnings. В браузере 12 карточек, в A3 восемь цветов и только селект Animation; старые проверки выбора палитры больше не обязательны.

Revision 8 local QA: build/scoped lint pass, tests9/9; полный lint — прежние58errors/14warnings. Все18:outside/overlaps/boundsMismatches=0, SVG text=0, duplicate IDs=0. 54mode/replay комбинации прошли с двойным запуском, геометрия не меняется. Крупные варианты после настройки: A7/A8=41/18 слов, B7/B8=97/50, C7/C8=73/36, нулевые пересечения/выходы/bounds mismatches. C7:16–27 слов в промежуточном opacity на четырёх кадрах, max pixel-bounds drift0.0000401CSSpx; screenshots осмотрены в протоколе. 390px без горизонтального overflow. Проверить в браузере владельца именно SVG-контуры после refresh нового bundle, а не прошлый SVG text renderer.

Окончательные шесть крупных вариантов повторно проверены после настройки B8:18 mode/replay сочетаний с двойным запуском pass; все границы/пересечения0. Временный mobile viewport снят.

Revision 9: меню Logo lab→/logo-lab, штатный MenuButton, видимость по LOGO_LAB_ENABLED. Browser: переходы с Home/Search pass, 390dark/320light без горизонтального overflow; screenshot меню осмотрен. Build/scoped lint pass, полный lint — прежние58errors/14warnings. Временный viewport снят, общая тема восстановлена dark.
