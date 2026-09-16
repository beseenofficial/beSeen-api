import type { RequestHandler } from 'express';
import getEarningTransactions from '../../utils/earning/getEarningTransactions';
import earningsQuerySchema from '../../validation/user/earnings';

const getEarningsRoute: RequestHandler = async (req, res) => {
  if (!req.auth) {
    return res.status(401).j({
      status: 'error',
      message: 'Authentication is required',
      result: { code: 'UNAUTHORIZED' },
    });
  }

  const parsed = earningsQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).j({
      status: 'error',
      message: 'Invalid earnings request',
      result: {
        code: 'VALIDATION_ERROR',
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
  }

  const earnings = await getEarningTransactions(req.auth.userId, parsed.data);

  return res.status(200).j({
    status: 'success',
    message: 'Earning transactions retrieved',
    result: {
      earnings: {
        ...earnings,
        items: earnings.items.map((item) => ({
          ...item,
          earnedAt: item.earnedAt.toISOString(),
        })),
      },
    },
  });
};

export default getEarningsRoute;
