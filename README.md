<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# LotoGen Pro

Advanced lottery number generator with statistical analysis and intelligent filtering.

> **Coolify App Name:** `lotogen` (or similar)  
> **Repository:** `LotoGen-Pro`

---

## 🚀 Deploy to Coolify

### Step 1: Create Application

1. Go to **Coolify Dashboard** → **New Resource** → **Application**
2. Select the `LotoGen-Pro` Git repository
3. Set **Build Pack** to **Nixpacks** or **Static** (Vite build)

### Step 2: Configure Environment Variables

Navigate to: **Application** → **Environment Variables**

#### Required Variables

| Variable       | Description     | Example Value                   |
| -------------- | --------------- | ------------------------------- |
| `VITE_API_URL` | Backend API URL | `https://api-lotto.n2flow.tech` |

#### Optional Variables

| Variable                 | Description                     | Example Value  |
| ------------------------ | ------------------------------- | -------------- |
| `VITE_GA_MEASUREMENT_ID` | Google Analytics Measurement ID | `G-XXXXXXXXXX` |

### Step 3: Build Settings

Ensure these build settings are configured:

| Setting         | Value           |
| --------------- | --------------- |
| Build Command   | `npm run build` |
| Output Dir      | `dist`          |
| Install Command | `npm install`   |

### Step 4: Domain Configuration

1. Go to **Application** → **Domains**
2. Add your domain (e.g., `lotogen.n2flow.tech`)
3. Enable **Auto SSL** for HTTPS

### Step 5: Deploy

Click **Deploy** and monitor the build logs.

---

## 📋 Environment Variables Reference

```env
# ============================================================
# FRONTEND ENVIRONMENT VARIABLES (LotoGen-Pro)
# ============================================================
# These are build-time variables - must be prefixed with VITE_

# Backend API URL (Required)
# Points to your LotoGen-Backend deployment
VITE_API_URL=https://api-lotto.n2flow.tech

# Google Analytics Measurement ID (Optional)
# For tracking user analytics
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

> **Note:** Vite requires environment variables to be prefixed with `VITE_` to be exposed to the client.

---

## 🔗 Related: Backend Configuration

The backend (`LotoGen-Backend`) has its own set of environment variables.  
See the [Backend README](../LotoGen-Backend/README.md) for backend Coolify configuration.

**Summary of Backend Variables:**

- `DATABASE_URL` - PostgreSQL connection
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` - Admin dashboard credentials
- `JWT_SECRET` - Authentication secret
- See backend README for complete list

---

## 💻 Local Development

**Prerequisites:** Node.js 18+

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

### Local Environment

Create a `.env.local` file:

```env
VITE_API_URL=http://localhost:3001
```
