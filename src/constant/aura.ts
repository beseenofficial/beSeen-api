const AURA_TOKEN_STATUSES = ['pending', 'confirmed', 'failed'] as const;
const AURA_CONFIRMATION_SOURCES = ['event', 'reconciliation'] as const;

export { AURA_CONFIRMATION_SOURCES, AURA_TOKEN_STATUSES };
