# Apartment Management System

A web-based apartment management system for tracking contracts, expenses, and payments.

## Features

- Manage apartments, tenants, and contracts
- Track expenses (rent, utilities, maintenance, etc.)
- Record payments and track payment history
- Generate PDF reports
- Multi-language support (English/Albanian)
- Mobile-responsive design
- Progressive Web App (PWA) support

## Deployment

### Option 1: GitHub Pages (Free)

1. Push your code to a GitHub repository
2. Go to repository Settings → Pages
3. Select source branch (usually `main` or `master`)
4. Your app will be available at: `https://yourusername.github.io/repository-name`

### Option 2: Netlify (Free, Recommended)

1. Push your code to GitHub
2. Go to [netlify.com](https://netlify.com) and sign up
3. Click "New site from Git"
4. Connect your GitHub repository
5. Build settings:
   - Build command: (leave empty)
   - Publish directory: `/` (root)
6. Deploy!

### Option 3: Vercel (Free)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and sign up
3. Click "New Project"
4. Import your GitHub repository
5. Deploy!

## Mobile Access

After deployment, you can:

1. **Open in mobile browser**: Just visit the deployed URL on your phone
2. **Add to Home Screen** (PWA):
   - On iOS: Safari → Share → Add to Home Screen
   - On Android: Chrome → Menu → Add to Home Screen

## Supabase Configuration

After deployment, you need to:

1. Go to your Supabase project dashboard
2. Navigate to **Settings → API**
3. Add your deployed domain to **Allowed CORS origins**
   - Example: `https://your-app.netlify.app`
   - Or: `https://yourusername.github.io`

## Project Structure

```
├── index.html          # Main HTML file
├── css/
│   └── styles.css      # Stylesheet
├── js/
│   └── app.js          # Application logic
├── assets/             # Images and icons
│   ├── favicon.svg
│   ├── Developer.gif
│   └── Folder.gif
└── site.webmanifest    # PWA manifest
```

## Local Development

1. Open `index.html` in a web browser
2. Or use a local server:
   ```bash
   # Python
   python -m http.server 8000
   
   # Node.js
   npx serve
   ```

## Technologies

- Vanilla JavaScript
- Supabase (Backend/Database)
- jsPDF (PDF generation)
- HTML5/CSS3

