import * as json from './json';

describe('JSON', () => {
  const obj = {
    prop1: true,
    prop2: 'test 1',
    prop3: 1560,
    prop4: {
      prop5: 'test 2',
      prop6: [{ prop7: 'test 3' }, 'test'],
    },
    prop5: () => true,
  };

  const stringifiedOriginal = JSON.stringify(obj);

  it('stringifies objects correctly', () => {
    const stringified = json.stringify(obj);

    expect(stringified).toBe(
      // tslint:disable-next-line:max-line-length
      '{"prop1":true,"prop2":"test 1","prop3":1560,"prop4":{"prop5":"test 2","prop6":[{"prop7":"test 3"},"test"]}}',
    );
    expect(stringified).toBe(stringifiedOriginal);
  });

  it('parses string correctly', () => {
    const parsedObj = json.parse(stringifiedOriginal);
    const parsedObjOriginal = JSON.parse(stringifiedOriginal);

    expect(parsedObj).toEqual(parsedObjOriginal);

    const string = '"abc"';
    const boolean = 'true';
    const number = '123';

    expect(json.parse(string)).toBe('abc');
    expect(json.parse(boolean)).toBe(true);
    expect(json.parse(number)).toBe(123);
  });

  it('throws while parsing invalid string', () => {
    expect(() => {
      json.parse('{ prop1: true }');
    }).toThrow();
    expect(() => {
      json.parse('{ "prop1: true" }');
    }).toThrow();
    expect(() => {
      json.parse('{ "prop1": true, prop2: false }');
    }).toThrow();
  });
});
