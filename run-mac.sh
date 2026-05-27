#!/bin/bash

#######################################
# Creative Powerhouse - One-Click Start
# For macOS / Linux
#######################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo ""
echo -e "${PURPLE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║          🚀 CREATIVE POWERHOUSE - STARTUP                 ║${NC}"
echo -e "${PURPLE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check Node.js
echo -e "${BLUE}[1/5]${NC} Checking Node.js..."
if command_exists node; then
    NODE_VERSION=$(node -v)
    echo -e "  ${GREEN}✓${NC} Node.js ${NODE_VERSION} found"
else
    echo -e "  ${RED}✗${NC} Node.js not found!"
    echo -e "  ${YELLOW}→${NC} Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check Python (need 3.9-3.11 for TTS/voice cloning)
echo -e "${BLUE}[2/5]${NC} Checking Python..."

# For general use, any Python 3 works
PYTHON_CMD=""
if command_exists python3; then
    PYTHON_CMD="python3"
elif command_exists python; then
    PYTHON_CMD="python"
fi

if [ -n "$PYTHON_CMD" ]; then
    PYTHON_VERSION=$($PYTHON_CMD --version 2>&1)
    echo -e "  ${GREEN}✓${NC} ${PYTHON_VERSION} found (general)"
else
    echo -e "  ${RED}✗${NC} Python not found!"
    echo -e "  ${YELLOW}→${NC} Please install Python 3.9+ from https://python.org/"
    exit 1
fi

# For voice server, we need Python 3.9-3.11 (TTS library requirement)
echo -e "${BLUE}[2.5/5]${NC} Checking Python 3.11 for voice server (TTS requirement)..."
PYTHON311_CMD=""

# Check common locations for Python 3.11
if command_exists python3.11; then
    PYTHON311_CMD="python3.11"
elif [ -f "/opt/homebrew/opt/python@3.11/bin/python3.11" ]; then
    PYTHON311_CMD="/opt/homebrew/opt/python@3.11/bin/python3.11"
elif [ -f "/usr/local/opt/python@3.11/bin/python3.11" ]; then
    PYTHON311_CMD="/usr/local/opt/python@3.11/bin/python3.11"
elif [ -f "$HOME/.pyenv/versions/3.11.*/bin/python3" ]; then
    PYTHON311_CMD=$(ls -1 $HOME/.pyenv/versions/3.11.*/bin/python3 2>/dev/null | head -1)
fi

if [ -n "$PYTHON311_CMD" ]; then
    PYTHON311_VERSION=$($PYTHON311_CMD --version 2>&1)
    echo -e "  ${GREEN}✓${NC} ${PYTHON311_VERSION} found for voice server"
else
    echo -e "  ${YELLOW}!${NC} Python 3.11 not found (required for voice cloning)"
    echo -e "  ${YELLOW}→${NC} Voice cloning will be disabled"
    echo -e "  ${YELLOW}→${NC} To enable, install Python 3.11: ${GREEN}brew install python@3.11${NC}"
fi

# Check ffmpeg
echo -e "${BLUE}[3/5]${NC} Checking ffmpeg..."
if command_exists ffmpeg; then
    echo -e "  ${GREEN}✓${NC} ffmpeg found"
else
    echo -e "  ${YELLOW}!${NC} ffmpeg not found (voice cloning will be disabled)"
    echo -e "  ${YELLOW}→${NC} Install with: brew install ffmpeg"
fi

# Install Node.js dependencies
echo ""
echo -e "${BLUE}[4/5]${NC} Installing Node.js dependencies..."
if [ ! -d "node_modules" ]; then
    npm install
    echo -e "  ${GREEN}✓${NC} Node modules installed"
else
    echo -e "  ${GREEN}✓${NC} Node modules already installed"
fi

# Install Python dependencies
echo -e "${BLUE}[5/5]${NC} Setting up Python voice server..."
if [ -d "voice_server" ]; then
    # Only proceed if we have Python 3.11
    if [ -n "$PYTHON311_CMD" ]; then
        cd voice_server
        
        # Create virtual environment with Python 3.11 if not exists
        if [ ! -d "venv" ]; then
            echo -e "  ${YELLOW}→${NC} Creating Python 3.11 virtual environment..."
            $PYTHON311_CMD -m venv venv
        fi
        
        # Activate virtual environment
        source venv/bin/activate
        
        # Install dependencies
        if [ ! -f "venv/.installed" ]; then
            echo -e "  ${YELLOW}→${NC} Installing Python dependencies (this may take a while)..."
            pip install --upgrade pip -q
            pip install -r requirements.txt
            if [ $? -eq 0 ]; then
                touch venv/.installed
                echo -e "  ${GREEN}✓${NC} Python dependencies installed"
            else
                echo -e "  ${RED}✗${NC} Failed to install dependencies"
                echo -e "  ${YELLOW}→${NC} Try: rm -rf voice_server/venv && ./run-mac.sh"
            fi
        else
            echo -e "  ${GREEN}✓${NC} Python dependencies already installed"
        fi
        
        cd ..
    else
        echo -e "  ${YELLOW}!${NC} Skipping voice server setup (Python 3.11 required)"
        echo -e "  ${YELLOW}→${NC} Install Python 3.11: ${GREEN}brew install python@3.11${NC}"
    fi
else
    echo -e "  ${YELLOW}!${NC} Voice server directory not found (voice cloning disabled)"
fi

# Create necessary directories
mkdir -p database voice_dna

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  All dependencies ready! Starting servers...${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down servers...${NC}"
    kill $NODE_PID 2>/dev/null
    kill $PYTHON_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}
trap cleanup SIGINT SIGTERM

# Start Node.js backend (storage server)
echo -e "${BLUE}Starting Node.js storage server...${NC}"
node server.js &
NODE_PID=$!
sleep 1
echo -e "  ${GREEN}✓${NC} Storage server running on http://localhost:3001"

# Start Python voice server (if available and Python 3.11 was found)
if [ -d "voice_server" ] && [ -d "voice_server/venv" ] && [ -n "$PYTHON311_CMD" ]; then
    echo -e "${BLUE}Starting Python voice server...${NC}"
    cd voice_server
    source venv/bin/activate
    python main.py &
    PYTHON_PID=$!
    cd ..
    sleep 2
    echo -e "  ${GREEN}✓${NC} Voice server running on http://localhost:8000"
fi

# Start frontend dev server
echo -e "${BLUE}Starting frontend...${NC}"
npm run client &
FRONTEND_PID=$!
sleep 3

echo ""
echo -e "${PURPLE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║  ${GREEN}✓ CREATIVE POWERHOUSE IS RUNNING!${PURPLE}                       ║${NC}"
echo -e "${PURPLE}╠═══════════════════════════════════════════════════════════╣${NC}"
echo -e "${PURPLE}║                                                           ║${NC}"
echo -e "${PURPLE}║  ${NC}🌐 App:           ${GREEN}http://localhost:3000${PURPLE}                 ║${NC}"
echo -e "${PURPLE}║  ${NC}💾 Storage API:   ${BLUE}http://localhost:3001${PURPLE}                 ║${NC}"
echo -e "${PURPLE}║  ${NC}🎤 Voice API:     ${BLUE}http://localhost:8000${PURPLE}                 ║${NC}"
echo -e "${PURPLE}║                                                           ║${NC}"
echo -e "${PURPLE}║  ${YELLOW}Press Ctrl+C to stop all servers${PURPLE}                       ║${NC}"
echo -e "${PURPLE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Open browser (macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    sleep 2
    open http://localhost:3000
fi

# Wait for all processes
wait
