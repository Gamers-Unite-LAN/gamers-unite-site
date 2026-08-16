process.env.NODE_ENV = "development";

const { startServer } = await import("./server.js");
startServer();
