# Denn — guía de producto y diseño

> Contexto vivo para diseñar y construir nuevas superficies de Denn. Esta guía documenta el producto y el lenguaje visual que existe hoy en `web/`; no es una propuesta para reemplazarlo.

## Register

product

## Users

Personas que consumen más de un tipo de medio —películas, series, juegos, música y libros— y quieren descubrir títulos, registrar su progreso y conservar una colección personal.

Usan Denn en dos modos:

- **Exploración pública:** descubrir sin crear una cuenta, buscar títulos, abrir detalles, revisar galerías, plataformas y listas públicas.
- **Organización personal:** iniciar sesión solo cuando necesitan guardar, calificar, reseñar, marcar favoritos, crear listas o consultar su perfil y progreso.

El contexto de uso es de sesiones cortas y repetidas: navegar visualmente, reconocer una portada, decidir rápidamente qué hacer con ella y volver a una colección que sigue creciendo.

## Product Purpose

Denn es un tracker multimedia que conecta descubrimiento público con memoria personal. Su unidad de navegación es el contenido persistido con un id interno estable; el usuario puede explorar libremente y convertir cualquier título en progreso, rating, reseña o elemento de una lista cuando haya intención suficiente.

El producto debe hacer tres cosas especialmente bien:

1. **Invitar a descubrir:** el artwork y la taxonomía por tipo de contenido deben permitir recorrer mucho catálogo con poca fricción.
2. **Convertir interés en memoria:** tracking, rating, favorito y listas deben estar cerca del contenido, con feedback inmediato y reversible.
3. **Hacer visible la identidad del usuario:** el perfil, el progreso, las reseñas y las listas deben sentirse como una colección propia, no como un panel administrativo.

El catálogo público es la puerta de entrada única (`/`). La autenticación es progresiva: explorar no requiere cuenta; guardar una decisión sí.

## Brand Personality

La interfaz actual se percibe como **cinematográfica, curiosa y personal**.

- **Cinematográfica:** imágenes grandes, fondos oscuros, fades hacia negro, banners de artwork y una composición que deja que cada título tenga presencia.
- **Curiosa:** mezcla medios sin jerarquizar uno sobre otro; cada sección usa iconos y metadatos para orientar la exploración.
- **Personal:** el producto cambia de catálogo a colección mediante progreso, ratings, favoritos, perfiles y listas.

La voz debe ser directa y humana. Los labels actuales están en inglés (`View details`, `Add to List`, `Rate This`, `Track this content`); nuevas superficies deben mantener el idioma y la claridad existentes hasta que haya una decisión de localización. Evitar copy promocional grandilocuente: la interfaz ayuda a recordar y decidir.

## Anti-references

Denn no debe parecer:

- un dashboard SaaS claro con fondos crema, tarjetas blancas y métricas como protagonista;
- una hoja de cálculo o un CRUD genérico de listas;
- una galería ornamental que prioriza efectos sobre acciones concretas;
- una plataforma de streaming que oculta el tracking detrás de posters;
- un producto “neón” saturado con gradientes de color compitiendo contra el artwork;
- un sistema con una forma distinta de botón, input o modal en cada pantalla.

En particular, no introducir display fonts para labels, glassmorphism como textura por defecto, radios enormes, motion decorativo, iconos de familias mezcladas ni componentes aislados que ignoren `web/src/components/common/`.

## Design Principles

### 1. Artwork first, interface second

El artwork es el principal elemento de reconocimiento. Utilizarlo como banner, poster o thumbnail antes de añadir decoración. Los overlays existen para asegurar legibilidad y continuidad con el fondo, no para ocultar la imagen.

### 2. Explore anonymously, commit intentionally

La Home, búsqueda y detalle deben ser útiles sin sesión. Las acciones personales deben pedir autenticación en el momento de guardar, conservar `next` y devolver al usuario al detalle original.

### 3. One content vocabulary

Películas, series, temporadas, juegos, álbumes y libros comparten rutas por id, cards, iconos de tipo, metadatos, estados y acciones. Las diferencias de medio se expresan con contenido y datos; no con un nuevo lenguaje de controles.

### 4. Personal state stays close to the title

Tracking, rating, favorito y Add to List pertenecen al contexto del contenido. El feedback debe aparecer junto a la acción, con estados optimistas cuando sea seguro y con una recuperación clara cuando haya efectos relacionados.

### 5. Density follows the job

Descubrimiento usa espacio, imagen y carousels horizontales. Perfil y listas pueden ser más densos: filtros, agrupación, orden, paginación, stats y cambio entre list/gallery. No convertir todas las superficies en una cuadrícula de cards.

### 6. Quiet chrome, expressive media

La navegación, filtros y contenedores son oscuros, sobrios y consistentes. El color fuerte proviene principalmente del artwork; los colores semánticos se reservan para rating, completado, error, warning y selección.

## Accessibility & Inclusion

La referencia de accesibilidad es WCAG 2.1 AA para las superficies existentes y nuevas. Mantener:

- un único `main`, un `h1` por ruta y landmarks nombrados;
- skip link y foco del nuevo `main` después de cambiar de ruta;
- targets primarios de al menos 44 px (`min-h-11`, `size-11` o equivalente);
- foco visible con anillos blancos de alto contraste, no solo cambios sutiles de color;
- controles nombrados con `aria-label`, `aria-pressed`, `aria-selected` o `aria-busy` cuando describan estado;
- navegación por teclado para tabs, carousels, menús, diálogos y reorder de listas;
- `alt` semántico para artwork con propósito, `alt=""` para ambientación decorativa y fallback cuando una imagen falla;
- soporte de `prefers-reduced-motion` y la preferencia de animaciones de usuario;
- zoom y reflow conservados; nunca bloquear el viewport para corregir una composición;
- diálogos con foco gestionado, Escape, botón de cierre y retorno del foco al trigger.

No usar color como único indicador. Cada status, rating, filtro seleccionado, spoiler y estado de carga necesita texto, icono, atributo ARIA o una combinación equivalente.

## Visual Language

### North star

**Una cinemateca personal en movimiento.**

La superficie debe sentirse como un espacio oscuro donde los títulos aparecen desde el catálogo, mientras los controles permanecen lo bastante silenciosos para que la colección del usuario sea lo importante. La imagen puede ser expresiva; el chrome debe ser predecible.

### Color system

La estrategia actual es **dark restrained**: negro y vino casi negro como base, superficies carbón y ciruela como capas, blanco como acción primaria y color semántico solo cuando comunica estado.

Tokens de `web/src/styles/globals.css`:

| Rol | Token | Valor actual | Uso |
| --- | --- | --- | --- |
| Canvas | `--background` | `rgb(0 0 0)` / `#000000` | Fondo base y páginas de catálogo |
| Texto principal | `--foreground` | `rgb(250 250 250)` / `#FAFAFA` | Texto de lectura y headings |
| Surface | `--card` | `rgb(26 26 26)` / `#1A1A1A` | Cards y paneles genéricos |
| Acción primaria | `--primary` | `rgb(242 242 242)` / `#F2F2F2` | Botones principales, con texto `--primary-foreground` |
| Acción secundaria | `--secondary` | `rgb(38 38 38)` / `#262626` | Botones secundarios y controles inactivos |
| Texto muted | `--muted-foreground` | `rgb(166 166 166)` / `#A6A6A6` | Descripciones, metadata y ayudas |
| Borde | `--border` | `rgb(51 51 51)` / `#333333` | Separadores y contornos discretos |
| Focus | `--ring` | `rgb(204 204 204)` / `#CCCCCC` | Ring por defecto de componentes |
| Fondo app | `--color-background-logged-in` | `rgba(13 3 11 / 1)` / `#0D030B` | Perfil, listas, settings y detalle |
| Gradiente hero | `--color-hero-gradient` | `rgba(18 4 15 / 1)` / `#12040F` | Auth, navbar y fades hacia el hero |
| Lista | `--color-list-item-background` | `#1D131C` | Fila/tarjeta de item de lista |
| Lista hover | `--color-list-item-background-hover` | `#2C242B` | Hover de item de lista |
| Overlay | `--color-overlay-blur` | `rgba(6 0 16 / 1)` / `#060010` | Capas oscuras sobre media |
| Empty media | `--color-empty-card` | `rgba(55 65 81 / 1)` / `#374151` | Fallback cuando falta artwork |
| Borde ciruela | `--color-border-purple` | `rgba(57 46 78 / 1)` / `#392E4E` | Separación de superficies especiales |
| Destructive | `--destructive` | `rgb(239 68 68)` / `#EF4444` | Borrar, errores y acciones irreversibles |

Colores semánticos que ya aparecen en componentes:

- **Rating:** amarillo/ámbar (`yellow-400`, `amber-400` y transparencias) con estrella `★`.
- **Completed/success:** verde (`green-400`/`green-500`) con icono de confirmación o barra de progreso.
- **Warning:** amarillo (`yellow-500`) y `AlertTriangle`.
- **Error:** rojo (`red-300` a `red-500`) con alerta y copy accionable.
- **Selection:** blanco sobre negro para filtros activos; no usar un color saturado solo para indicar selección.

Reglas: el artwork aporta la variedad cromática; no teñir el canvas para igualarlo. El blanco sólido es una acción de alto énfasis, no un color decorativo. Un nuevo color necesita una semántica verificable.

### Typography

La voz tipográfica está dominada por **Azeret Mono**, cargada desde `web/public/fonts/azeret_mono.ttf`. Le da a Denn un carácter de catálogo, archivo y herramienta personal. `Segoe UI, Arial, Helvetica, sans-serif` se reserva sobre todo para inputs y algunos párrafos largos donde la lectura continua gana claridad.

| Nivel | Tratamiento actual | Uso |
| --- | --- | --- |
| Display/hero | Azeret Mono, bold/black, aprox. `32–48 px` en desktop; menor en mobile | Título del featured banner y títulos de contenido con artwork |
| H1 | Azeret Mono, `36 px`, bold en listas; `text-3xl`/`text-4xl` según pantalla | Título de ruta o lista |
| H2 | Azeret Mono, `24–32 px`, bold | SectionTitle, About, Ratings, Items |
| Card title | Azeret Mono, `14 px` mobile / `20 px` desktop, bold | Título sobre el fade inferior del poster |
| Body | Azeret Mono en chrome; Segoe UI en descripciones largas cuando se especifica `font-sans` | Descripciones, ayudas y metadatos |
| Label | Azeret Mono, `12–14 px`, medium/semibold | Buttons, filtros, status y controles |

No añadir una segunda familia display. Usar `text-wrap: balance` en headings y mantener el texto de lectura en aproximadamente 65–75ch cuando el layout lo permita. No sustituir Azeret Mono por una sans geométrica genérica sin una decisión de marca.

### Shape, spacing and layout

- Radio base: `--radius: 0.625rem` (10 px); la escala Tailwind deriva `sm`, `md`, `lg` y `xl` de ese valor.
- Cards de media: `rounded-2xl` (16 px) y ratio poster `5 / 8`.
- Inputs, botones y paneles: normalmente 6–12 px; pills y avatars pueden ser `rounded-full`.
- Gutter responsive: `16 px` por defecto, `32 px` desde `48rem`, `48 px` desde `64rem`.
- Contenido: `max-width: 112rem`; banners: `max-width: 128rem`.
- Controles táctiles: mínimo `44 px`; icon buttons frecuentes de `44–48 px`.
- Layout: flex para toolbars y grupos, grid para paneles de lista/perfil, overflow horizontal nativo para carousels.

El espacio es amplio alrededor de hero, secciones y banners, y compacto dentro de filtros, rows y stats. No anidar cards por costumbre: una superficie contenedora debe tener una razón de agrupación.

## Surface map

| Superficie | Estructura | Intención visual |
| --- | --- | --- |
| `/` Home | Navbar flotante, Featured banner, carousels por medio, footer | Descubrir rápido; imagen dominante y navegación horizontal |
| `/search` | Search input persistente, aviso contextual, sección por tipo, empty states | Comparar resultados por medio sin perder la consulta |
| `/content/:id` | Banner de detalle, acciones, About, Where to Watch, Ratings, Gallery | Entender el título y decidir guardar, trackear o calificar |
| `/login`, `/register` | AuthShell centrado sobre MosaicGallery de posters | Onboarding enfocado sin abandonar la personalidad visual |
| `/user/:username` | Banner/avatar, indicadores, tabs Overview/Progress/Lists, filtros | Mostrar identidad, actividad y colección pública |
| `/lists/:id` | Header de lista, ExploreToolbar, items list/gallery, sidebar | Operar una colección con densidad y control |
| `/settings` | Panel único de account, preferencias y sesión | Ajustes claros, sobrios y reversibles |

## Components and patterns

### Navigation

`Navbar` es fixed, transparente y apoyada por `bg-navbar-gradient`. Contiene el logo Denn a la izquierda, search centrado en desktop y auth/user menu a la derecha. En mobile conserva el logo y reemplaza el search por un botón que abre una searchbox gestionada con foco. Mantener el header fuera del flujo del hero y proteger el contenido bajo sus fades.

### Featured banner

`BannerShell`/`FeaturedBanner` usa media full bleed, overlay negro y un fade inferior hacia `--color-background-logged-in`. El contenido vive en la base: icono de tipo, título, autor/metadata y CTA blanco. Los controles son un grupo compacto de botones circulares de 44 px; el autoplay debe poder pausarse y detenerse con hover, focus o preferencia de reduced motion.

### Content cards and carousels

`ContentCard` compone `Card`, `CardMedia` y `CardHoverPopover`:

- ratio poster 5:8, imagen `object-cover`, fallback `--color-empty-card` con icono de tipo;
- fade negro en el 55% inferior para sostener título, icono y metadata;
- link id-first cubriendo la card, con focus ring inset;
- hover/focus/touch abre un popover portal con el mismo artwork, descripción y `Add to List`;
- desktop muestra más densidad y hover; mobile prioriza navegación directa y controles de carousel.

Los carousels usan scroll horizontal/snap, botones prev/next circulares negros y grupos accesibles (`1 of 20`). El carril de tarjetas conserva el ancho y la alineación del contenido; los controles viven en los márgenes exteriores de ese carril para no desplazar ni ocultar la primera o última card. Los estados hover, active y focus comunican que son accionables. No convertir el carousel en una tabla ni eliminar la navegación por teclado/touch.

### Media and banners

Usar `ResponsiveMedia` para imágenes de proveedores: genera `srcSet` para TMDB, IGDB y OpenLibrary y aplica lazy loading salvo contenido prioritario. `BannerArtwork` distingue:

- **cover:** imagen panorámica full bleed, posición `center 35%`;
- **contained-poster:** copia ambient de la portada con blur/brightness y una portada foreground `object-contain` centrada.

No forzar un poster cuadrado a llenar un banner sin ese tratamiento. Los fallbacks deben ser silenciosos, semánticos y conservar la altura del layout.

### Buttons, links and controls

`Button` es la primitiva común: `rounded-md`, `text-sm`, medium, `min-h-11`, gap de 8 px y variantes `default`, `secondary`, `outline`, `ghost`, `link` y `destructive`.

- **Default:** blanco sobre carbón; CTA principal.
- **Secondary:** carbón; acciones complementarias.
- **Outline:** borde y fondo transparente/oscuro; edición o cancelación.
- **Ghost/link:** chrome mínimo; navegación secundaria.
- **Destructive:** rojo solo para borrar o cerrar sesión de forma explícita.

Todos los estados interactivos necesitan default, hover, focus, active/selected cuando aplique, disabled y loading. Los controles muestran `cursor: pointer` cuando están disponibles y `cursor: not-allowed` cuando están deshabilitados. Los icon buttons deben tener nombre accesible, target de 44 px y no depender de tooltip para explicar su función.

### Inputs and search

Los inputs generales usan fondo oscuro, borde blanco/transparente, `rounded-md`/`rounded-xl`, `min-h-11` y focus ring blanco. El search del navbar usa `bg-white/10`, `backdrop-blur-lg`, borde `white/20` y radio 12 px; el search de página comparte la misma silueta.

Los formularios de auth usan `AuthField`: label arriba, input `bg-black/35`, borde blanco tenue, placeholder blanco al 55 %, toggle de password dentro de un target de 40 px y error rojo debajo. El submit ocupa todo el ancho y es blanco.

### Badges, ratings and progress

- `RatingBadge`: pill amarilla/ámbar con estrella y score decimal; etiqueta ARIA completa.
- `StatusBadge`: pill verde para Completed y neutra para Pending.
- `StarRating`: cinco estrellas visuales con slider real de 0.5 a 10; nunca depender solo del dibujo de estrellas.
- Content tracking: select `min-h-11` + Add favorite + Stop tracking; favorite está disponible solo en completed y refleja esa regla en disabled/title.
- Progress/list stats: texto + icono + valor; completion rate usa verde como confirmación y no como decoración.

### Dialogs and feedback

Radix `Dialog`/`Modal` usa overlay negro, panel `bg-background`, borde, radio 8 px, padding 24 px, shadow local y transición de aproximadamente 200 ms. Header tiene título y descripción; footer alinea Cancel/Confirm y el cierre queda disponible salvo loading.

Patrones existentes: RatingModal con slider/review/spoiler, AddToListModal con checkboxes y creación rápida, EditListModal con name/visibility/description y ConfirmDialog para acciones destructivas. Usar inline/progressive disclosure antes de inventar un modal.

`Toast` vive en top-right, con icono y color semántico: success verde, error rojo, warning amarillo, info azul. Debe tener texto, cierre manual y duración razonable; no usar toast para un estado que necesita permanecer visible.

### Profile and lists

El perfil usa banner/avatar, indicadores circulares, tabs con borde inferior blanco para la selección y filtros que se convierten entre grid/list. Los filtros activos usan fondo blanco y texto negro; los inactivos usan transparencia y texto blanco muted.

Las listas usan una superficie de trabajo más densa: `ExploreToolbar`, selects, sort clauses, group-by, búsqueda de items, switch list/gallery y sidebar de acciones/stats/info. La sidebar puede usar cards de panel oscuro con borde; el contenido usa filas de `--color-list-item-background`. Una lista personal muestra Edit/Delete; una dinámica comunica que se puebla automáticamente y conserva el orden personal.

## Motion and state

- Transiciones de estado: 150–250 ms, ease-out; no hacer esperar al usuario con coreografías de entrada.
- Hover de cards/popovers: fade/scale sutil, aproximadamente 180–200 ms.
- Featured banner: rotación controlable; pausar en hover/focus y respetar reduced motion.
- Auth mosaic: movimiento lento y ornamental solo cuando está habilitado; desactivarlo con `data-animations="disabled"` o `prefers-reduced-motion`.
- Loading: mantener geometría con skeletons/placeholders; no reemplazar contenido por un spinner centrado cuando se pueda reservar el espacio.
- Navigation feedback: para acciones de apertura que tardan, mostrar estado local como `Opening details…` sin bloquear el resto de la página.
- Error: explicar qué no pudo cargar y ofrecer Retry/acción concreta. Empty states deben decir qué falta y, cuando sea posible, qué hacer después.

## Do's and Don'ts

### Do

- **Do** reutilizar tokens, `Button`, `Card`, `ContentCard`, `BannerArtwork`, `Modal`, `SectionTitle`, `UserAvatar` y primitives bajo `web/src/components/common/`.
- **Do** mantener el canvas negro/ciruela y dejar que el artwork sea el color dominante.
- **Do** usar Azeret Mono para el chrome de Denn y Segoe UI solo donde mejore la lectura de copy largo o inputs.
- **Do** mantener radios de 6–16 px; reservar `rounded-full` para pills, avatars y controles circulares.
- **Do** proporcionar hover, focus, disabled, loading, error, empty y reduced-motion cuando un componente interactivo lo requiera.
- **Do** conservar el target mínimo de 44 px y el focus ring visible.
- **Do** mantener rutas de contenido id-first y acciones personales cerca del detalle.
- **Do** usar iconos Lucide y el icono de tipo de contenido coherente con `contentTypeIcons.tsx`.
- **Do** medir la composición en 390 px y desktop amplio; mobile colapsa navegación/controles de forma estructural, no mediante texto ilegible.

### Don't

- **Don't** introducir fondos crema, sand o paper: contradicen el canvas negro/ciruela existente.
- **Don't** usar gradientes de texto, bordes laterales de acento ni fondos de stripes/grid decorativo.
- **Don't** combinar un borde decorativo con una sombra amplia; elegir separación tonal/borde o elevación local.
- **Don't** convertir cada sección en la misma cuadrícula de cards ni anidar cards sin una razón de agrupación.
- **Don't** usar glassmorphism como default; el blur existe para search/auth/ambient media con una función concreta.
- **Don't** añadir display fonts, lettering uppercase tracked o una personalidad visual distinta por tipo de medio.
- **Don't** usar color saturado en estados inactivos o como sustituto de texto accesible.
- **Don't** ocultar una acción esencial solo en hover: debe existir en focus y touch.
- **Don't** animar layout properties, bloquear zoom, atrapar scroll o ignorar `prefers-reduced-motion`.
- **Don't** crear un modal para cada acción; agotar primero controles inline, filtros y estados progresivos.
- **Don't** inventar nuevos labels en español dentro de una UI que actualmente está en inglés.

## Evidence and maintenance

Esta guía se extrajo de:

- tokens y breakpoints de `web/src/styles/globals.css`;
- primitives y componentes de `web/src/components/common/`;
- superficies de `web/src/components/pages/` y rutas de `web/src/routes/`;
- documentación canónica en `README.md`, `.docs/architecture/current-state.md`, `.docs/features/implemented.md`, `.docs/technical-debt.md` y `.docs/roadmap/open-plans.md`;
- exploración viva de Home, Search, Detail, Auth, Tracking, Rating, Add to Lists, Profile, Settings y Lists a 1440 px y 390 px mediante `playwright-cli`.

Cuando el código cambie un token, primitive o patrón compartido, actualizar esta guía en el mismo cambio. Si la intención es cambiar el lenguaje visual —no solo implementar una pantalla— actualizar primero esta guía y después los componentes compartidos.
