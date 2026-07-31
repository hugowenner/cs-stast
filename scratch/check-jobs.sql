SELECT "sourceMatchId", status, LEFT("downloadUrl", 60) as demo, "errorMessage" FROM sync_jobs ORDER BY "createdAt" DESC LIMIT 20;
