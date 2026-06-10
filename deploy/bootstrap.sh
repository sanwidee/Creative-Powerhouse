#!/usr/bin/env bash
# Bootstrap Creative Powerhouse on the VPS.
#
# Run as root:
#   bash bootstrap.sh
#
# Idempotent — safe to re-run. Does NOT touch existing nginx vhosts on
# this server (weedlabs.online root, notes., admin., brain., etc.).

set -euo pipefail

APP_NAME="powerhouse"
APP_DIR="/var/www/${APP_NAME}"
SERVE_DOMAIN="powerhouse.weedlabs.online"
NODE_VERSION="20"

log() { echo -e "\033[1;36m[bootstrap]\033[0m $*"; }
warn() { echo -e "\033[1;33m[warn]\033[0m $*"; }

if [[ "${EUID}" -ne 0 ]]; then
  echo "Must run as root. Try: sudo bash bootstrap.sh"
  exit 1
fi

log "=== 1/7 · System packages ==="
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
  curl ca-certificates gnupg git rsync ufw nginx certbot python3-certbot-nginx >/dev/null
log "apt OK"

log "=== 2/7 · Node ${NODE_VERSION} ==="
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v 2>/dev/null | cut -c2- | cut -d. -f1)" -lt "${NODE_VERSION}" ]]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash - >/dev/null
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nodejs >/dev/null
  log "installed node $(node -v)"
else
  log "node $(node -v) already present"
fi

log "=== 3/7 · pm2 (process manager) ==="
if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2 >/dev/null
  log "installed pm2 $(pm2 -v)"
else
  log "pm2 $(pm2 -v) already present"
fi

log "=== 4/7 · App directory ${APP_DIR} ==="
mkdir -p "${APP_DIR}"
mkdir -p "${APP_DIR}/database"
log "directory ready"

log "=== 5/7 · nginx vhost for ${SERVE_DOMAIN} ==="
NGINX_VHOST="/etc/nginx/sites-available/${SERVE_DOMAIN}"
if [[ -f "${NGINX_VHOST}" ]]; then
  warn "vhost already exists — leaving as-is (delete first if you want a re-write)"
else
  cat > "${NGINX_VHOST}" <<NGINX
# Creative Powerhouse — powerhouse.weedlabs.online
# HTTP only; certbot will add TLS in a separate step.
server {
    listen 80;
    listen [::]:80;
    server_name ${SERVE_DOMAIN};

    # Large image payloads (base64 dataUrls in posts collection)
    client_max_body_size 500m;

    # Long timeouts for the IG publish flow (carousel containers take 10-60s)
    proxy_read_timeout 180s;
    proxy_connect_timeout 30s;

    access_log /var/log/nginx/${SERVE_DOMAIN}.access.log;
    error_log  /var/log/nginx/${SERVE_DOMAIN}.error.log;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX
  ln -sf "${NGINX_VHOST}" "/etc/nginx/sites-enabled/${SERVE_DOMAIN}"
  log "vhost written"
fi

# Test and reload nginx (only if config is valid)
if nginx -t 2>&1 | grep -q "successful"; then
  systemctl reload nginx
  log "nginx reloaded"
else
  warn "nginx config test FAILED — not reloading. Run 'nginx -t' to see why."
fi

log "=== 6/7 · Firewall (ufw) ==="
if ufw status | grep -q "Status: active"; then
  ufw allow 'Nginx Full' >/dev/null 2>&1 || true
  ufw allow OpenSSH >/dev/null 2>&1 || true
  log "ufw already active; HTTP/HTTPS allowed"
else
  log "ufw inactive — leaving as-is so we don't accidentally lock out SSH"
fi

log "=== 7/7 · Summary ==="
cat <<DONE

Bootstrap complete.

Next steps (run these from YOUR LOCAL Mac, NOT here):

  1. Push the code to the VPS:
       cd "/Volumes/Sanwidi 2TB/02-projects/tools/Creative Powerhouse"
       rsync -avz --delete \\
         --exclude node_modules --exclude .git --exclude dist \\
         --exclude voice_server/venv --exclude voice_server/__pycache__ \\
         --exclude voice_server/models --exclude voice_server/temp \\
         --exclude '.DS_Store' --exclude '._*' \\
         ./ root@${SERVE_DOMAIN}:${APP_DIR}/

  2. Then back on the VPS:
       cd ${APP_DIR}
       npm ci --omit=dev || npm install --omit=dev
       npm run build
       echo "PUBLIC_BASE_URL=https://${SERVE_DOMAIN}" >> .env
       echo "NODE_ENV=production"                 >> .env
       pm2 start "node server.js" --name ${APP_NAME} --update-env
       pm2 save
       pm2 startup systemd -u root --hp /root

  3. Grab TLS cert (this can run now that DNS is live):
       certbot --nginx -d ${SERVE_DOMAIN} --non-interactive --agree-tos -m widi.adyatma@gmail.com

  4. Verify:
       curl -s https://${SERVE_DOMAIN}/healthz | head -50

Once /healthz returns ok=true with public_base_url set, the cron will pick up due
posts on its next 60-second tick.
DONE
