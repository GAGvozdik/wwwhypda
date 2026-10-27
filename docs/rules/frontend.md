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

Все обычные страницы, включая Search и loading, используют fullScreenContent min-height общей оболочки; footer ниже первого viewport. Legal shell отдельный.
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
- Проверка доступа гостя/неизвестной сессии показывает Login checkingAccess; после подтверждённого входа — безопасный ProtectedPageSkeleton целевого маршрута;
  реальные страницы до проверки не монтируются. Redirect/terms/role gates сохранены.
- Проверка подтверждения/явный resend показывают skeleton именно confirmation
  формы; callback busy true/false не теряется при переходе к обычному login.
  Email на шаге подтверждения маскируется (p***@e***.test); Back to sign in — Link
  с существующим users.link, не submitButton.
- MaintenanceNotice над mounted page через existing ModalWindow; legal links в
  отдельных вкладках. Status проверяется на route/focus/manual retry, throttle1.5s,
  без polling. Никакого logout, очищения drafts, смешивания с terms или POST replay.

ProtectedPageSkeleton не включает
login-specific reCAPTCHA notice. Footer на реальных auth-страницах сохраняет своё поведение;
allowlist/provider/iframe lifecycle не расширяются.

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
  Прежний AnimatedLogo (заменён на Home в stage011): root SVG в пределах42rem/100%, natural aspect ratio, tight viewBox
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

### Stage 011: логотипы главной

- Home использует homeLogo/HomeLogo.tsx: C12 при max-width48rem, B12 выше.
  В DOM только один вариант; desktop wordmark выровнен по hero (max1100px, по2rem с краёв) с исходным
  aspect ratio5800/1050, мобильный диск — квадрат до24rem. Hero и действия сохранены.
- Logo Lab, её route/menu/controls/feature flag удалены. Прежний /logo-lab попадает
  в существующий NotFound через fallback route; отдельной страницы лаборатории нет.
- homeLogo/rockNames.snapshot.json содержит85 полных публичных leaf names/ID от23.10.2026:
  trim только краёв, ordinal sort/dedup, исключены parent=-1 и узлы с детьми.
  Home не запрашивает каталог; Search/дерево продолжают использовать API.
- SVG paths взяты из исходных W.svg/WWHYPDA.svg с сохранением просветов.
  C — диск минус W scale9.6/translate186.585,333.181; центроид площади W700,700.
  Packing denseRows сначала заполняет строки, затем карманы; целые padded bbox
  проверяются raster integral/erosion и spatial hash. Размеры B12[48,43.2], C12[40,36],
  gap1, repeatLimit24 сохранены из выбранных владельцем вариантов.
- Слова рисуются defs/use из frozen wordOutlines.snapshot.json (Afacad Flux600).
  Packing измеряет те же контуры; runtime font loading/text hinting отсутствуют.
  Генератор: scripts/generate-logo-word-paths.py. Проверки: scripts/test-home-logo.mjs.
- Home автозапускает Centre outward на desktop и Word sequence на mobile; меняется только opacity обёрток.
  Координаты/transform контуров фиксированы. useLayoutEffect исключает flash до старта.
  Reduced motion сразу показывает итог; GSAP/resize/media listeners очищаются.
- Тема Home следует Redux isDarkTheme. Tokens home-logo-ink-light/dark в menu.module.scss,
  только Multicolour,8 используемых цветов; light inks ярче по revision23 (contrast3–3.3:1), dark>=4.5:1.
  Отдельной подложки нет. AnimatedLogo больше не монтируется на Home.
- Тяжёлые packing/renderer/outlines загружаются динамически. Одна очередь с yield/abort,
  кэш по каталогу/версии геометрии/шрифта/packing/config ID; тема не пересоздаёт раскладку.
  При resize/unmount поздний результат игнорируется, ошибка подготовки имеет безопасный Retry.
  Место резервируется aspect-ratio; подготовка отображается через общий SingleSkeleton.
  Оба варианта используют штатный цвет table-color и MUI wave как Search, без обводки; radius scoped к HomeLogo.
  Готовый SVG остаётся на прозрачном фоне. Общие skeleton остальных страниц не переоформляются.
- По прямому указанию владельца визуальная проверка выполняется им на Vercel/mobile
  после своего commit/push. Браузерную автоматизацию и статичные превью не использовать.
  Stage011 остаётся открытым до отдельного указания владельца архивировать.
  Текущие сценарии: docs/artifacts/stage-011/acceptance.md.

### Плавные состояния загрузки — дополнение stage 011

- SingleSkeleton и AuthSkeleton используют общую loadingPresentation: минимум750ms с начала
  загрузки; после готовности скелетон гаснет220ms, затем контент появляется220ms.
  Вход скелетона160ms, easing ease-in-out соответствует панелям Search.
  Если загрузка дольше750ms, дополнительной выдержки после ответа нет.
- Уже готовый контент без события loading не удерживается. Новый loading во время exit
  отменяет старые таймеры; unmount/смена состояния очищают timers/media listeners.
  Reduced motion выключает переходы, wave/spinner; минимум750ms сохраняется.
- LoadingSwap использует display:contents, сохраняя flex/grid потребителей.
  Для высоты auto минимальный размер SingleSkeleton задаётся token loading-min-height3rem;
  явно заданные размеры (в том числе компактная кнопка2.5rem) сохраняются.
- AuthSkeleton оставляет реальные поля/значения смонтированными и скрывает/inert до конца
  показа; общий SingleSkeleton не подменяется auth-формой.
- ProtectedRoute/SuperProtectedRoute используют тот же переход. Пока проверка не завершена,
  приватных children нет. После подтверждения доступа страница монтируется сразу скрытой/inert,
  чтобы её запросы не ждали окончания скелетона. Редиректы и разрешения прежние.
- Search results loader смонтирован постоянно: overlay появляется/исчезает через общий
  переход, таблица сохраняется под ним; обрыв анимации внешним условным unmount устранён.
  API/CSRF/CAPTCHA/session и сетевые задержки не менялись.
- По указанию владельца браузерную автоматизацию и статичные превью не использовать.
  Владелец проверяет формы, Search, account/input/edit/read и обе роли/темы на Vercel.
- Исправление мерцания аккаунта: /account обёрнут только SuperProtectedRoute с
  redirectIfSuperuser=true; он проверяет и сессию, и роль. Дополнительный ProtectedRoute
  не нужен и не должен создавать второй lifecycle проверки/показа loader.
- Route LoadingSwap использует animateEnter=false; скелетон проверки не гаснет/не появляется повторно
  на handoff после login. Минимум750ms, единственный fade-out и reveal контента сохранены.
  Обычные формы и SingleSkeleton сохраняют прежний fade-in. Приватные children до проверки
  не монтируются, после подтверждения скрыты/inert до конца transition; редиректы прежние.

### Stage011: загрузка таблиц аккаунтов и защищённых страниц

- Guards для подтверждённой ранее сессии показывают ProtectedPageSkeleton: account для /account,
  superaccount для /superaccount, dataset для /input,/read,/edit. Макет не читает приватные
  данные и не монтирует настоящую страницу до успешной проверки. Auth/role/redirects прежние.
- UserSuggestions/InputSuggestions и profile loading начинаются с true, поэтому первый
  commit не показывает пустую таблицу перед запросом. Админский список пользователей имеет
  отдельный usersLoading, не зависит от завершения /users/ profile request.
- Все три AG Grid используют AccountTable: фиксированная высота account-table-height25rem,
  grid монтируется только с готовыми данными и остаётся в layout с visibility:hidden/inert.
  Непустой ответ ждёт onFirstDataRendered, пустой — onGridReady, затем два RAF.
  Ключ подготовки меняется при загрузке/смене rows; controller отменяет старые кадры на
  reload/unmount. Нет сброса состояния в effect или дополнительной задержки API.
- useLoadingPresentation удерживает skeleton минимум750ms с начала цикла, затем exit220ms
  и content reveal220ms. Ошибка имеет role=alert, настоящий пустой ответ не зависает.
  Reduced motion сохраняет minimum, отключая визуальные эффекты.
- alwaysShowVerticalScroll резервирует скроллбар grid и исключает смену ширины колонок при
  заполнении; document html сохраняет overflow-y:scroll и scrollbar-gutter:stable.
  Пагинация/колонки/действия/права/данные сохранены; AG Grid Community.
- Регрессия: scripts/test-account-loading.mjs вместе с loading/navigation/auth и Home tests.
  Визуальная проверка владельцем на Vercel, без браузерной автоматизации агента.

### Stage011: границы skeleton, circular loader и светлая палитра

- SingleSkeleton по умолчанию содержит LoadIcon (isLoadIcon=false остаётся явным opt-out).
  LoadIcon — прежний CircularProgress цвета border, size30 и position:relative/z-index1,
  чтобы абсолютная поверхность не закрывала индикатор. AccountTable и ProtectedPageSkeleton
  тоже используют общий LoadIcon; AuthSkeleton сохраняет свой индикатор.
- SingleSkeleton box-sizing:border-box, overflow:hidden и radius на контейнере; поверхность
  имеет inset0 и radius:inherit. Search parameters radius0.25rem, tree/results0.5rem.
- Отступы формы Search перенесены в parametersContent под готовым содержимым; skeleton
  покрывает всю parametersPanel. В stacked-loading min-height24rem, в wide — прежняя
  высота workspace. Tree overlay закреплён на treePanel и покрывает также gutter.
- Light inks логотипов осветлены в menu.module.scss; dark inks и фон прежние.
  По revision23 все10 light slots заметно ярче и насыщеннее: contrast3–3.3:1 на светлом body; dark>=4.5:1. Проверяется тестом.

- Регистрация: checkboxRowError подсвечивает текст согласия и checkbox, но не меняет
  цвет policyLink. Ссылки документов сохраняют tree-text во всех состояниях (включая
  visited/focus), чтобы валидация не вызывала переход между красным и основным цветом.

### Stage011 revision22: гостевой fallback, реальные макеты и footer

- Guest/unknown session: Login checkingAccess остаётся skeleton до redirect; это реальная
  auth-разметка с прежним data-auth-check/notice и без запросов/модальных действий Login.
- showPageSkeleton выбирается один раз при mount из authPresentation. В памяти только
  номер ранее подтверждённого session epoch, записанный после успешного login/check.
  sessionVersion меняется при logout/session changes; terms/sessionUnavailable запрещают
  page hint. Не использовать localStorage.isSuperuser как свидетельство входа.
- Hint не кэширует разрешение и не отменяет /users/check. isAuth остаётся null до ответа;
  private children не монтируются. Отказ забывает hint и использует Login перед редиректом.
  После полной перезагрузки без доказанной сессии fallback — Login.
- ProtectedPageSkeleton использует реальные accountsStyles/users классы: logout сверху,
  центрированный заголовок,25rem table, профиль/публичные privacy строки для ordinary,
  второй table для admin, delete action снизу. Ни AG Grid, ни private records не монтируются.
- Dataset макет использует MUI Stepper, те же stepperPage/stepContent34rem/stepTitle4rem/
  measurementGrid/stepActions/tableArea/stepNavigation. Только безопасный activeStep из
  localStorage определяет шаг/завершение; private draft contents не читаются и не изменяются.
  /read и /edit передают свои kind/title; Add data notice только у /input.
- MainWindow применяет fullScreenContent ко всем обычным страницам, включая Search и
  loading/login. body min-height=100dvh-measuredHeader+1rem удерживает footer ниже первого
  экрана; footer остаётся в document flow и доступен прокруткой. Legal layout прежний.
- Проверки: route-placeholders, account-loading, maintenance-guard, account-session,
  auth/privacy/navigation/loading/Home. Визуальное совпадение подтверждает владелец на Vercel.

- Revision24: в dataset/read/edit placeholder степпер и page/table titles отображаются
  обычным видом, без Skeleton/TextPlaceholder. CustomStepIcon вынесен из stepper.tsx в
  inputData/StepIcon.tsx и используется обоими представлениями. Загрузка таблицы сохранена.

### Stage011 revision25: статичные подписи и модальные переходы

- В account/admin placeholders заголовок страницы, Name/Email, Access/correction/deletion,
  публичный support email и Logout does not delete — обычный текст/ссылка. Skeleton только
  у таблиц; имена и email тоже без полос skeleton, неизвестные значения ожидают ответ профиля без имитации текста.
- ModalWindow использует MUI Fade и closeAfterTransition:220ms enter/180ms exit,
  тот же transitionDuration у backdrop. Последнее открытое содержимое хранится до onExited,
  даже если caller сразу очистил children. После exit освобождается.
- Закрывающееся содержимое inert/aria-hidden; focus trap/restore, Escape/backdrop close,
  labelledBy/describedBy и portal container сохраняются. Подтверждения read/edit/submit,
  terms и maintenance наследуют общую анимацию.
- DeleteAccount использует тот же useDialogMotion/transitionDuration для Dialog/backdrop.
  Pending не допускает закрытия; пароль очищается на close, error — после exit (и при
  следующем open), чтобы размер тела не менялся во время затухания.
- prefers-reduced-motion даёт0ms. Новые запросы/действия не добавлены; CSRF/session/удаление
  и существующие тексты сохранены. Проверки: test-dialog-motion.mjs + общая регрессия.

### Stage011 revision26: полный переход маршрутов и стабильная загрузка

- У имени и email нет skeleton даже для значений. В публичном макете только нормальные
  подписи/зарезервированное место; реальные значения приходят после проверки и профиля.
- Dataset placeholder использует те же treeText/stepperPage/StepLabel и CustomStepIcon,
  что реальная страница. Цвета номеров не переопределяются для loading.
- RouteTransition в App между RecaptchaProvider и MainWindow управляет displayed Location.
  BrowserRouter URL обновляется штатно; исходящий контент затухает180ms, затем монтируется
  последний выбранный route. Два RAF фиксируют opacity0 до появления220ms.
  MainBody Routes location и layout MainWindow используют именно displayed Location.
- Последующие переходы заменяют pending target; возврат к текущему отменяет exit.
  Таймеры/RAF отменяются на cleanup, StrictMode безопасен. Reduced motion сразу ready,
  без ожидания exit/RAF, CSS transition:none. Слои страниц не дублируются.
- MainBody entering/exiting inert/aria-hidden, outgoing pointer events выключены.
  Context публикует live target и распознаёт уходящий route ещё до layout effect.
  RouteRedirect не выполняет устаревший Navigate; публичный fallback остаётся видимым
  до глобального exit, чтобы guest redirect не давал пустой кадр.
- ProtectedRoute/SuperProtectedRoute используют LoadingSwap animateSwap=false: сохраняется
  минимум750ms и hidden/inert, но нет повторного локального exit/reveal всего макета.
  Это исключает затухание статичного степпера при готовности данных. Общий route transition
  плавно показывает сам skeleton; SingleSkeleton/AccountTable и auth-запросы прежние.
- useLoadingPresentation skipExit применяется только к этой статичной смене guard content.
  Обычные data loaders сохраняют220ms exit и вход/проявление.
- RecaptchaProvider остаётся с live pathname и сразу закрывает старую область, независимо
  от180ms визуального exit. Session/CSRF/роль всё ещё проверяются сервером; hint не даёт доступ.
- Регрессия: test-route-transitions.mjs вместе с session/privacy/CAPTCHA/loading/navigation.
  Визуальные кадры/плавность проверяет владелец на Vercel; агент браузер не использует.

- Revision27: у Home logo skeleton убрана обводка и отдельная wave/surface палитра.
  Используется штатный SingleSkeleton background table-color и MUI wave как в Search
  в обеих темах. Удалены неиспользуемые loading-surface/border/wave tokens; radius сохранён.

### Защищённые страницы: initial loading — revision28

Один public skeleton сохраняется от auth check до готовности профиля, всех таблиц
и первого paint AG Grid. Данные готовятся под visibility:hidden cover; private page
монтируется только после подтверждения прав. Поздние обновления не перезапускают
initial page cover. Гостевой login сохраняет layout отдельной /login через
 display:contents обёрток LoadingSwap. В Add data скелетоны кнопок Clear all/Add row/
Delete row без circular loader; у таблиц он сохранён.
### Мобильная Home после логотипа — revision29

C12 до48rem после завершения sequence reveal и паузы0.6s плавно исчезает, затем
height и вертикальные margins сворачиваются до0: основной контент поднимается
естественно, без автопрокрутки. B12 desktop остаётся. При reduced motion мобильная
область освобождается сразу. GSAP cleanup восстанавливает inline styles при уходе/
смене варианта. Только мобильные Home title/badge/описания/feature/CTA стали компактнее;
размеры и цвета слов внутри логотипов сохранены.
Revision31 (заменяет CSS-попытку revision30, не прошедшую owner QA): Search передаёт
isSearching через SearchResultsTable в DataTable. useLoadingPresentation удерживает
pending до конца750ms minimum/220ms exit; штатный AG Grid suppressNoRowsOverlay
отключает пустое сообщение, пока pending. После готовности пустой результат показывает
штатную надпись. Таблица остаётся смонтирована; от внутренних CSS-классов AG Grid
поведение не зависит. Регрессия проверяет всю цепочку передачи состояния.
Revision32: при первом открытии Search с пустым currentRTID дерево после загрузки
каталога выбирает All rock types — единственный root, найденный findAllRockTypesId.
Используются реальные ID/rt_name; selectedItems синхронизирован с Redux. Существующий
выбор не перезаписывается; All parameters остаётся выбранным, запрос только по Find data.