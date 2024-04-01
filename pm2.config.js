module.exports = {
  apps: [
    {
      name: "media server",
      script: "./dist/index.js",
      instances: 3,
      exec_mode: "cluster",
    },
  ],
};
