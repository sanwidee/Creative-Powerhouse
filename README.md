# 🚀 Creative Powerhouse

Professional AI-powered creative production studio for generating visual content.

---

## Quick Start

### macOS / Linux
```bash
./run-mac.sh
```

### Windows
```bash
run-windows.bat
```

That's it! The script will:
1. ✅ Check for Node.js and Python
2. ✅ Install all dependencies automatically
3. ✅ Start all servers
4. ✅ Open the app in your browser

---

## Requirements

| Requirement | Version | Download |
|-------------|---------|----------|
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org/) |
| **Python** | 3.9+ | [python.org](https://python.org/) |
| **ffmpeg** | Any | [ffmpeg.org](https://ffmpeg.org/) (optional, for voice cloning) |

### macOS Quick Install
```bash
# Install Homebrew if needed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install requirements
brew install node python ffmpeg
```

### Windows Quick Install
1. Download and install [Node.js](https://nodejs.org/)
2. Download and install [Python](https://python.org/) (check "Add to PATH")
3. Download [ffmpeg](https://ffmpeg.org/download.html) and add to PATH

---

## Features

### 🎨 Design Builder
Extract "Design DNA" from any reference image to create consistent, remixable templates.

### 🖼️ Post Generator
Generate on-brand visuals using your blueprints with AI-powered remixing.

### 🎠 Carousel Generator
Create multi-slide carousels with consistent styling across all slides.

### 🏢 Brand Lab
Define and extract brand identities (colors, typography, style) to apply across all content.

### 👤 Character Lab
Clone and remix characters in different art styles while preserving identity.

### 🎤 Audio Lab
Clone your voice using AI (Coqui XTTS) or create synthetic voice styles (Gemini).

---

## Servers

| Server | URL | Purpose |
|--------|-----|---------|
| Frontend | http://localhost:3000 | Main application UI |
| Storage API | http://localhost:3001 | Data persistence |
| Voice API | http://localhost:8000 | Voice cloning (optional) |

---

## Troubleshooting

### "Node.js not found"
Install Node.js from https://nodejs.org/

### "Python not found"
Install Python 3.9+ from https://python.org/
On Windows, make sure to check "Add Python to PATH" during installation.

### "ffmpeg not found"
Voice cloning requires ffmpeg. The app will work without it, but voice cloning will be disabled.
- macOS: `brew install ffmpeg`
- Windows: Download from https://ffmpeg.org/download.html

### Voice server takes a long time to start
First run downloads the XTTS model (~2GB). This is normal and only happens once.

---

## Support

For issues or feature requests, please contact the developer.

---

© Creative Powerhouse. All rights reserved.
