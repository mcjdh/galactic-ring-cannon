#!/bin/bash
# 🍓 Quick Performance Test Script for Raspberry Pi 5
# Run this on Pi5 to quickly verify optimizations are working

echo "🍓 Galactic Ring Cannon - Pi5 Performance Test"
echo "=============================================="
echo ""

# Check if running on Raspberry Pi
if grep -q "Raspberry Pi" /proc/cpuinfo 2>/dev/null; then
    echo "✅ Detected: Raspberry Pi"
    cat /proc/cpuinfo | grep "Model" | head -n 1
else
    echo "⚠️  Not running on Raspberry Pi"
fi

echo ""
echo "GPU Info:"
if command -v vcgencmd &> /dev/null; then
    vcgencmd get_mem gpu
    vcgencmd measure_temp
fi

echo ""
echo "🚀 Starting local web server..."
echo "   Game URL: http://localhost:8000"
echo ""
echo "📋 Testing Steps:"
echo "   1. Open browser to http://localhost:8000"
echo "   2. Check console for: '🍓 Raspberry Pi detected!'"
echo "   3. Type in console: profileOn()"
echo "   4. Play for 60 seconds"
echo "   5. Type in console: profileReport()"
echo ""
echo "🎯 Performance Targets for Pi5:"
echo "   - Total Frame Time: <16.67ms (60fps)"
echo "   - CosmicBackground: <5ms"
echo "   - Particles: <3ms"
echo "   - Enemy AI: <5ms"
echo ""
echo "Press Ctrl+C to stop server"
echo ""

# Start server
cd "$(dirname "$0")"
python3 -m http.server 8000
