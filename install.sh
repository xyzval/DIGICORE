#!/bin/bash

# ==========================================
#  DIGICORE BOT - One Click Installer
#  VPS & RDP Provider Bot (Telegram)
# ==========================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════╗"
echo "║      DIGICORE BOT - AUTO INSTALLER      ║"
echo "║         One Click Installation           ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"

# Check root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Jalankan sebagai root: sudo bash install.sh${NC}"
  exit 1
fi

# 1. Add SWAP if RAM < 1GB
echo -e "${YELLOW}[1/7] Checking RAM & SWAP...${NC}"
TOTAL_RAM=$(free -m | awk '/^Mem:/{print $2}')
if [ "$TOTAL_RAM" -lt 1024 ]; then
  if [ ! -f /swapfile ]; then
    echo -e "${CYAN}  → RAM kecil (${TOTAL_RAM}MB), menambahkan 1GB SWAP...${NC}"
    fallocate -l 1G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo -e "${GREEN}  ✓ SWAP 1GB berhasil ditambahkan${NC}"
  else
    echo -e "${GREEN}  ✓ SWAP sudah ada${NC}"
  fi
else
  echo -e "${GREEN}  ✓ RAM cukup (${TOTAL_RAM}MB)${NC}"
fi

# 2. Install Node.js 18 LTS
echo -e "${YELLOW}[2/7] Installing Node.js 18 LTS...${NC}"
NODE_VERSION=$(node -v 2>/dev/null || echo "none")
if [[ "$NODE_VERSION" == v18* ]] || [[ "$NODE_VERSION" == v20* ]] || [[ "$NODE_VERSION" == v22* ]]; then
  echo -e "${GREEN}  ✓ Node.js sudah terinstall: $NODE_VERSION${NC}"
else
  echo -e "${CYAN}  → Installing Node.js 18...${NC}"
  curl -fsSL https://deb.nodesource.com/setup_18.x | bash - > /dev/null 2>&1
  apt install -y nodejs > /dev/null 2>&1
  echo -e "${GREEN}  ✓ Node.js $(node -v) terinstall${NC}"
fi

# 3. Install PM2
echo -e "${YELLOW}[3/7] Installing PM2...${NC}"
if command -v pm2 &> /dev/null; then
  echo -e "${GREEN}  ✓ PM2 sudah terinstall${NC}"
else
  npm install -g pm2 > /dev/null 2>&1
  echo -e "${GREEN}  ✓ PM2 terinstall${NC}"
fi

# 4. Install Git
echo -e "${YELLOW}[4/7] Checking Git...${NC}"
if command -v git &> /dev/null; then
  echo -e "${GREEN}  ✓ Git sudah terinstall${NC}"
else
  apt install -y git > /dev/null 2>&1
  echo -e "${GREEN}  ✓ Git terinstall${NC}"
fi

# 5. Clone Repository
echo -e "${YELLOW}[5/7] Cloning DIGICORE...${NC}"
INSTALL_DIR="/root/DIGICORE"
if [ -d "$INSTALL_DIR" ]; then
  echo -e "${CYAN}  → Folder sudah ada, updating...${NC}"
  cd "$INSTALL_DIR"
  git fetch origin > /dev/null 2>&1
  git checkout fix/dependencies-compatibility > /dev/null 2>&1 || git pull > /dev/null 2>&1
else
  git clone -b fix/dependencies-compatibility https://github.com/xyzval/DIGICORE.git "$INSTALL_DIR" > /dev/null 2>&1
  cd "$INSTALL_DIR"
fi
echo -e "${GREEN}  ✓ DIGICORE berhasil di-clone${NC}"

# 6. Install Dependencies
echo -e "${YELLOW}[6/7] Installing dependencies...${NC}"
cd "$INSTALL_DIR"
rm -rf node_modules package-lock.json
npm install > /dev/null 2>&1
echo -e "${GREEN}  ✓ Dependencies terinstall${NC}"

# 7. Setup PM2
echo -e "${YELLOW}[7/7] Setting up PM2...${NC}"
pm2 delete DIGICORE > /dev/null 2>&1 || true
pm2 start index.js --name DIGICORE > /dev/null 2>&1
pm2 save > /dev/null 2>&1
pm2 startup > /dev/null 2>&1 || true
echo -e "${GREEN}  ✓ Bot berjalan dengan PM2${NC}"

# Done!
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗"
echo -e "║     ✅ INSTALASI BERHASIL!               ║"
echo -e "╠══════════════════════════════════════════╣"
echo -e "║  Node.js : $(node -v)                      ║"
echo -e "║  Lokasi  : $INSTALL_DIR            ║"
echo -e "║  Status  : Bot sedang berjalan          ║"
echo -e "╠══════════════════════════════════════════╣"
echo -e "║  LANGKAH SELANJUTNYA:                   ║"
echo -e "║  1. Edit config:                        ║"
echo -e "║     nano /root/DIGICORE/config.js       ║"
echo -e "║  2. Restart bot:                        ║"
echo -e "║     pm2 restart DIGICORE                ║"
echo -e "╠══════════════════════════════════════════╣"
echo -e "║  PERINTAH BERGUNA:                      ║"
echo -e "║  • pm2 logs DIGICORE  (lihat log)       ║"
echo -e "║  • pm2 restart DIGICORE (restart)       ║"
echo -e "║  • pm2 stop DIGICORE (stop bot)         ║"
echo -e "╚══════════════════════════════════════════╝${NC}"
echo ""
