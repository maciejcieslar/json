const types = {
  character: 'character',
  openObject: 'openObject',
  closeObject: 'closeObject',
  openArray: 'openArray',
  closeArray: 'closeArray',
  delimeter: 'delimeter',
  string: 'string',
  object: 'object',
  array: 'array',
  comma: 'comma',
  key: 'key',
  value: 'value',
  whitespace: 'whitespace',
};

const typesMap = {
  '[': types.openArray,
  ']': types.closeArray,
  '{': types.openObject,
  '}': types.closeObject,
  '"': types.string,
  ':': types.delimeter,
  ',': types.comma,
  ' ': types.whitespace,
};

class Token {
  public type: string;
  public value: string;

  public constructor(type: string, value: string) {
    this.type = type;
    this.value = value;
  }

  public getValue = () => {
    return this.value;
  };
}

class Expression {
  public type: string;
  public values: Value[];

  public constructor(type: string, values: Value[]) {
    this.type = type;
    this.values = values;
  }

  public getValue = () => {
    return this.values.reduce((result, value) => {
      return result + value.getValue();
    }, '');
  };

  public getValues = () => {
    return [...this.values];
  };

  public static isExpression = (value: any) => {
    return value instanceof Expression;
  };
}

type Value = Expression | Token;

class Stream<T> {
  private index = 0;
  private input: T[];

  public constructor(input: T[]) {
    this.input = input;
  }

  next() {
    const character = this.input[this.index];

    this.index += 1;

    return character;
  }

  previous() {
    return this.input[this.index - 1];
  }

  isFinished() {
    return this.index >= this.input.length;
  }
}

const tokenize = (input: string) => {
  return input
    .split('')
    .map((character) => {
      const type = typesMap[character] || types.character;

      return new Token(type, character);
    })
    .filter(Boolean);
};

const parseStringsToExpressions = (tokens: Token[]) => {
  const stream = new Stream(tokens);

  const results: Value[] = [];

  while (!stream.isFinished()) {
    const token = stream.next();

    if (token.type === types.string) {
      // escape

      const tokens = [];

      while (!stream.isFinished()) {
        const nextToken = stream.next();

        if (nextToken.type !== types.string) {
          tokens.push(nextToken);

          continue;
        }

        break;
      }

      results.push(new Expression(types.string, tokens));

      continue;
    }

    if (token.type === types.whitespace) {
      continue;
    }

    results.push(token);
  }

  return results;
};

const lookForMap = {
  '{': '}',
  '[': ']',
  '"': '"',
};

const anotherTypesMap = {
  [types.openObject]: types.object,
  [types.openArray]: types.array,
};

const findMatches = (stream: Stream<Value>, matchForToken: Token) => {
  const lookFor = lookForMap[matchForToken.getValue()];
  const lookForType = anotherTypesMap[typesMap[matchForToken.getValue()]];

  if (!lookFor) {
    throw new Error('x');
  }

  const results = [];

  while (!stream.isFinished()) {
    const tokenOrExpression = stream.next();
    const value = tokenOrExpression.getValue();
    const type = typesMap[value];

    if (!(tokenOrExpression instanceof Token)) {
      results.push(tokenOrExpression);

      continue;
    }

    if (value === lookFor) {
      return new Expression(lookForType, results);
    }

    if (type === types.openArray) {
      results.push(findMatches(stream, tokenOrExpression));

      continue;
    }

    if (type === types.openObject) {
      results.push(findMatches(stream, tokenOrExpression));

      continue;
    }

    results.push(tokenOrExpression);
  }

  throw new Error(`No match found for ${lookFor} ${matchForToken.getValue()}`);
};

const parseObjectsAndArrays = (tokensAndExpressions: Value[]) => {
  const stream = new Stream(tokensAndExpressions);

  const results = [];

  while (!stream.isFinished()) {
    const value = stream.next();
    const type = typesMap[value.getValue()];

    if (type === types.openObject) {
      results.push(findMatches(stream, value as Token));

      continue;
    }

    if (type === types.openArray) {
      results.push(findMatches(stream, value as Token));

      continue;
    }

    results.push(value);
  }

  return results;
};

const parseObjectKeysAndValues = (value: Expression) => {
  const values = value.getValues();
  const stream = new Stream(values);

  const results = [];

  while (!stream.isFinished()) {
    const val = stream.next() as Expression;

    if (val.type === types.object) {
      results.push(parseObjectKeysAndValues(val));

      continue;
    }

    if (val.type === types.array) {
      results.push(parseArrayKeysAndValues(val));

      continue;
    }

    if (val.type === types.string) {
      const nextVal = stream.next() as Expression;

      if (!nextVal || nextVal.type === types.comma) {
        if (val.type === types.string) {
          results.push(new Expression(types.string, val.getValues()));

          continue;
        }

        results.push(new Expression(types.value, val.getValues()));
        continue;
      }

      if (nextVal.type === types.delimeter) {
        results.push(new Expression(types.key, val.getValues()));

        continue;
      }

      throw new Error('Error while parsing object');
    }

    if (val.type === types.character) {
      const vs: Value[] = [val];

      while (!stream.isFinished()) {
        const nextV = stream.next();

        if (nextV.type === types.character) {
          vs.push(nextV);

          continue;
        }

        break;
      }

      results.push(new Expression(types.value, vs));

      continue;
    }
  }

  return new Expression(types.object, results);
};

const parseArrayKeysAndValues = (value: Expression) => {
  const results = [];
  const values = value.getValues();
  const stream = new Stream(values);

  while (!stream.isFinished()) {
    const val = stream.next() as Expression;

    if (val.type === types.object) {
      results.push(parseObjectKeysAndValues(val));

      continue;
    }

    if (val.type === types.array) {
      results.push(parseArrayKeysAndValues(val));

      continue;
    }

    if (val.type === types.comma) {
      continue;
    }

    if (val.type === types.string) {
      results.push(new Expression(types.string, val.getValues()));

      continue;
    }

    results.push(new Expression(types.value, val.getValues()));
  }

  return new Expression(types.array, results);
};

const parseKeysAndValues = (values: Value[]) => {
  const stream = new Stream(values);

  const results: Expression[] = [];

  while (!stream.isFinished()) {
    const value = stream.next() as Expression;

    if (!Expression.isExpression(value)) {
      const v = (value as unknown) as Token;

      if (v.type === types.character) {
        const vs: Value[] = [v];

        while (!stream.isFinished()) {
          const nextV = stream.next();

          if (nextV.type === types.character) {
            vs.push(nextV);

            continue;
          }

          break;
        }

        results.push(new Expression(types.value, vs));
      }

      continue;
    }

    if (value.type === types.object) {
      results.push(parseObjectKeysAndValues(value));

      continue;
    }

    if (value.type === types.array) {
      results.push(parseArrayKeysAndValues(value));

      continue;
    }

    if (value.type === types.string) {
      results.push(new Expression(types.string, value.getValues()));

      continue;
    }

    results.push(new Expression(types.value, value.getValues()));
  }

  return results;
};

function groupEveryNElements<T>(collection: T[], n: number): T[][] {
  let copy = [...collection];
  const result = [];

  while (copy.length) {
    result.push(copy.slice(0, n));
    copy = copy.slice(n);
  }

  return result;
}

const parseValue = (value: string) => {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  const number = Number(value);

  if (!Number.isNaN(number)) {
    return number;
  }

  return value;
};

const getValue = (expr: Expression) => {
  if (expr.type === types.value) {
    const parsed = parseValue(expr.getValue());

    if (parsed === expr.getValue()) {
      throw new Error('Parsing error!');
    }

    return parsed;
  }

  if (expr.type === types.array) {
    return transformArray(expr);
  }

  if (expr.type === types.object) {
    return transformObject(expr);
  }

  if (expr.type === types.string) {
    return String(expr.getValue());
  }

  throw new Error('Parsing error!');
};

const transformArray = (parsed: Expression) => {
  return parsed.getValues().map((value) => {
    return getValue(value as Expression);
  });
};

const transformObject = (parsed: Expression) => {
  return groupEveryNElements(parsed.getValues(), 2).reduce((result, value) => {
    const [keyExpr, valueExpr] = value;

    if (
      keyExpr.type !== types.key ||
      ![types.array, types.object, types.string, types.value].includes(valueExpr.type)
    ) {
      throw new Error(`Parsing error for ${keyExpr.getValue()} and ${valueExpr.getValue()}`);
    }

    const key = keyExpr.getValue();
    const val = getValue(valueExpr as Expression);

    return {
      ...result,
      [key]: val,
    };
  }, {});
};

const parse = (input: string) => {
  const tokens = tokenize(input);

  const parsedStrings = parseStringsToExpressions(tokens);
  const objectsStructure = parseObjectsAndArrays(parsedStrings);
  const parsed = parseKeysAndValues(objectsStructure);

  if (parsed.length > 1) {
    throw new Error('Invalid syntax');
  }

  const parsedObj = parsed[0];

  const result = getValue(parsedObj);

  return result;
};

const isObject = (obj: any) => obj !== null && (typeof obj === 'object' && !Array.isArray(obj));

const stringifyValue = (value: any) => {
  if (isObject(value)) {
    return stringify(value);
  }

  if (Array.isArray(value)) {
    return stringifyArray(value);
  }

  if (typeof value === 'undefined' || typeof value === 'function') {
    return undefined;
  }

  if (typeof value === 'string') {
    return `"${value}"`;
  }

  return String(value);
};

const stringifyArray = (collection: any[]) => {
  const values = collection.map(stringifyValue).filter(Boolean);

  return `[${values}]`;
};

const stringify = (object: object) => {
  const values = Object.keys(object)
    .map((key) => {
      const value = stringifyValue(object[key]);

      if (!value) {
        return null;
      }

      return `"${key}":${value}`;
    })
    .filter(Boolean);

  return `{${values}}`;
};

export { parse, stringify };
