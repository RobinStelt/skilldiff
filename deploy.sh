#!/bin/bash
# Skill-A/B Marketplace – Deployment auf den bestehenden plantwiz-Server,
# neben dem plantwiz-Stack, hinter dessen gemeinsamem Caddy. Ausführen als
# root (oder ein Nutzer in der docker-Gruppe): bash deploy.sh
#
# Voraussetzung: Docker + docker-compose-plugin sind auf diesem Server
# bereits installiert (via plantwiz/deploy.sh), und das externe Netzwerk
# `plantwiz-shared` existiert bereits (das legt der plantwiz-Stack an).
# Dieses Script installiert KEIN Docker und legt KEIN Netzwerk an, wenn es
# fehlt — siehe docker/README.md für den Fall, dass dieser Server noch
# keinen plantwiz-Stack hat.
set -e

if ! docker network inspect plantwiz-shared >/dev/null 2>&1; then
  echo "Netzwerk 'plantwiz-shared' existiert nicht. Läuft der plantwiz-Stack"
  echo "bereits auf diesem Server? Siehe docker/README.md."
  exit 1
fi

echo "==> Code klonen/aktualisieren..."
if [ ! -d "/opt/skilldiff" ]; then
  git clone https://github.com/RobinStelt/marketplace.git /opt/skilldiff
fi
cd /opt/skilldiff
git pull --ff-only

echo "==> .env anlegen..."
if [ ! -f ".env" ]; then
  cp .env.prod.example .env
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo " WICHTIG – Vor dem Start:"
  echo ""
  echo " 1. Passwörter erzeugen (dreimal ausführen, je einmal pro Zeile):"
  echo "    openssl rand -base64 24"
  echo " 2. .env ausfüllen:"
  echo "    nano /opt/skilldiff/.env"
  echo " 3. Danach erneut starten:"
  echo "    bash /opt/skilldiff/deploy.sh"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 0
fi

echo "==> Services bauen und starten (kann beim ersten Mal einige Minuten dauern)..."
docker compose -f docker-compose.prod.yml --env-file .env up -d --build

DOMAIN=$(grep ^MARKETPLACE_DOMAIN .env | cut -d= -f2)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Fertig! Container laufen unter den Namen marketplace-backend/"
echo " marketplace-frontend im Netzwerk plantwiz-shared."
echo ""
echo " Damit https://${DOMAIN} tatsächlich funktioniert, fehlt noch der"
echo " Caddyfile-Block auf dem gemeinsamen Caddy (siehe docker/README.md,"
echo " Abschnitt 'Caddy'), plus ein DNS A/AAAA-Record für ${DOMAIN}."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
