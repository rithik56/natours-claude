import { describe, expect, it } from 'vitest';
import { parseMongoOptions } from '../../scripts/ci-mongo.ts';

describe('parseMongoOptions', () => {
  it('[Q2] defaults to port 27017 on 127.0.0.1', () => {
    expect(parseMongoOptions({})).toEqual({ ip: '127.0.0.1', port: 27017 });
  });

  it('[Q2] reads the port from CI_MONGO_PORT', () => {
    expect(parseMongoOptions({ CI_MONGO_PORT: '27018' })).toEqual({
      ip: '127.0.0.1',
      port: 27018,
    });
  });

  it('[S18] always binds the loopback address, whatever the environment says', () => {
    expect(parseMongoOptions({ CI_MONGO_HOST: '0.0.0.0' }).ip).toBe(
      '127.0.0.1',
    );
  });

  it('[Q2] treats an empty CI_MONGO_PORT as unset', () => {
    expect(parseMongoOptions({ CI_MONGO_PORT: '' }).port).toBe(27017);
  });

  it.each(['abc', '0', '-1', '65536', '27017.5', '27 017'])(
    '[Q2] rejects %j as a port',
    (value) => {
      expect(() => parseMongoOptions({ CI_MONGO_PORT: value })).toThrow(
        /CI_MONGO_PORT/,
      );
    },
  );
});
