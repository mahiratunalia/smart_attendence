import AuditLog from '../models/AuditLog.js';

export async function logAudit({ req, action, entityType, entityId, meta = {} }) {
  try {
    const actorId = req?.user?._id || req?.user?.id;
    const actorRole = req?.user?.role;

    await AuditLog.create({
      actorId: actorId || undefined,
      actorRole,
      action,
      entityType,
      entityId: entityId ? String(entityId) : undefined,
      meta,
      ipAddress: req?.ip,
    });
  } catch (err) {
    // Audit logging should never break the main request
    console.error('Audit log failed:', err?.message || err);
  }
}
