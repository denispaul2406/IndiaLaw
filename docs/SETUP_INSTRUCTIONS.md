# IndiaLawAI - Complete Setup Instructions

## Prerequisites Checklist

Before starting, you need to provide:

### 1. GCP Project Details
- [ ] **GCP Project ID**: _______________
- [ ] **Service Account JSON Key**: Download and save as `backend/config/service-account.json`
- [ ] **Billing Account**: Linked with $500 credits

### 2. Firebase Project (for Authentication)
- [ ] **Firebase Project ID**: _______________
- [ ] **Web App Config**: Will be generated automatically

### 3. Legal Documents (for Knowledge Base)
Download from https://indiacode.nic.in or provide:
- [ ] Indian Contract Act, 1872 (PDF/text)
- [ ] GST Act, 2017 + Notification 13/2017 (PDF/text)
- [ ] Contract Labour Act, 1970 (PDF/text)
- [ ] DPDP Act, 2023 (PDF/text)
- [ ] Indian Stamp Act, 1899 (PDF/text)
- [ ] Building and Construction Workers Act (PDF/text)

## Step-by-Step Setup Guide

### Step 1: GCP Project Setup

1. **Go to GCP Console**: https://console.cloud.google.com
2. **Create/Select Project**:
   - Click project dropdown → New Project
   - Name: `indialawai-production`
   - Note the Project ID

3. **Enable Billing**:
   - Go to Billing → Link your account
   - Ensure $500 credits are available

4. **Enable Required APIs** (use provided script):
   ```bash
   cd backend/scripts
   ./enable-apis.sh
   ```
   Or enable manually in GCP Console:
   - Document AI API
   - Vertex AI API
   - Cloud Translation API
   - Cloud Storage API
   - Cloud Run API
   - Cloud Functions API
   - Pub/Sub API
   - Firestore API
   - Firebase Authentication API

### Step 2: Service Account Setup

1. **Create Service Account**:
   - Go to IAM & Admin → Service Accounts
   - Create Service Account: `indialawai-service`
   - Grant Roles:
     - Cloud Storage Admin
     - Document AI Admin
     - Vertex AI User
     - Cloud Translation API User
     - Cloud Run Admin
     - Pub/Sub Admin
     - Firestore Admin

2. **Download JSON Key**:
   - Click on service account → Keys → Add Key → JSON
   - Download and save as: `backend/config/service-account.json`
   - **IMPORTANT**: Never commit this file to git!

### Step 3: Cloud Storage Setup

1. **Create Buckets**:
   ```bash
   cd backend/scripts
   ./setup-storage.sh
   ```
   
   Or manually:
   - Bucket: `{PROJECT_ID}-documents`
   - Location: `asia-south1` (Mumbai)
   - Storage Class: Standard
   - Lifecycle: Move to Coldline after 90 days

2. **Set CORS**:
   ```json
   [
     {
       "origin": ["*"],
       "method": ["GET", "POST", "PUT", "DELETE"],
       "responseHeader": ["Content-Type"],
       "maxAgeSeconds": 3600
     }
   ]
   ```

### Step 4: Document AI Setup

1. **Create Processors** (use script):
   ```bash
   cd backend/scripts
   ./setup-document-ai.sh
   ```

2. **Note Processor IDs**:
   - Form Parser: _______________
   - Layout Parser: _______________
   - OCR Processor: _______________

### Step 5: Firebase Setup

1. **Create Firebase Project**:
   - Go to: https://console.firebase.google.com
   - Add Project → Use existing GCP project
   - Enable Authentication → Google Sign-in

2. **Get Web Config**:
   - Project Settings → Your apps → Web app
   - Copy config → Save in `.env` file (frontend)

### Step 6: Vertex AI Search Setup

1. **Create Data Store** (use script):
   ```bash
   cd knowledge-base/scripts
   ./setup-vertex-search.sh
   ```

2. **Upload Legal Documents** (after preparing data):
   ```bash
   cd knowledge-base/scripts
   ./upload-legal-docs.sh
   ```

### Step 7: Environment Variables

1. **Backend `.env`** (`backend/.env`):
   ```env
   GCP_PROJECT_ID=your-project-id
   GCP_REGION=asia-south1
   SERVICE_ACCOUNT_PATH=./config/service-account.json
   
   DOCUMENT_AI_FORM_PROCESSOR=projects/xxx/locations/xxx/processors/xxx
   DOCUMENT_AI_LAYOUT_PROCESSOR=projects/xxx/locations/xxx/processors/xxx
   DOCUMENT_AI_OCR_PROCESSOR=projects/xxx/locations/xxx/processors/xxx
   
   STORAGE_BUCKET=your-project-id-documents
   
   VERTEX_AI_SEARCH_DATA_STORE_ID=xxx
   VERTEX_AI_SEARCH_LOCATION=asia-south1
   
   FIREBASE_PROJECT_ID=your-firebase-project-id
   ```

2. **Frontend `.env`** (`src/.env`):
   ```env
   VITE_API_URL=https://your-cloud-run-url.run.app
   VITE_FIREBASE_API_KEY=xxx
   VITE_FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=xxx
   VITE_FIREBASE_STORAGE_BUCKET=xxx.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
   VITE_FIREBASE_APP_ID=xxx
   ```

### Step 8: Install Dependencies

1. **Backend**:
   ```bash
   cd backend/cloud-run
   npm install
   
   cd ../cloud-functions
   npm install
   ```

2. **Frontend**:
   ```bash
   npm install
   ```

### Step 9: Deploy Services

1. **Deploy Cloud Functions**:
   ```bash
   cd backend/cloud-functions
   ./deploy.sh
   ```

2. **Deploy Cloud Run Services**:
   ```bash
   cd backend/cloud-run
   ./deploy.sh
   ```

3. **Update Frontend API URL**:
   - Update `.env` with Cloud Run URLs
   - Rebuild frontend

### Step 10: Upload Knowledge Base

1. **Prepare Legal Documents**:
   - Place PDFs in `knowledge-base/data/`
   - Run processing script:
   ```bash
   cd knowledge-base/scripts
   ./process-and-upload.sh
   ```

## Verification Checklist

After setup, verify:

- [ ] Service account JSON is in `backend/config/service-account.json`
- [ ] All APIs are enabled in GCP Console
- [ ] Cloud Storage buckets created
- [ ] Document AI processors created
- [ ] Firebase authentication configured
- [ ] Vertex AI Search data store created
- [ ] Environment variables set correctly
- [ ] Services deployed successfully
- [ ] Frontend can connect to backend
- [ ] Test upload works
- [ ] Test analysis works
- [ ] Test Q&A works

## Quick Start Commands

Once everything is set up:

```bash
# Start local development (frontend)
npm run dev

# Deploy backend changes
cd backend/cloud-run && npm run deploy

# Deploy functions
cd backend/cloud-functions && npm run deploy
```

## Troubleshooting

See `docs/TROUBLESHOOTING.md` for common issues.

## Support

If you need help with any step, refer to:
- `docs/ARCHITECTURE.md` - System architecture
- `docs/API_DOCUMENTATION.md` - API endpoints
- `docs/DEPLOYMENT.md` - Deployment guide

