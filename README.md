# IndiaLawAI - Production Legal Compliance Platform

A production-ready, cloud-native legal document compliance analysis platform built on Google Cloud Platform. Analyzes legal documents against Indian compliance laws using AI, provides risk assessments, and offers multilingual Q&A capabilities.

## 🏗️ Architecture

- **Frontend**: React + TypeScript + Tailwind CSS (Vite)
- **Backend**: Cloud Run API (Node.js/Express)
- **Storage**: Cloud Storage
- **Database**: Firestore
- **AI Services**: 
  - Document AI (text extraction)
  - Vertex AI (Gemini Pro for analysis)
  - Translation API (multilingual support)
- **Authentication**: Firebase Authentication

## 📁 Project Structure

```
.
├── backend/
│   ├── cloud-run/          # Cloud Run API service
│   │   ├── src/
│   │   │   ├── routes/      # API endpoints
│   │   │   ├── services/   # Business logic
│   │   │   └── middleware/ # Auth & middleware
│   │   └── package.json
│   └── cloud-functions/     # Background processing (optional)
├── src/                     # Frontend React app
│   ├── components/          # UI components
│   ├── pages/               # Page components
│   ├── services/            # API clients
│   └── contexts/            # React contexts
├── docs/                    # Documentation
└── package.json             # Frontend dependencies
```

## 🚀 Quick Start (Local Development)

### Prerequisites

- Node.js 20+
- GCP Project with APIs enabled:
  - Cloud Run
  - Document AI
  - Vertex AI
  - Firestore
  - Cloud Storage
- Firebase project configured
- Service account with required permissions

### Frontend Setup

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development server
npm run dev
```

### Backend Setup

```bash
cd backend/cloud-run

# Install dependencies
npm install

# Set up service account
# Copy service-account.json to backend/config/

# Build
npm run build

# Start locally (requires service account)
npm run dev
```

## 📦 Deployment

### Deploy via Cloud Shell (Recommended)

1. **Open Cloud Shell**: https://shell.cloud.google.com/

2. **Upload your code** or clone from GitHub

3. **Deploy Cloud Run API**:
   ```bash
   cd backend/cloud-run
   
   gcloud run deploy indialawai-api \
     --source . \
     --region asia-south1 \
     --platform managed \
     --allow-unauthenticated \
     --set-env-vars GCP_PROJECT_ID=your-project-id,STORAGE_BUCKET=your-bucket \
     --project your-project-id
   ```

4. **Deploy Frontend**:
   ```bash
   # Build frontend
   npm run build
   
   # Deploy to Firebase Hosting or any static host
   firebase deploy --only hosting
   ```

See `docs/DEPLOYMENT.md` for detailed deployment instructions.

## 🎯 Features

- **Document Upload & Processing**
  - PDF upload (up to 15MB)
  - Automatic text extraction via Document AI
  - Multi-language document support

- **AI-Powered Compliance Analysis**
  - Analyzes against Indian legal frameworks:
    - GST Compliance
    - Labor Laws
    - Contract Validity
    - Data Protection (DPDP)
  - Risk assessment with confidence scores
  - Specific recommendations with legal citations

- **Multilingual Q&A**
  - Ask questions in any supported language
  - Responses in the same language
  - Streaming responses
  - Conversation history

- **PDF Reports**
  - Generate professional compliance reports
  - Downloadable PDF format
  - Complete analysis summary

## 🔐 Authentication

The platform uses Firebase Authentication:
- Google OAuth sign-in
- Email/password authentication
- Secure token-based API access

## 📚 Documentation

- `docs/DEPLOYMENT.md` - Complete deployment guide
- `docs/SETUP_INSTRUCTIONS.md` - Detailed setup instructions
- `docs/COMPLETE_SUMMARY.md` - System architecture overview

## 🔧 Configuration

### Environment Variables

**Frontend** (`.env.local`):
```
VITE_API_URL=https://your-cloud-run-url.run.app
VITE_FIREBASE_API_KEY=your-firebase-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
```

**Backend** (Cloud Run):
```
GCP_PROJECT_ID=your-project-id
STORAGE_BUCKET=your-bucket-name
DOCUMENT_AI_LAYOUT_PROCESSOR=projects/.../processors/...
```

## 🛠️ Technologies

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: Node.js, Express, TypeScript
- **Cloud**: Google Cloud Platform
- **AI**: Google Gemini (Vertex AI)
- **Database**: Firestore
- **Storage**: Cloud Storage
- **Auth**: Firebase Authentication

## 📄 License

This project is proprietary software. All rights reserved.

## 🤝 Support

For deployment and setup issues, refer to the documentation in the `docs/` folder.

---

**Built with ❤️ for Legal Compliance Analysis**
