const { Writable } = require('stream');
const { buildLogger } = require('../../src/core/logger');

function capture() {
  const lines = [];
  const stream = new Writable({
    write(chunk, enc, cb) {
      lines.push(chunk.toString());
      cb();
    },
  });
  return { lines, stream };
}

describe('logger redaction', () => {
  test('never writes tokens, cookies or passwords', () => {
    const { lines, stream } = capture();
    const log = buildLogger(stream);
    // LOG_LEVEL is "silent" in tests, so switch the level on for this logger only.
    log.level = 'info';

    log.info(
      {
        req: {
          headers: { authorization: 'Bearer SECRET-TOKEN', cookie: 'accessToken=SECRET-COOKIE' },
        },
        user: { password: 'SECRET-PASSWORD', refreshToken: 'SECRET-REFRESH' },
        accessToken: 'SECRET-ACCESS',
      },
      'login attempt',
    );

    const output = lines.join('');
    expect(output).toContain('login attempt');
    expect(output).not.toMatch(/SECRET/);
    expect(output).toContain('[REDACTED]');
  });
});
