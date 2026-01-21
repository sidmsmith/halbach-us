# Halbach.us Website

Reconstructed frontend for the Halbach.us vacation rental website.

## Structure

- `index.html` - Homepage
- `about-us.html` - About Us page
- `attractions.html` - Things To Do page
- `contact-us.html` - Contact Us page
- `property.html` - Property detail page (SAND CASTLE II 2306)
- `assets/` - All CSS, JS, fonts, images, and other assets
- `scripts/` - Utility scripts for local development
- `docs/` - Documentation files

## Deployment

This site is configured for deployment on Vercel. The site will automatically deploy when code is pushed to the `main` branch.

Live URL: https://halbach-us.vercel.app

## Local Development

To run locally:

1. Navigate to the project directory
2. Run the server script:
   ```powershell
   .\scripts\start-server.ps1
   ```
3. Open http://127.0.0.1:8000 in your browser

Or use Python directly:
```bash
python -m http.server 8000 --bind 127.0.0.1
```

## Notes

- This is a static frontend reconstruction
- Backend functionality (forms, booking) needs to be implemented separately
- All asset paths have been updated to use the `assets/` directory structure
