# Frontend: разработка и сохранение UX

### 1. Компоненты, библиотеки и типы

- Использовать существующие React + TypeScript + Vite, SCSS Modules, Axios, Redux и MUI. Для новых стандартных элементов преимущественно использовать уже подключённые MUI-компоненты. Не добавлять альтернативную UI-библиотеку и не переписывать рабочие нестандартные элементы ради унификации.
- Компоненты должны иметь понятную ответственность и обычно быть короче 400–600 строк. Не раздувать их; при необходимости выделять связанные компоненты, hooks и helpers в пределах задачи, сохраняя поведение, комментарии и закомментированный код.
- Переиспользовать общие типы из `wwwhypda-frontendV2/src/common/types.ts`. Не создавать дублирующие типы без проверки существующих.
- Сохранять структуру `src/redux/store.ts` и `src/redux/actions.ts`, существующие actions и способ работы с общим состоянием. Не вводить второй store и не мигрировать Redux вне задачи.

### 2. Только AG Grid Community

- Таблицы реализовывать только на бесплатных возможностях `ag-grid-community`; `ag-grid-react` разрешён как React-обёртка.
- Запрещены `ag-grid-enterprise`, Enterprise-модули, их регистрация, платные функции/API и другая табличная библиотека, включая MUI Data Grid. Старые зависимости не дают разрешения использовать их.
- Если требование нельзя выполнить бесплатным API, описать ограничение и предложить Community-совместимое решение; платную функциональность самостоятельно не подключать.
- Сохранять предусмотренные задачей данные, редактирование, сортировку, фильтрацию, экспорт и пагинацию. Не переносить серверную пагинацию, внешний MUI pager, page size 10, fixed-height foundation или мобильные списки neurobaza как обязательные для wwwhypda.
- Использовать актуальные совместимые Community/React-пакеты из package.json; прежнее наблюдение о наличии Enterprise не считать текущим состоянием. Изменение зависимостей — только по активному плану.

### 3. Палитра, шрифт, темы и SCSS

- Единственный источник цветов и размеров шрифтов — `wwwhypda-frontendV2/src/components/menu.module.scss`. Примеры реальных переменных: `color: var(--tree-text)`, `background-color: var(--body-color)`, `font-size: var(--main-font-size)`.
- Цветовые переменные wwwhypda содержат готовые CSS-цвета, а не RGB-каналы neurobaza. Не копировать конструкции `rgba(var(--accent-primary), 1)` или чужие имена переменных без соответствующих определений.
- Все цвета использовать через `var()`, размеры шрифтов — только через переменные общей палитры. Недостающую переменную добавить в общий файл с корректными значениями для обеих тем, если это требуется задачей; не хардкодить цвет или размер шрифта локально.
- Весь интерфейс использует `Afacad_Flux`, включая MUI, таблицы, input, tooltip и dialog. Не заменять его на MyRuda или шрифт библиотеки по умолчанию.
- Ранний same-origin `public/theme-bootstrap.js` восстанавливает тот же `localStorage.isDarkTheme` через стабильный `html[data-theme]` до первого paint (default dark, storage error не ломает bootstrap); React синхронизирует атрибут и `.dark` без восстановления светлой темы в cleanup. Палитра остаётся только в `menu.module.scss`.
- Сохранять механизм Redux `isDarkTheme`, localStorage `isDarkTheme` и CSS Modules `.dark`. Не внедрять `ThemeProvider`, `createTheme`, `CssVarsProvider`, `useColorScheme` или другую параллельную систему тем без явного требования.
- Основные стили размещать в SCSS-модуле рядом с компонентом. Если библиотечная стилизация MUI не решается SCSS, разрешены необходимые `sx`/`slotProps` и существующие библиотечные механизмы в TSX. Это уточнение правила SCSS, а не перенос всех стилей в TSX; цвета и размеры шрифтов также брать через `var()`.
- Для portal-компонентов MUI (tooltip, popper, menu, dialog) проверять доступность переменных текущей темы и стиль тела/хвостика. Использовать действующий theme scope/контейнер; не отключать portal механически, если это ломает позиционирование или доступность.

### 4. Тексты интерфейса

- Короткие пользовательские строки — подписи кнопок и полей, заголовки, tooltip, сообщения ошибок/успеха — хранить в `wwwhypda-frontendV2/src/common/error_messages.json`, проверяя и переиспользуя существующие ключи.
- Сохранять язык текущего интерфейса: в wwwhypda сообщения преимущественно английские. Русский язык ответов и документации не означает перевод UI на русский.
- В фактически редактируемом компоненте переносить короткие литералы интерфейса из JSX/return в общий словарь. Не выполнять массовую миграцию соседних компонентов вне задачи.
- Большие юридические документы, пользовательские данные, API identifiers и технические строки не являются короткими UI-текстами и не переносятся в этот словарь по данному правилу.

### 5. UX, доступность и поддерживаемые размеры

- Перед изменением общего компонента, SCSS, темы или таблицы определить все страницы-потребители и проверить их после изменения. Не проводить попутный redesign; сохранять layout, размеры, меню, дерево, формы, таблицы, пагинацию и порядок действий, если задача явно не меняет их.
- По смыслу сценария сохранять или реализовывать loading/error/empty/success и предотвращать повторную отправку во время запроса. Ошибка должна быть видима и понятна; disabled-кнопка не должна молча скрывать причину отказа.
- Loader/skeleton показывать только при реальном ожидании, размещать в области заменяемых данных и проверять в light/dark. Не добавлять искусственные задержки и skeleton к сразу готовым формам.
- Обеспечивать клавиатурную навигацию, видимый фокус, подписи input/checkbox и доступное описание ошибок. Проверять tooltip/menu по наведению и фокусу; переход Tab к пунктам не должен преждевременно закрывать меню. Не обозначать ошибку только цветом.
- Для изменяемых password/input проверять обычный ввод, focus, ошибку и browser/password-manager autofill, сохраняя проектный шрифт и цвета в обеих темах.
- Историческое упоминание предупреждения 600×559 не соответствует текущему `MainWindow`: в baseline цикла 005 такого guard уже нет, в этом цикле он не удалялся. Не заявлять полноценную поддержку любого малого экрана без приёмки; проверять responsive reflow, zoom, длинный текст, дерево и отсутствие обрезанного управления. На крайне малой высоте допустим внешний scroll вместо скрытия интерфейса.
- Юридические `/privacy-policy`, `/cookie-policy`, `/user-agreement` имеют отдельный доступный layout для маленьких экранов без активного Google-контекста (executor недоступен). Сохранять эти свойства и проверять их на desktop/mobile. Не заменять React-страницы PDF-маршрутами из neurobaza.
- Если задача отдельно вводит мобильный UI, обеспечить тот же состав данных, порядок, права и действия; выбор breakpoint/layout описывается в задаче wwwhypda, а не копируется из neurobaza.

### Search и непрерывная навигация — цикл 005

- Тип/ключ родителя MainWindow остаётся стабильным на публичных, action и
  защищённых маршрутах. CAPTCHA scope не должен возвращать null либо делать
  document reload; auth guards скрывают только защищённое содержимое.
- По уточнению владельца общая высота wide Search с toolbar задана фиксированными 38rem без
  привязки к viewport/outerHeight: при приближении разрешён рост выше окна с
  внешней прокруткой; при отдалении панели должны уменьшаться. Размер всей области в rem
  не пересчитывается JavaScript при resize/zoom; панели занимают остаток после toolbar. Точное заполнение любого окна
  при 100% не гарантируется. Браузерный zoom/DPR не угадывается. В сложенной раскладке блоки идут последовательно
  и доступен внешний scroll; минимальная высота не оправдывает обрезание controls.
- Форма имеет равные боковые отступы и Search у нижнего края, список параметров
  прокручивается отдельно. CAPTCHA/search error локален результатам, не скрывает
  форму и допускает retry. Pending предотвращает повторную отправку.


### Реализация Search и аккаунтов — цикл 006

- RadioGroup начинается с выбранного по умолчанию All parameters; некорректный/пустой выбор — null, all —
  отдельная строка, не числовой ID. Один explicit submit → execute search → GET /rocks/search
  с исходным rt_id и parameter_id. Snapshot/abort/stale guard не допускают старый ответ
  после смены фильтров/ухода. Ошибка локальна, прежние результаты не стираются до ответа.
- Long-format таблица различает образец/породу/параметр/единицы и сохраняет повторы,
  row_id; все строки доступны XLSX, Community фильтры/сортировка/пагинация сохранены.
  Search использует paginationAutoPageSize по доступной высоте grid, ручной selector
  размера страницы отключён; горизонтальный scroll научных колонок остаётся.
- View/Tree/Search form/Results и Show all управляют локальной видимостью без нового
  store/storage. Панели остаются смонтированными, inert исключает скрытые controls;
  скрытие сфокусированной области возвращает фокус на её toggle. Все восемь состояний
  допустимы; Find раскрывает Results, окончание запроса после hide не раскрывает её.
  CSS tracks перераспределяют пространство за 220ms, reduced-motion отключает переходы.
  Одна wide панель занимает workspace до 94rem; общая wide height 38rem с toolbar, stacked панели 12/24/32rem.
  Высота toolbar измеряется ResizeObserver в CSS px (включая перенос); из 38rem
  вычитаются она и 1rem отступа, минимум панели 8rem. Viewport/DPR не измеряются.
- Дерево показывает All rock types только для идентифицированного корня, itemId=rt_id,
  raw имя в Redux сохранено. Корень/группы 1.25/1.125rem, weight 700; лист прежний 1rem/400.
  Отступ прямого content 0.75rem + depth*1.25rem для любой глубины, группы определяются
  непустым списком дочерних узлов. Выбор через штатный MUI selection callback.
- Единственный внешний scrolling element html: overflow-y:scroll, scrollbar с palette.
  MUI scroll lock сохранён; отдельный stable gutter не дублирует его компенсацию.
  Постоянная видимость зависит от OS overlay/auto-hide; фактическая визуальная проверка
  обеих тем/браузеров/Modal и анимации записана как owner-приёмка в архиве 006;
  формальная матрица/дополнительные снимки исключены владельцем, не объявляются выполненными.
- /account и /superaccount: прежний Logout сверху справа перед контентом в нейтральном
  контурном стиле, Delete account по центру нижнего блока после контента. Dialog/CSRF/session handlers без изменений.
  Контейнер до 72rem; кнопки не fixed. Расположение и стиль приняты владельцем; источник и ограничения browser-проверок в архиве 006.

Search не использует fullScreenContent min-height общей оболочки; Home его сохраняет.
При возврате фокуса с скрываемой панели используется preventScroll, без скролла на mount.

В Search внешний treePanel имеет radius 8px и overflow:hidden, treeBody наследует
radius, сохраняя внутреннюю прокрутку. Это обрезает углы области в Chrome/Firefox;
нативная форма thumb Firefox остаётся системной, одинаковый radius thumb не гарантируется.


### Stage 009: continuation, loading, maintenance (local)
- Одна RegistrationConfirmation для register/login continuation; только явно заданный
  email, локальный ASCII code, fresh confirm_registration/resend_code token на каждое
  действие. Подтверждение возвращает к обычному login; пароли/коды вне URL/store/logs.
- /login recaptchaRoutes разрешает login + confirm_registration + resend_code;
  iframe остаётся lazy и уничтожается при уходе. Mock provider preview не доказывает
  реальную доступность Google. No automatic send/activation/JWT on pending login.
- По уточнению владельца новый AuthSkeleton относится ТОЛЬКО к login/register/
  forgot-password/confirmation. Реальная разметка текущей формы остаётся mounted,
  invisible/inert при ожидании; она задаёт точный natural size. Контур как authForm
  (общий formContour: 1px/25px + прежняя modal shadow), прежний form-color, MUI wave слева направо и existing LoadIcon по центру.
  Search/tree/table/profile loaders возвращены к прежнему коду SingleSkeleton;
  никаких новых borders/background/min-height для них.
- Проверка доступа рендерит реальный Login checkingAccess под auth skeleton, без
  requests/модальных окон из самого login. После auth guard действуют прежние
  redirect/terms/role gates. Account-shaped 34rem placeholder удалён.
- Проверка подтверждения/явный resend показывают skeleton именно confirmation
  формы; callback busy true/false не теряется при переходе к обычному login.
  Email на шаге подтверждения маскируется (p***@e***.test); Back to sign in — Link
  с существующим users.link, не submitButton.
- MaintenanceNotice над mounted page через existing ModalWindow; legal links в
  отдельных вкладках. Status проверяется на route/focus/manual retry, throttle1.5s,
  без polling. Никакого logout, очищения drafts, смешивания с terms или POST replay.

Во время Login checkingAccess на /account/input footer показывает ту же
reCAPTCHA подпись, что у обычного login: data-auth-check marker и CSS :has без
отдельного state/effect. После проверки действует обычная route visibility.
Это только текстовый notice; allowlist/provider/iframe lifecycle не расширяются.

Footer notice скрывается через visibility:hidden, не display:none: его реальная
ширина/высота и переносы сохраняются при route/guard transition. LegalLinks не
перецентрируются из-за исчезновения строки. Никакой фиксированной угаданной
высоты footer, новых Google requests или публичного текста документов это не вводит.

Общий formContour задаёт рамку1px, скругление25px и тень для auth форм,
их skeleton и ModalWindow (включая edit/submit choice, updated terms и техработы).
Фон и размеры существующих форм сохранены; панели Search/tree не меняются.
Maintenance mailto/legal links используют users.link, как под login; static
maintenance build получает те же канонические Sass правила и палитру.

inputContour включает formContour, переопределяя скругление на прежние4px
и цвет на field-contour-border. Фон/текст, отступы, autofill/error/disabled
сохранены, checkbox/radio используют прежние компоненты.

В светлой теме form-contour-border — смесь30% tree-text +70% form-color;
field-contour-border ссылается на него. Hover полей —45% tree-text, focus/active —85%,
остальное form-color. Form-contour-shadow — нейтральная полупрозрачная тень.
В тёмной теме цвет рамки — menu-border, тень — under-body-color; прежние
hover/focus сохранены. Все tokens находятся в menu.module.scss.

В правой части MainMenu сначала иконка аккаунта, затем переключатель темы;
margin-left:auto у accountItem сохраняет выравнивание пары справа.


### Stage 010: Home и Search
- Home h1 использует общий token3rem, до40rem —2rem; остальные заголовки прежние.
  AnimatedLogo: root SVG в пределах42rem/100%, natural aspect ratio, tight viewBox
  реальных букв, без13vh/95vw и counter-zoom. GSAP/masks сохранены; reduced-motion
  завершает timeline, listener/timeline очищаются, конфигурация букв memoized.
- В stacked Search форма растёт по содержимому без внутреннего scroll параметров;
  wide workspace>=65rem сохраняет прежнюю высоту/внутренний scroll длинного списка.
  Radio+описание+символ слева, units справа; grid допускает переносы без ellipsis.
  All parameters — отдельный вариант; sup/sub и единое radio label сохранены.
- Parameter HTML поступает из публичного каталога, не из InputData заявки.
  Новый пользовательский/import путь в каталог должен отдельно проверять доверие
  и sanitization; наличие dangerouslySetInnerHTML не является разрешением HTML ввода.
- XLSX экспорт использует official SheetJS CE0.20.3 (Apache-2.0), все переданные
  результаты, не только страницу. Общий helper проверен roundtrip125 строк,
  zero/null/Unicode и строкой, похожей на formula. AG Grid остаётся Community.

### Stage 011: локальная лаборатория логотипов

- Публичный `/logo-lab` включается `LOGO_LAB_ENABLED` в common/experimentalFeatures.ts;
  после изменения нужен rebuild. При false — существующий NotFound, без mount lab,
  API каталога и загрузки lab chunk. Lazy импорт; при LOGO_LAB_ENABLED=true пункт Logo lab в основном меню ведёт на /logo-lab; это выключатель
  эксперимента, не access control. Redux/auth/CAPTCHA/transport не менялись.
- Для lab используется статический rockNames.snapshot.json: 85 полных имён и ID из
  публичного Search, снимок от 2026-10-23. Запросов каталога и автоматического обновления
  на lab нет; Search/дерево используют актуальный API без изменений. При создании снимка
  исключены parent=-1 и узлы с детьми; trim только краёв, стабильные ordinal sort/dedup,
  moderation status не фильтруется. Loading/error/retry и abort относятся к подготовке
  раскладок; пустой снимок показывает empty. Данные снимка проверяются unit test.
- SVG paths исходных W.svg/WWHYPDA.svg, включая nonzero countersP/D/A. C — диск минус W,
  а не заливка поверх слов. Packing принимает целые padded bbox через raster integral
  с erosion; пространственный индекс исключает пересечения. Слова рисуются SVG-контурами, полные имена сохранены в title.
- Afacad Flux600 заранее преобразован в wordOutlines.snapshot.json. Packing использует bounds этих же контуров; font loading/canvas/text hinting не участвуют. После mount/resize проверяется getBBox обёрток use, packing заново не запускается.
- 9 configs используют denseRows с тремя размерами слов в каждой группе, квотами направлений,
  промежутками и размерами. Обход чередует регионы, чтобы bounded budget не оставлял
  только верхнюю половину. Кэш по каталогу/версии геометрии/шрифта/packing/config ID,
  очередь одна с yield/abort; palette/theme/replay/resize не являются ключами.
- Новые palette/size tokens только в menu.module.scss. Наборы inks
  используют тёмный набор; lab локально применяет существующий класс dark из menu.module.scss. Фон --body-color, без отдельного surface selector; тема остальных страниц не изменяется.
  Только Multicolour (8 цветов), без селекта палитры. Проверенные inks>=4.5:1.
- Новые карточки открываются в финальном состоянии. Три opacity reveal (left/sequence/centre; default left) конечны,
  меняют только атрибут opacity обёрток слов, не геометрию/transform контуров; settings останавливают replay и показывают итог. Timeline и
  media/resize listeners очищаются; reduced motion сразу показывает все слова.
- Логотипы показываются в карточках с независимой анимацией на штатном тёмном фоне сайта. Кнопки используют общий submitButton, селекты — inputField из menu.module.scss; UI полностью английский (Play animation). Увеличенный просмотр и его controls удалены по указанию владельца.
- AnimatedLogo/Home не изменены. Lab-only wrapper до replay рисует статичный snapshot
  активных исходных paths/masks/transforms, затем remount AnimatedLogo; W mark добавлен
  только в lab по решению владельца. Прежние GSAP warnings отсутствующего знака в
  AnimatedLogo сохраняются, не скрываются глобальным подавлением предупреждений.
- Реализация ещё проходит owner QA. Точные результаты и оставшиеся Firefox/media/
  zoom/roles/smoke/artifacts проверки: docs/artifacts/stage-011/acceptance.md.

- По revision 6 в lab после дополнения revision 8 доступны 9 вариантов: A10–A12, B10–B12, C10–C12. Soft reveal исключён.

- Revision 8: в новых композициях названия рисуются SVG defs/use из wordOutlines.snapshot.json (Afacad Flux600, wght600/slnt0). Packing берёт bounds из того же snapshot; renderer не использует живой text/font/canvas. Snapshot генерируется scripts/generate-logo-word-paths.py, без новых browser deps. SVG title сохраняет полное имя. Контуры и transforms статичны; reveal меняет только opacity обёртки. C: W scale9.6/translate186.585,333.181, центроид площади700,700. A10–A12/B10–B12/C10–C12 заменяют прежние варианты. У всех B полный ряд. Сначала заполняются строки, затем свободные карманы; bbox/collision checks сохранены.

- Указание владельца26.10.2026: визуальную приёмку /logo-lab он выполняет сам на Vercel/мобильном после своего commit/push. Не автоматизировать браузерную проверку и не генерировать/отправлять статичные превью без нового прямого поручения.

- Revision12: B10–B12 всегда в одноколоночном wordmarkGrid, по одной карточке на всю доступную ширину окна. У lab нет max-width96rem; высота B-preview/SVG автоматическая по исходному viewBox, чтобы логотип заполнял ширину без искажения aspect ratio. Для A/C сохраняется двухколоночная desktop grid и одна колонка на узких экранах. Визуальная проверка по-прежнему только владельцем.
