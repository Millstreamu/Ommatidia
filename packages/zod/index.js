class ZodError extends Error {
  constructor(issues) {
    super('Validation failed');
    this.issues = issues;
  }
}

class Schema {
  constructor(parser) {
    this._parser = parser;
  }

  parse(value) {
    const result = this.safeParse(value);
    if (!result.success) {
      throw new ZodError(result.error.issues);
    }
    return result.data;
  }

  safeParse(value) {
    try {
      return { success: true, data: this._parser(value) };
    } catch (error) {
      const issues = error?.issues ?? [{ message: error instanceof Error ? error.message : 'Invalid value' }];
      return { success: false, error: { issues } };
    }
  }

  optional() {
    return new Schema((value) => (value === undefined ? undefined : this._parser(value)));
  }
}

const createError = (message) => {
  const err = new Error(message);
  err.issues = [{ message }];
  return err;
};

const z = {
  string: () => new Schema((value) => {
    if (typeof value !== 'string') throw createError('Expected string');
    return value;
  }),
  number: () => new Schema((value) => {
    if (typeof value !== 'number' || Number.isNaN(value)) throw createError('Expected number');
    return value;
  }),
  boolean: () => new Schema((value) => {
    if (typeof value !== 'boolean') throw createError('Expected boolean');
    return value;
  }),
  any: () => new Schema((value) => value),
  unknown: () => new Schema((value) => value),
  literal: (expected) => new Schema((value) => {
    if (value !== expected) throw createError('Expected literal value');
    return value;
  }),
  enum: (values) => new Schema((value) => {
    if (typeof value !== 'string' || !values.includes(value)) throw createError('Expected enum value');
    return value;
  }),
  union: (schemas) => new Schema((value) => {
    for (const schema of schemas) {
      const result = schema.safeParse(value);
      if (result.success) return result.data;
    }
    throw createError('Expected union value');
  }),
  array: (schema) => new Schema((value) => {
    if (!Array.isArray(value)) throw createError('Expected array');
    return value.map((item) => schema.parse(item));
  }),
  record: (valueSchema) => new Schema((value) => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) throw createError('Expected object record');
    const parsed = {};
    for (const [key, item] of Object.entries(value)) {
      parsed[key] = valueSchema.parse(item);
    }
    return parsed;
  }),
  object: (shape) => new Schema((value) => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) throw createError('Expected object');
    const parsed = {};
    for (const key of Object.keys(shape)) {
      const schema = shape[key];
      const item = value[key];
      const result = schema.safeParse(item);
      if (!result.success) {
        throw createError(`Invalid field: ${key}`);
      }
      if (result.data !== undefined) parsed[key] = result.data;
    }
    return parsed;
  })
};

export { ZodError, z };
