import { Response } from 'express';

export function success(res: Response, data: unknown, statusCode = 200) {
  return res.status(statusCode).json(data);
}

export function created(res: Response, data: unknown) {
  return res.status(201).json(data);
}

export function paginated(
  res: Response,
  data: unknown[],
  total: number,
  page: number,
  limit: number,
) {
  return res.json({
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}
