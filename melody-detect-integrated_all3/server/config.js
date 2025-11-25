// config.js (CommonJS)
module.exports = {
  provider: "aiornot",

  aiornot: {
    apiUrl: "https://api.aiornot.com/v1/reports/music",
    apiKey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjIzMmNmMjVjLWIxNjctNGU0Yy04NzA4LTdmYzg1NmFjNTk0MiIsInVzZXJfaWQiOiI3ZGE0NDYwNC1lM2UyLTQyOTYtOWUzZC05NmIxOGJiNjc2ZmMiLCJhdWQiOiJhY2Nlc3MiLCJleHAiOjE5MjAxMzA5NzgsInNjb3BlIjoiYWxsIn0.dcdqxOxuus6PaqT2bIqjzEfIRtb96GAzHj2_g30Ow,
  },

  ircam: {
    clientId: process.env.IRCAM_CLIENT_ID,
    clientSecret: process.env.IRCAM_CLIENT_SECRET,
    tokenUrl: process.env.IRCAM_TOKEN_URL,
    baseUrl: process.env.IRCAM_BASE_URL,
  },
};
