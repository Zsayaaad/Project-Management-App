// Mock third-party boundaries globally.
// These mocks prevent the real SDK clients from being instantiated,
// which avoids network calls during tests.
jest.mock("../lib/stream.js", () => ({
  chatClient: {
    upsertUsers: jest.fn(),
    channel: jest.fn(),
    createToken: jest.fn(),
  },
  videoClient: { upsertUsers: jest.fn(), generateUserToken: jest.fn() },
  streamClient: {
    upsertUsers: jest.fn(),
    channel: jest.fn(),
    createToken: jest.fn(),
  },
}));

jest.mock("../lib/imagekit.js", () => ({
  imagekit: {
    deleteFile: jest.fn(),
    getAuthenticationParameters: jest.fn(),
  },
}));

jest.mock("../lib/queues.js", () => ({
  syncQueue: { add: jest.fn().mockResolvedValue({ id: "mock-job-id" }) },
}));

jest.mock("../workers/sync.worker.js", () => ({
  syncWorker: { close: jest.fn() },
}));
