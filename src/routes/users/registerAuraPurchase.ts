import type { RequestHandler } from 'express';

import registerAuraPurchase from '../../utils/aura/registerAuraPurchase';
import registerAuraPurchaseBodySchema from '../../validation/user/auraPurchase';
import { publicUsernameParamsSchema } from '../../validation/user/updateProfile';

const registerAuraPurchaseRoute: RequestHandler = async (req, res) => {
  if (!req.auth) {
    return res.status(401).j({
      status: 'error',
      message: 'Authentication is required',
      result: { code: 'UNAUTHORIZED' },
    });
  }

  const params = publicUsernameParamsSchema.safeParse(req.params);

  const body = registerAuraPurchaseBodySchema.safeParse(req.body);
  if (!params.success || !body.success) {
    return res.status(400).j({
      status: 'error',
      message: 'Invalid Aura purchase registration',
      result: { code: 'VALIDATION_ERROR' },
    });
  }

  const result = await registerAuraPurchase(req.auth.userId, params.data.username, body.data);
  if (!result.ok) {
    const notFound = result.reason === 'subject_not_found';

    const unavailable = result.reason === 'buyer_unavailable';
    return res.status(notFound ? 404 : unavailable ? 401 : 409).j({
      status: 'error',
      message: 'Aura purchase registration could not be accepted',
      result: { code: result.reason.toUpperCase() },
    });
  }

  if (result.purchase.status === 'failed') {
    return res.status(409).j({
      status: 'error',
      message: 'Aura purchase did not match the registered on-chain purchase',
      result: { code: 'AURA_PURCHASE_REJECTED' },
    });
  }

  const confirmed = result.purchase.status === 'confirmed';
  return res.status(confirmed ? (result.created ? 201 : 200) : 202).j({
    status: 'success',
    message: confirmed ? 'Aura purchase confirmed' : 'Aura purchase queued for confirmation',
    result: {
      purchase: {
        ...result.purchase,
        confirmedAt: result.purchase.confirmedAt?.toISOString() ?? null,
      },
      conversation: result.conversation,
    },
  });
};

export default registerAuraPurchaseRoute;
