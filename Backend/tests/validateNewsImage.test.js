const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const validateNewsImage = require("../middleware/validateNewsImage");

async function invokeMiddleware(file) {
  const req = { file };
  let statusCode = 200;
  let responseBody;
  let nextCalled = false;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      responseBody = body;
      return this;
    },
  };

  await validateNewsImage(req, res, (error) => {
    if (error) throw error;
    nextCalled = true;
  });

  return { statusCode, responseBody, nextCalled };
}

test("accepts a file with a PNG signature", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "newshub-image-"));
  const filePath = path.join(directory, "valid.png");
  await fs.writeFile(filePath, Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00,
  ]));

  try {
    const result = await invokeMiddleware({
      path: filePath,
      mimetype: "image/png",
    });
    assert.equal(result.nextCalled, true);
    assert.equal(result.statusCode, 200);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("rejects a text file disguised as a JPEG", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "newshub-image-"));
  const filePath = path.join(directory, "fake.jpg");
  await fs.writeFile(filePath, "this is not a JPEG image");

  try {
    const result = await invokeMiddleware({
      path: filePath,
      mimetype: "image/jpeg",
    });
    assert.equal(result.nextCalled, false);
    assert.equal(result.statusCode, 400);
    await assert.rejects(fs.access(filePath));
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("rejects a missing image", async () => {
  const result = await invokeMiddleware(undefined);
  assert.equal(result.nextCalled, false);
  assert.equal(result.statusCode, 400);
  assert.equal(result.responseBody.success, false);
});
