#!/bin/bash
# Quick Start Script para la API

echo "🚀 Iniciando setup de la API..."

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar si existe .env
if [ ! -f .env ]; then
    echo -e "${RED}❌ No se encontró el archivo .env${NC}"
    echo "Por favor crea un archivo .env con las siguientes variables:"
    echo ""
    echo "SECRET_KEY=tu-clave-secreta-aqui"
    echo "TMDB_API_KEY=tu_tmdb_api_key"
    echo "IGDB_CLIENT_ID=tu_igdb_client_id"
    echo "IGDB_CLIENT_SECRET=tu_igdb_client_secret"
    echo "SPOTIFY_CLIENT_ID=tu_spotify_client_id"
    echo "SPOTIFY_CLIENT_SECRET=tu_spotify_client_secret"
    echo "OPENLIBRARY_USER_AGENT=MyApp/1.0 (your@email.com)"
    echo ""
    echo "Para generar SECRET_KEY ejecuta:"
    echo "python3 -c \"from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())\""
    exit 1
fi

echo -e "${BLUE}📦 Instalando dependencias...${NC}"
pip install -r requirements.txt

echo -e "${BLUE}🗄️  Creando migraciones...${NC}"
python3 manage.py makemigrations

echo -e "${BLUE}🗄️  Aplicando migraciones...${NC}"
python3 manage.py migrate

echo -e "${GREEN}✅ Setup completado!${NC}"
echo ""
echo -e "${BLUE}Para crear un superusuario ejecuta:${NC}"
echo "  python3 manage.py createsuperuser"
echo ""
echo -e "${BLUE}Para iniciar el servidor ejecuta:${NC}"
echo "  python3 manage.py runserver"
echo ""
echo -e "${GREEN}Luego accede a:${NC}"
echo "  API: http://localhost:8000"
echo "  Admin: http://localhost:8000/admin"

