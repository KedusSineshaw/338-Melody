// config.js (CommonJS)
module.exports = {
  provider: "aiornot",

  aiornot: {
    apiUrl: "https://api.aiornot.com/v1/reports/music",
    apiKey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjIzMmNmMjVjLWIxNjctNGU0Yy04NzA4LTdmYzg1NmFjNTk0MiIsInVzZXJfaWQiOiI3ZGE0NDYwNC1lM2UyLTQyOTYtOWUzZC05NmIxOGJiNjc2ZmMiLCJhdWQiOiJhY2Nlc3MiLCJleHAiOjE5MjAxMzA5NzgsInNjb3BlIjoiYWxsIn0.dcdqxOxuus6PaqT2bIqjzEfIRtb96GAzHj2_g30Ow,
  },

  cyanite: {
    apiUrl: process.env.CYANITE_API_URL,
    apiKey: process.env.CYANITE_ACCESS_TOKEN,
  },

  ircam: {
    apiUrl: process.env.IRCAM_API_URL, 
    apiKey: process.env.IRCAM_API_KEY,
  },
};
