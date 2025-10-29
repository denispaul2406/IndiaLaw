# Cloud Functions

This directory contains optional Cloud Functions for background processing.

**Note**: The current implementation processes documents directly in Cloud Run API, so these functions are not required for deployment.

If you need to use Cloud Functions for background processing:

1. Deploy `process-document` function (triggers on document upload)
2. Deploy `analyze-document` function (triggers on text extraction)

See individual function directories for deployment instructions.

