#!/bin/bash
# 🍓 Pi5 GPU Memory Monitor - Quick Check Script

echo "🍓 Raspberry Pi 5 - GPU Memory Quick Check"
echo "=========================================="
echo ""

# Check if we're on Pi5
if grep -q "Raspberry Pi 5" /proc/cpuinfo 2>/dev/null; then
    echo "✅ Running on Raspberry Pi 5"
else
    echo "⚠️  Not Pi5 - GPU memory optimizations may not apply"
fi

echo ""
echo "📊 System GPU Memory:"
if command -v vcgencmd &> /dev/null; then
    vcgencmd get_mem gpu
    vcgencmd get_mem arm
    echo ""
    echo "GPU Temperature:"
    vcgencmd measure_temp
else
    echo "⚠️  vcgencmd not available"
fi

echo ""
echo "🎮 Game GPU Memory Commands:"
echo "   Open browser console (F12) and type:"
echo ""
echo "   gpuStatus()     - Check current sprite cache usage"
echo "   gpuCleanup()    - Force clear all sprite caches"
echo "   profileOn()     - Enable performance profiling"
echo "   profileReport() - Get performance report"
echo ""
echo "🎯 Expected Sprite Count on Pi5:"
echo "   Low Pressure:  < 50 sprites (✅ optimal)"
echo "   Medium:        50-100 sprites (👀 monitored)"
echo "   High:          100-150 sprites (🟠 auto cleanup)"
echo "   Critical:      > 200 sprites (🔴 aggressive cleanup)"
echo ""
echo "💡 Tips:"
echo "   - GPU memory manager runs automatically on Pi5"
echo "   - Cleanup happens every 5 seconds if needed"
echo "   - Press 'L' in-game to toggle low quality mode"
echo "   - Close other apps to free GPU memory"
echo ""
