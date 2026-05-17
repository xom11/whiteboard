describe('safeJsx', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.restoreAllMocks();
    jest.resetModules();
  });

  it('trả về giá trị khi fn thành công', () => {
    const { safeJsx } = require('../safeJsx');
    const result = safeJsx('ok', () => 42);
    expect(result).toBe(42);
  });

  it('trả về undefined khi fn throw và không có fallback', () => {
    process.env.NODE_ENV = 'production';
    jest.isolateModules(() => {
      const { safeJsx } = require('../safeJsx');
      const result = safeJsx('boom', () => {
        throw new Error('nope');
      });
      expect(result).toBeUndefined();
    });
  });

  it('trả về fallback khi fn throw và có fallback', () => {
    process.env.NODE_ENV = 'production';
    jest.isolateModules(() => {
      const { safeJsx } = require('../safeJsx');
      const result = safeJsx(
        'boom-with-fallback',
        () => {
          throw new Error('nope');
        },
        'default',
      );
      expect(result).toBe('default');
    });
  });

  it('log warn ở dev mode khi fn throw', () => {
    process.env.NODE_ENV = 'development';
    jest.isolateModules(() => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const { safeJsx } = require('../safeJsx');
      safeJsx('dev-label', () => {
        throw new Error('bang');
      });
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        '[whiteboard:jsxgraph]',
        'dev-label',
        expect.any(Error),
      );
    });
  });

  it('im lặng ở production mode khi fn throw', () => {
    process.env.NODE_ENV = 'production';
    jest.isolateModules(() => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const { safeJsx } = require('../safeJsx');
      safeJsx('prod-label', () => {
        throw new Error('bang');
      });
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  it('không log khi fn thành công ở dev mode', () => {
    process.env.NODE_ENV = 'development';
    jest.isolateModules(() => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const { safeJsx } = require('../safeJsx');
      const result = safeJsx('happy', () => 'value');
      expect(result).toBe('value');
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});
