import { prisma } from '@traza/database';
import type { Request } from 'express';

export enum AuditEventType {
  // Document events
  DOCUMENT_CREATED = 'document.created',
  DOCUMENT_SENT = 'document.sent',
  DOCUMENT_VIEWED = 'document.viewed',
  DOCUMENT_SIGNED = 'document.signed',
  DOCUMENT_DECLINED = 'document.declined',
  DOCUMENT_COMPLETED = 'document.completed',
  DOCUMENT_VOIDED = 'document.voided',
  DOCUMENT_DELETED = 'document.deleted',

  // Signature events
  SIGNATURE_SUBMITTED = 'signature.submitted',
  SIGNATURE_DECLINED = 'signature.declined',
  SIGNATURE_DELEGATED = 'signature.delegated',
  SIGNATURE_REMINDED = 'signature.reminded',
  SIGNATURE_ACCESS_CODE_VERIFIED = 'signature.access_code_verified',
  SIGNATURE_ACCESS_CODE_FAILED = 'signature.access_code_failed',

  // Field events
  FIELD_FILLED = 'field.filled',

  // Organization events
  ORG_CREATED = 'org.created',
  ORG_MEMBER_ADDED = 'org.member_added',
  ORG_MEMBER_REMOVED = 'org.member_removed',
  ORG_SETTINGS_UPDATED = 'org.settings_updated',

  // Admin events
  ADMIN_IMPERSONATION_STARTED = 'admin.impersonation_started',
  ADMIN_IMPERSONATION_ENDED = 'admin.impersonation_ended',
}

interface AuditLogOptions {
  documentId?: string;
  organizationId?: string;
  actorId?: string;
  eventType: AuditEventType | string;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  req?: Request;
}

/**
 * Creates an audit log entry for tracking important events
 */
export async function createAuditLog(options: AuditLogOptions) {
  const {
    documentId,
    organizationId,
    actorId,
    eventType,
    resourceType,
    resourceId,
    ipAddress,
    userAgent,
    metadata = {},
    req,
  } = options;

  // Extract IP and user agent from request if provided
  const finalIpAddress = ipAddress || (req ? extractIpAddress(req) : undefined);
  const finalUserAgent = userAgent || req?.headers['user-agent'];

  return prisma.auditLog.create({
    data: {
      documentId,
      organizationId,
      actorId,
      eventType,
      resourceType,
      resourceId,
      ipAddress: finalIpAddress,
      userAgent: finalUserAgent,
      metadata,
    },
  });
}

/**
 * Extracts IP address from request, checking for proxies
 */
function extractIpAddress(req: Request): string | undefined {
  // Check X-Forwarded-For header (common with proxies/load balancers)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // Take the first IP if multiple are present
    return typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : forwarded[0];
  }

  // Check X-Real-IP header (used by some proxies)
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return typeof realIp === 'string' ? realIp : realIp[0];
  }

  // Fallback to direct connection IP
  return req.ip || req.socket.remoteAddress;
}

/**
 * Get audit logs for a document
 */
export async function getDocumentAuditLogs(documentId: string, limit = 100) {
  return prisma.auditLog.findMany({
    where: { documentId },
    orderBy: { timestamp: 'desc' },
    take: limit,
    include: {
      actor: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });
}

/**
 * Get audit logs for an organization
 */
export async function getOrganizationAuditLogs(
  organizationId: string,
  options: {
    limit?: number;
    offset?: number;
    eventType?: string;
    actorId?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}
) {
  const { limit = 100, offset = 0, eventType, actorId, startDate, endDate } = options;

  const where: {
    organizationId: string;
    eventType?: string;
    actorId?: string;
    timestamp?: { gte?: Date; lte?: Date };
  } = { organizationId };

  if (eventType) where.eventType = eventType;
  if (actorId) where.actorId = actorId;
  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) where.timestamp.gte = startDate;
    if (endDate) where.timestamp.lte = endDate;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total };
}

/**
 * Get audit event statistics
 */
export async function getAuditStatistics(organizationId: string, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const logs = await prisma.auditLog.findMany({
    where: {
      organizationId,
      timestamp: { gte: startDate },
    },
    select: {
      eventType: true,
      timestamp: true,
    },
  });

  // Group by event type
  const eventCounts = logs.reduce(
    (acc, log) => {
      acc[log.eventType] = (acc[log.eventType] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Group by day
  const dailyCounts = logs.reduce(
    (acc, log) => {
      const date = log.timestamp.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return {
    eventCounts,
    dailyCounts,
    totalEvents: logs.length,
  };
}
