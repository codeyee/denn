# 🚂 Guía Completa: Desplegar Denn API en Railway

## 📋 Tabla de Contenidos
1. [Resumen de Cambios Realizados](#resumen-de-cambios-realizados)
2. [Opción 1: Despliegue desde GitHub (Recomendado)](#opción-1-despliegue-desde-github-recomendado)
3. [Opción 2: Despliegue desde CLI](#opción-2-despliegue-desde-cli)
4. [Configuración de Variables de Entorno](#configuración-de-variables-de-entorno)
5. [Verificación del Despliegue](#verificación-del-despliegue)
6. [Comandos Útiles](#comandos-útiles)
7. [Solución de Problemas](#solución-de-problemas)

---

## ✅ Resumen de Cambios Realizados

Tu proyecto ya está preparado para Railway. Se han realizado los siguientes cambios:

### 📦 Nuevas Dependencias (`requirements.txt`)
- ✅ **gunicorn** - Servidor web para producción
- ✅ **whitenoise** - Servir archivos estáticos
- ✅ **psycopg[binary,pool]** - Conector PostgreSQL

### ⚙️ Configuración Actualizada (`core/settings.py`)
- ✅ DEBUG dinámico (False en producción)
- ✅ ALLOWED_HOSTS configurable por variable de entorno
- ✅ Base de datos dual: PostgreSQL (producción) / SQLite (desarrollo)
- ✅ Archivos estáticos con Whitenoise
- ✅ CORS configurable por variable de entorno
- ✅ Middleware de Whitenoise agregado

### 📄 Nuevos Archivos de Configuración
- ✅ `Procfile` - Comando de inicio para Railway
- ✅ `runtime.txt` - Versión de Python especificada
- ✅ `railway.toml` - Configuración nativa de Railway
- ✅ `ENV_VARIABLES.md` - Documentación de variables de entorno
- ✅ `static/` - Directorio para archivos estáticos
- ✅ `.gitignore` actualizado

---

## 🚀 Opción 1: Despliegue desde GitHub (Recomendado)

### Paso 1: Subir el código a GitHub

```bash
# Si aún no has inicializado git
git init

# Añadir todos los archivos
git add .

# Hacer commit
git commit -m "Preparar proyecto para despliegue en Railway"

# Conectar con tu repositorio de GitHub (reemplaza con tu URL)
git remote add origin https://github.com/TU-USUARIO/TU-REPO.git

# Subir los cambios
git push -u origin main
```

### Paso 2: Crear Proyecto en Railway

1. Ve a [Railway](https://railway.app/) y crea una cuenta o inicia sesión
2. Click en **"New Project"**
3. Selecciona **"Deploy from GitHub repo"**
4. Autoriza Railway para acceder a tus repositorios de GitHub
5. Selecciona tu repositorio `dennv2`
6. Railway detectará automáticamente que es un proyecto Django

### Paso 3: Agregar Base de Datos PostgreSQL

1. En el dashboard de tu proyecto, haz click derecho en el canvas o presiona el botón **"Create"**
2. Selecciona **"Database"**
3. Elige **"Add PostgreSQL"**
4. Railway desplegará automáticamente una base de datos PostgreSQL

### Paso 4: Configurar Variables de Entorno

1. Click en tu servicio de la aplicación (App Service)
2. Ve a la pestaña **"Variables"**
3. Agrega las siguientes variables:

#### Variables de Django
```
SECRET_KEY=genera-una-clave-super-secreta-aqui
DEBUG=False
ALLOWED_HOSTS=${{RAILWAY_PUBLIC_DOMAIN}}
```

**Cómo generar SECRET_KEY segura:**
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

#### Variables de PostgreSQL (Referencias de Railway)
```
PGDATABASE=${{Postgres.PGDATABASE}}
PGUSER=${{Postgres.PGUSER}}
PGPASSWORD=${{Postgres.PGPASSWORD}}
PGHOST=${{Postgres.PGHOST}}
PGPORT=${{Postgres.PGPORT}}
```

**Nota:** Railway automáticamente reemplaza estas referencias con los valores reales de tu base de datos.

#### Variables de APIs Externas
```
TMDB_API_KEY=tu_tmdb_api_key
IGDB_CLIENT_ID=tu_igdb_client_id
IGDB_CLIENT_SECRET=tu_igdb_client_secret
SPOTIFY_CLIENT_ID=tu_spotify_client_id
SPOTIFY_CLIENT_SECRET=tu_spotify_client_secret
OPENLIBRARY_USER_AGENT=DennAPI/1.0 (tu-email@example.com)
```

#### Variables de CORS (Opcional - para producción con frontend)
```
CORS_ALLOWED_ORIGINS=https://tu-frontend.vercel.app,https://otro-dominio.com
```

### Paso 5: Desplegar

1. Click en **"Deploy"**
2. Railway automáticamente:
   - Instalará las dependencias
   - Ejecutará las migraciones
   - Recolectará archivos estáticos
   - Iniciará el servidor con Gunicorn

### Paso 6: Generar Dominio Público

1. Ve a la pestaña **"Settings"** de tu servicio
2. En la sección **"Networking"**
3. Click en **"Generate Domain"**
4. Railway generará un dominio público como: `tu-app.up.railway.app`

### Paso 7: Actualizar ALLOWED_HOSTS

1. Copia el dominio generado
2. Ve a **"Variables"**
3. Actualiza `ALLOWED_HOSTS` con tu nuevo dominio:
```
ALLOWED_HOSTS=tu-app.up.railway.app
```
4. Railway redesplegará automáticamente

### Paso 8: Crear Superusuario (Opcional)

Para acceder al admin de Django, necesitas crear un superusuario:

1. Instala el CLI de Railway:
```bash
npm install -g @railway/cli
```

2. Inicia sesión:
```bash
railway login
```

3. Conecta con tu proyecto:
```bash
railway link
```

4. Ejecuta el comando para crear superusuario:
```bash
railway run python manage.py createsuperuser
```

---

## 🛠️ Opción 2: Despliegue desde CLI

### Paso 1: Instalar Railway CLI

```bash
npm install -g @railway/cli
```

### Paso 2: Iniciar Sesión

```bash
railway login
```

### Paso 3: Inicializar Proyecto

```bash
cd /home/perso/proyectos/dennv2/api/core
railway init
```

Sigue las instrucciones para nombrar tu proyecto.

### Paso 4: Agregar Base de Datos

```bash
railway add
```

Selecciona **PostgreSQL** con la barra espaciadora y presiona Enter.

### Paso 5: Configurar Variables de Entorno

```bash
# Abre el editor de variables
railway variables
```

O configúralas desde el dashboard web como se explicó en la Opción 1.

### Paso 6: Desplegar

```bash
railway up
```

Este comando subirá tu código y desplegará la aplicación.

### Paso 7: Abrir Dashboard

```bash
railway open
```

Esto abrirá el dashboard web donde puedes:
- Ver logs en tiempo real
- Configurar variables adicionales
- Generar un dominio público

---

## 🔐 Configuración de Variables de Entorno

### Variables Obligatorias

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `SECRET_KEY` | Clave secreta de Django | `django-insecure-...` |
| `DEBUG` | Modo debug (False en producción) | `False` |
| `ALLOWED_HOSTS` | Dominios permitidos | `${{RAILWAY_PUBLIC_DOMAIN}}` |
| `PGDATABASE` | Nombre de la base de datos | `${{Postgres.PGDATABASE}}` |
| `PGUSER` | Usuario de PostgreSQL | `${{Postgres.PGUSER}}` |
| `PGPASSWORD` | Contraseña de PostgreSQL | `${{Postgres.PGPASSWORD}}` |
| `PGHOST` | Host de PostgreSQL | `${{Postgres.PGHOST}}` |
| `PGPORT` | Puerto de PostgreSQL | `${{Postgres.PGPORT}}` |

### Variables de APIs Externas (Obligatorias para funcionalidad completa)

| Variable | Descripción | Dónde obtenerla |
|----------|-------------|-----------------|
| `TMDB_API_KEY` | API key de TMDB | [TMDB API](https://www.themoviedb.org/settings/api) |
| `IGDB_CLIENT_ID` | Client ID de IGDB | [IGDB API](https://api-docs.igdb.com/) |
| `IGDB_CLIENT_SECRET` | Client Secret de IGDB | [IGDB API](https://api-docs.igdb.com/) |
| `SPOTIFY_CLIENT_ID` | Client ID de Spotify | [Spotify Developer](https://developer.spotify.com/dashboard) |
| `SPOTIFY_CLIENT_SECRET` | Client Secret de Spotify | [Spotify Developer](https://developer.spotify.com/dashboard) |
| `OPENLIBRARY_USER_AGENT` | User agent para OpenLibrary | `TuApp/1.0 (email@example.com)` |

### Variables Opcionales

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `CORS_ALLOWED_ORIGINS` | Orígenes CORS permitidos | `http://localhost:3000,...` |

### 📝 Usar el Editor Raw de Variables (Recomendado)

Railway ofrece un **Raw Editor** donde puedes pegar todas las variables de una vez:

```env
SECRET_KEY=tu-clave-secreta-aqui
DEBUG=False
ALLOWED_HOSTS=${{RAILWAY_PUBLIC_DOMAIN}}
PGDATABASE=${{Postgres.PGDATABASE}}
PGUSER=${{Postgres.PGUSER}}
PGPASSWORD=${{Postgres.PGPASSWORD}}
PGHOST=${{Postgres.PGHOST}}
PGPORT=${{Postgres.PGPORT}}
TMDB_API_KEY=tu_tmdb_api_key
IGDB_CLIENT_ID=tu_igdb_client_id
IGDB_CLIENT_SECRET=tu_igdb_client_secret
SPOTIFY_CLIENT_ID=tu_spotify_client_id
SPOTIFY_CLIENT_SECRET=tu_spotify_client_secret
OPENLIBRARY_USER_AGENT=DennAPI/1.0 (tu-email@example.com)
CORS_ALLOWED_ORIGINS=https://tu-frontend.vercel.app
```

---

## ✅ Verificación del Despliegue

### 1. Verificar Logs

En el dashboard de Railway:
1. Click en tu servicio
2. Ve a la pestaña **"Logs"**
3. Deberías ver mensajes como:

```
Starting migration
Operations to perform:
  Apply all migrations: admin, auth, contenttypes, sessions, ...
Running migrations:
  Applying contenttypes.0001_initial... OK
  ...
[INFO] Listening at: http://0.0.0.0:PORT
[INFO] Using worker: sync
```

### 2. Probar Endpoints

Una vez desplegado, prueba tu API:

```bash
# Reemplaza con tu dominio de Railway
curl https://tu-app.up.railway.app/api/

# Probar endpoint de proxy (ejemplo)
curl https://tu-app.up.railway.app/proxy/video/search?query=matrix
```

### 3. Acceder al Admin de Django

1. Ve a `https://tu-app.up.railway.app/admin`
2. Inicia sesión con tu superusuario
3. Verifica que todo funcione correctamente

### 4. Verificar Base de Datos

Puedes conectarte a tu base de datos PostgreSQL:

```bash
# Desde Railway CLI
railway connect Postgres
```

O usa las credenciales del dashboard para conectarte con herramientas como pgAdmin o DBeaver.

---

## 🔧 Comandos Útiles

### Railway CLI

```bash
# Ver logs en tiempo real
railway logs

# Ejecutar comandos en el servidor
railway run python manage.py migrate
railway run python manage.py createsuperuser
railway run python manage.py shell

# Conectarse a la base de datos
railway connect Postgres

# Abrir dashboard
railway open

# Ver estado del despliegue
railway status

# Redesplegar manualmente
railway up --detach
```

### Comandos de Django (con Railway CLI)

```bash
# Crear migraciones
railway run python manage.py makemigrations

# Aplicar migraciones
railway run python manage.py migrate

# Recolectar archivos estáticos
railway run python manage.py collectstatic --noinput

# Crear superusuario
railway run python manage.py createsuperuser

# Abrir shell de Django
railway run python manage.py shell
```

---

## 🐛 Solución de Problemas

### Error: "DisallowedHost at /"

**Problema:** Django rechaza la petición porque el host no está en `ALLOWED_HOSTS`.

**Solución:**
1. Ve a Variables en Railway
2. Actualiza `ALLOWED_HOSTS` con tu dominio:
```
ALLOWED_HOSTS=tu-app.up.railway.app
```

### Error: "FATAL: password authentication failed"

**Problema:** Credenciales de PostgreSQL incorrectas.

**Solución:**
1. Verifica que las variables `PG*` estén usando referencias:
```
PGDATABASE=${{Postgres.PGDATABASE}}
PGUSER=${{Postgres.PGUSER}}
PGPASSWORD=${{Postgres.PGPASSWORD}}
PGHOST=${{Postgres.PGHOST}}
PGPORT=${{Postgres.PGPORT}}
```

### Error: "No such table: ..."

**Problema:** Las migraciones no se ejecutaron correctamente.

**Solución:**
```bash
railway run python manage.py migrate
```

### Error: "SECRET_KEY not configured"

**Problema:** La variable `SECRET_KEY` no está definida.

**Solución:**
1. Genera una clave secreta:
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```
2. Añádela a las variables de Railway

### Error: "Application failed to respond"

**Problema:** El healthcheck está fallando o el servidor no inició.

**Solución:**
1. Revisa los logs: `railway logs`
2. Verifica que Gunicorn esté corriendo
3. Verifica que todas las variables de entorno estén configuradas

### CORS Errors en el Frontend

**Problema:** El frontend no puede hacer peticiones a la API.

**Solución:**
1. Añade el dominio de tu frontend a `CORS_ALLOWED_ORIGINS`:
```
CORS_ALLOWED_ORIGINS=https://tu-frontend.vercel.app,https://tu-frontend.netlify.app
```

### Archivos Estáticos no se Cargan

**Problema:** CSS del admin de Django no se ve.

**Solución:**
```bash
railway run python manage.py collectstatic --noinput
```

O verifica que `railway.toml` incluya el comando `collectstatic` en el `startCommand`.

---

## 🌐 Dominio Personalizado (Opcional)

Si quieres usar tu propio dominio:

1. En Railway, ve a **Settings** → **Networking**
2. Click en **"Custom Domain"**
3. Ingresa tu dominio: `api.tu-dominio.com`
4. Railway te dará registros DNS para configurar
5. Añade los registros en tu proveedor de DNS
6. Actualiza `ALLOWED_HOSTS`:
```
ALLOWED_HOSTS=api.tu-dominio.com
```

---

## 📊 Monitoreo y Escalado

### Ver Métricas

Railway proporciona métricas en tiempo real:
- Uso de CPU
- Uso de memoria
- Tráfico de red
- Logs en tiempo real

### Escalar Recursos

Si tu aplicación necesita más recursos:
1. Ve a **Settings** → **Resources**
2. Ajusta CPU y RAM según necesites
3. Railway ajustará el pricing automáticamente

---

## 🎯 Checklist Final

- [ ] Código subido a GitHub
- [ ] Proyecto creado en Railway
- [ ] PostgreSQL agregado
- [ ] Todas las variables de entorno configuradas
- [ ] Despliegue exitoso (logs sin errores)
- [ ] Dominio público generado
- [ ] `ALLOWED_HOSTS` actualizado con el dominio
- [ ] Endpoint raíz funciona (`/api/`)
- [ ] Admin de Django accesible (`/admin`)
- [ ] Superusuario creado
- [ ] Endpoints de proxy funcionan (`/proxy/...`)
- [ ] CORS configurado (si usas frontend)

---

## 📚 Recursos Adicionales

- [Documentación oficial de Railway](https://docs.railway.app/)
- [Railway Django Template](https://railway.app/template/GB6Eki)
- [Django Deployment Checklist](https://docs.djangoproject.com/en/stable/howto/deployment/checklist/)
- [Whitenoise Documentation](http://whitenoise.evans.io/)
- [Gunicorn Documentation](https://docs.gunicorn.org/)

---

## 🆘 Soporte

Si tienes problemas:
1. Revisa los logs: `railway logs`
2. Consulta la [documentación de Railway](https://docs.railway.app/)
3. Únete al [Discord de Railway](https://discord.gg/railway)
4. Abre un issue en el repositorio del proyecto

---

## 🎉 ¡Felicidades!

Tu API de Denn ahora está desplegada en Railway y lista para recibir tráfico de producción. 

**URL de tu API:** `https://tu-app.up.railway.app`

¡Ahora puedes conectar tu frontend y empezar a usar tu API en producción! 🚀

