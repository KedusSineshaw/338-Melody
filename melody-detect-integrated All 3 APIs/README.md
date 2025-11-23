# Melody Detect — Integrated (Sightengine, Hive, SH.Labs)

## Run
Server:
  cd server
  cp config.example.js config.js   # fill provider + creds

  npm install
  In .env:
  AIORNOT_API_KEY=
  CYANITE_ACCESS_TOKEN=
  CYANITE_WEBHOOK_SECRET=
  CYANITE_API_URL=https://api.cyanite.ai/graphql
  IRCAM_CLIENT_ID=
  IRCAM_CLIENT_SECRET=

  IRCAM_AUTH_URL=https://api.ircamamplify.io/oauth/token
  IRCAM_API_BASE_URL=https://api.ircamamplify.io
  IRCAM_STORAGE_BASE_URL=https://storage.ircamamplify.io

  npm start  # http://localhost:5000
  
New Server:
ngrok http 5000

Client:
  cd client
  npm install
  npm run dev # http://localhost:5173
