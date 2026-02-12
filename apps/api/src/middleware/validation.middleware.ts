import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(
        Object.assign(new Error('Validation failed'), {
          name: 'ZodError',
          issues: result.error.issues,
        }),
      );
    }
    req[source] = result.data;
    next();
  };
}
