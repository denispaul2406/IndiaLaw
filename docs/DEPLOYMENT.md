# Deployment Guide

Complete guide to deploying IndiaLawAI to Google Cloud Platform.

## Prerequisites

- GCP Project with billing enabled
- Required APIs enabled:
  - Cloud Run API
  - Document AI API
  - Vertex AI API
  - Firestore API
  - Cloud Storage API
  - Cloud Translation API
- Firebase project configured
- Service account with required permissions
- `gcloud` CLI installed and authenticated

## Step 1: Setup Infrastructure

### Create Storage Bucket

```bash
gsutil mb -p YOUR_PROJECT_ID -c STANDARD -l asia-south1 gs://YOUR_BUCKET_NAME
```

### Create Firestore Database

1. Go to [Firestore Console](https://console.cloud.google.com/firestore)
2. Select **Native mode**
3. Choose region (asia-south1 recommended)

### Create Document AI Processors

1. Go to [Document AI Console](https://console.cloud.google.com/ai/document-ai)
2. Create processors:
   - Layout Parser (for text extraction)
   - OCR Processor (for scanned documents)

Note the processor IDs for environment variables.

## Step 2: Deploy Cloud Run API

### Option A: Deploy via Cloud Shell (Recommended)

1. Open [Cloud Shell](https://shell.cloud.google.com/)
2. Upload `backend/cloud-run` folder
3. Run:

```bash
cd backend/cloud-run

gcloud run deploy indialawai-api \
  --source . \
  --region asia-south1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars \
    GCP_PROJECT_ID=YOUR_PROJECT_ID,\
    GCP_REGION=asia-south1,\
    STORAGE_BUCKET=YOUR_BUCKET_NAME,\
    DOCUMENT_AI_LAYOUT_PROCESSOR=projects/YOUR_PROJECT_ID/locations/asia-south1/processors/YOUR_PROCESSOR_ID,\
    FIREBASE_PROJECT_ID=YOUR_PROJECT_ID \
  --project YOUR_PROJECT_ID
```

### Option B: Deploy via Console

1. Go to [Cloud Run Console](https://console.cloud.google.com/run)
2. Click **Create Service**
3. Upload ZIP of `backend/cloud-run` folder
4. Configure environment variables
5. Deploy

## Step 3: Deploy Frontend

### Build Frontend

```bash
# Set environment variables in .env.production
VITE_API_URL=https://your-cloud-run-url.run.app
# ... other Firebase config

npm run build
```

### Deploy to Firebase Hosting

```bash
firebase deploy --only hosting
```

Or deploy to any static hosting service (Vercel, Netlify, etc.)

## Step 4: Verify Deployment

1. Test API endpoint: `https://your-api-url.run.app/health`
2. Test frontend: Open deployed frontend URL
3. Upload a test document
4. Verify processing works

## Troubleshooting

### API Not Responding

- Check Cloud Run logs: `gcloud run services logs read indialawai-api`
- Verify environment variables are set
- Check service account permissions

### Frontend Can't Connect

- Verify `VITE_API_URL` points to correct Cloud Run URL
- Check CORS settings in Cloud Run
- Verify Firebase config is correct

## Cost Estimation

Approximate costs per month (50 documents):
- Document AI: ~$7.50
- Vertex AI: ~$25
- Storage: ~$0.10
- Cloud Run: ~$5
- **Total: ~$37.60/month**

## Security Considerations

- Service account keys should never be committed to Git
- Use Cloud Run service accounts for permissions
- Enable authentication for production
- Use HTTPS only
- Regularly rotate service account keys

