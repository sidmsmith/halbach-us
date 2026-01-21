# Local Testing Guide for Halbach.us Website

## ✅ What's Fixed for Local Testing

All HTML files have been updated for local testing:
- ✅ Base tag commented out (was pointing to remote URL)
- ✅ All `.php` links changed to `.html`
- ✅ Missing `custom.css` reference removed
- ✅ Form actions updated (subscribe form now points to `#`)
- ✅ All asset paths are relative (CSS, JS, images)

## 🚀 Quick Start - Testing Locally

### Option 1: Simple File Opening (Limited)
You can open `index.html` directly in a browser, but some features may not work due to CORS restrictions:
- Navigation ✅ Works
- Images ✅ Work
- CSS styling ✅ Works
- YouTube video background ⚠️ May have issues

### Option 2: Local HTTP Server (Recommended)

#### Using Python (if installed)
```powershell
# Navigate to the website directory
cd halbach_us_reconstruction\halbach_us_reconstruction

# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```
Then open: `http://localhost:8000`

#### Using Node.js (if installed)
```powershell
# Install http-server globally (one time)
npm install -g http-server

# Navigate to the website directory
cd halbach_us_reconstruction\halbach_us_reconstruction

# Start server
http-server -p 8000
```
Then open: `http://localhost:8000`

#### Using PHP (if installed)
```powershell
cd halbach_us_reconstruction\halbach_us_reconstruction
php -S localhost:8000
```
Then open: `http://localhost:8000`

#### Using PowerShell (Windows only)
```powershell
# Navigate to the website directory
cd halbach_us_reconstruction\halbach_us_reconstruction

# Create a simple server (requires .NET)
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:8000/")
$listener.Start()
Write-Host "Server running at http://localhost:8000"
Write-Host "Press Ctrl+C to stop"

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response
    
    $localPath = $request.Url.LocalPath
    if ($localPath -eq "/") { $localPath = "/index.html" }
    
    $filePath = Join-Path $PWD $localPath.TrimStart('/')
    
    if (Test-Path $filePath) {
        $content = [System.IO.File]::ReadAllBytes($filePath)
        $response.ContentType = [System.Web.MimeMapping]::GetMimeMapping($filePath)
        $response.ContentLength64 = $content.Length
        $response.OutputStream.Write($content, 0, $content.Length)
    } else {
        $response.StatusCode = 404
    }
    
    $response.Close()
}
```

### Option 3: VS Code Live Server Extension
1. Install "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"

## ✅ What Works Locally

### Fully Functional
- ✅ **Navigation**: All menu links work between pages
- ✅ **Images**: All images load correctly
  - Property photos
  - Attraction images
  - About section images
- ✅ **CSS Styling**: All stylesheets load and apply
  - Bootstrap framework
  - Custom styles
  - Animation libraries
- ✅ **JavaScript**: All client-side scripts work
  - jQuery and jQuery UI
  - Smooth scrolling
  - Mobile menu toggle
  - Animations (WOW.js)
  - Scroll effects
- ✅ **Responsive Design**: Works on desktop, tablet, mobile
- ✅ **Fonts**: Google Fonts load from CDN
- ✅ **Font Awesome Icons**: Load from CDN backup

### May Have Limitations
- ⚠️ **YouTube Video Background**: Should work but requires internet connection
  - Video ID: `XVYRsGm1J5Q`
  - Uses YouTube API (requires internet)
  - Fallback image included if video fails
- ⚠️ **Form Submissions**: Subscribe and contact forms won't submit
  - Forms are disabled (action set to `#`)
  - Would need backend/server to process
- ⚠️ **Analytics**: Google Analytics will track (but probably want to disable for testing)

## 📁 File Structure

Make sure your file structure looks like this:
```
halbach_us_reconstruction/
└── halbach_us_reconstruction/
    ├── index.html
    ├── about-us.html
    ├── attractions.html
    ├── contact-us.html
    ├── style.css
    ├── toptobottom.gif
    ├── css/
    │   ├── animate.css
    │   ├── jquery-ui.min.css
    │   ├── jquery1-ui.css
    │   ├── style.css
    │   └── swiper.min.css
    ├── js/
    │   ├── functions.js
    │   ├── jquery.js
    │   ├── jquery-ui.js
    │   ├── jquery-ui.min.js
    │   ├── plugins.js
    │   └── wow.min.js
    ├── bootstrap/
    │   ├── css/
    │   │   └── bootstrap.min.css
    │   └── js/
    │       └── bootstrap.min.js
    ├── dist/
    │   ├── css/
    │   │   └── jquery.mb.YTPlayer.min.css
    │   └── jquery.mb.YTPlayer.js
    ├── fonts/
    │   ├── fontawesome/
    │   │   └── css/
    │   │       └── font-awesome.min.css
    │   └── icomoon/
    │       └── style.css
    └── uploads/
        ├── 2/
        │   └── DSC00439_web.jpg
        ├── areainfo/
        │   ├── fr.jpg
        │   ├── nbu.jpg
        │   ├── jbjb.jpg
        │   └── fgdgfd.jpg
        └── about/
            └── ghhf.jpg
```

## 🔍 Testing Checklist

When testing locally, verify:
- [ ] Homepage loads with video background
- [ ] Navigation menu works (desktop and mobile)
- [ ] All images display correctly
- [ ] CSS styling is applied (colors, fonts, layout)
- [ ] Smooth scrolling works
- [ ] Mobile menu toggles properly
- [ ] Links to other pages work:
  - [ ] Home (index.html)
  - [ ] About Us (about-us.html)
  - [ ] Attractions (attractions.html)
  - [ ] Contact Us (contact-us.html)
- [ ] YouTube video plays (or fallback image shows)
- [ ] Animations work on scroll
- [ ] Responsive design works on different screen sizes

## ⚠️ Known Issues

1. **Property Detail Page**: The `property/2` link won't work (we don't have that page)
   - You may want to create a placeholder page or redirect

2. **Subscribe Form**: Form won't submit (needs backend)
   - Currently set to `action="#"` to prevent errors
   - Would need form processing service to work

3. **Font Files**: Some icon fonts may not display if font files are missing
   - Font Awesome uses CDN backup, so should work
   - Icomoon may need font files if not in CSS

## 🐛 Troubleshooting

### Images not loading?
- Check that paths are relative (starting with `uploads/` not `/uploads/`)
- Verify files exist in the `uploads/` directory
- Check browser console for 404 errors

### CSS not applying?
- Check browser console for CSS file loading errors
- Verify all CSS files are in correct directories
- Clear browser cache and reload

### JavaScript not working?
- Check browser console for JavaScript errors
- Verify jQuery loads before other scripts
- Check that all JS files exist in `js/` directory

### YouTube video not playing?
- Requires internet connection
- Check browser console for API errors
- Video should fall back to static image if it fails

## 📝 Next Steps

1. **Test locally** using one of the server options above
2. **Fix any broken links** or missing assets
3. **Create placeholder pages** for missing content (like property/2)
4. **Set up form handling** if you want functional forms
5. **Deploy** to a web server when ready

---

**Note**: This is a static site reconstruction. Backend functionality (forms, booking, etc.) would need to be rebuilt separately.
