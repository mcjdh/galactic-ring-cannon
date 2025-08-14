# Deployment Guide

## Local Development

### Prerequisites
- Modern web browser (Chrome, Firefox, Edge, Safari)
- Local web server (Python, Node.js, or VS Code Live Server)

### Setup Steps
1. Clone/download the project
2. Navigate to project directory
3. Start local web server:
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Python 2
   python -m SimpleHTTPServer 8000
   
   # Node.js
   npx http-server
   ```
4. Open `http://localhost:8000` in browser

### VS Code Development
1. Install "Live Server" extension
2. Right-click `index.html` → "Open with Live Server"
3. Game will auto-reload on changes

## Production Deployment

### Static Hosting
Game can be deployed to any static hosting service:

#### GitHub Pages
1. Push code to GitHub repository
2. Enable Pages in repository settings
3. Select source branch (usually `main`)
4. Access at `https://username.github.io/repository-name`

#### Netlify
1. Connect GitHub repository to Netlify
2. Build command: (none needed)
3. Publish directory: `/` (root)
4. Deploy automatically on git push

#### Vercel
1. Import GitHub repository
2. Framework: "Other"
3. Root directory: `/`
4. Auto-deploys on commits

#### Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

### Build Optimization (Future)

For production builds, consider:
- **Asset Minification**: Compress CSS/JS files
- **Image Optimization**: Optimize any future image assets
- **Module Bundling**: Use Webpack/Rollup for better performance
- **Service Worker**: Add PWA capabilities for offline play

### Performance Considerations

#### Hosting Requirements
- **Bandwidth**: Minimal (< 1MB total assets)
- **Storage**: < 10MB
- **CDN**: Recommended for global players
- **HTTPS**: Required for audio features

#### Browser Compatibility
- **Modern Browsers**: Full support (Chrome 80+, Firefox 75+, Safari 13+)
- **Mobile**: Responsive design, touch controls
- **WebGL**: Canvas 2D fallback included

### Configuration

#### Environment Variables
Currently uses localStorage for settings. For production:
- Consider server-side high score tracking
- Add analytics integration
- Implement user accounts (optional)

#### Security Headers
For production hosting, add security headers:
```
Content-Security-Policy: default-src 'self' 'unsafe-inline'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
```

### Monitoring

#### Recommended Analytics
- Google Analytics for player metrics
- Error tracking (Sentry, LogRocket)
- Performance monitoring (Web Vitals)

#### Key Metrics
- Load time
- FPS performance
- Player session duration
- Level progression rates

### Troubleshooting

#### Common Issues
1. **Audio not working**: Check HTTPS requirement
2. **Performance issues**: Enable Low Quality mode
3. **Save data lost**: localStorage not available
4. **Controls not responding**: Check key event handlers

#### Debug Mode
Press F3 in-game to enable debug information:
- FPS counter
- Entity count
- Performance metrics
- Spatial grid visualization

### Update Process

#### Version Management
1. Update version in `index.html` title/meta
2. Test all game modes (Normal/Endless)
3. Verify save data compatibility
4. Deploy to staging environment
5. Test on multiple devices/browsers
6. Deploy to production

#### Rollback Plan
- Keep previous version deployed
- Use blue-green deployment strategy
- Monitor error rates post-deployment
- Have rollback procedure documented
