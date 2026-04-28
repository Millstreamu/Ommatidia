export type SafeParseSuccess<T> = { success: true; data: T };
export type SafeParseFailure = { success: false; error: { issues: Array<{ message: string }> } };

export interface Schema<T> {
  parse(value: unknown): T;
  safeParse(value: unknown): SafeParseSuccess<T> | SafeParseFailure;
  optional(): Schema<T | undefined>;
}

export class ZodError extends Error {
  issues: Array<{ message: string }>;
}

export interface ZodType<T> extends Schema<T> {}

export const z: {
  string(): Schema<string>;
  number(): Schema<number>;
  boolean(): Schema<boolean>;
  any(): Schema<any>;
  unknown(): Schema<unknown>;
  literal<T extends string | number | boolean>(value: T): Schema<T>;
  enum<const T extends [string, ...string[]] | readonly [string, ...string[]]>(values: T): Schema<T[number]>;
  union<T extends readonly Schema<any>[]>(schemas: T): Schema<T[number] extends Schema<infer U> ? U : never>;
  array<T>(schema: Schema<T>): Schema<T[]>;
  record<T>(schema: Schema<T>): Schema<Record<string, T>>;
  object<T extends Record<string, Schema<any>>>(shape: T): Schema<{ [K in keyof T]: T[K] extends Schema<infer U> ? U : never }>;
};

export type infer<T extends Schema<any>> = T extends Schema<infer U> ? U : never;
