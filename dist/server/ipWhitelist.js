import { db } from './db/index.js';
import { ipWhitelist, loginIpWhitelist, settings } from './db/schema.js';
/**
 * Check if an IP address matches a CIDR range
 */
function ipMatchesCidr(ip, cidr) {
    try {
        const [rangeIp, prefixLength] = cidr.split('/');
        const prefix = parseInt(prefixLength, 10);
        if (isNaN(prefix) || prefix < 0 || prefix > 32) {
            return false;
        }
        const ipToNumber = (ip) => {
            return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
        };
        const rangeNum = ipToNumber(rangeIp);
        const ipNum = ipToNumber(ip);
        const mask = (0xFFFFFFFF << (32 - prefix)) >>> 0;
        return (ipNum & mask) === (rangeNum & mask);
    }
    catch (e) {
        return false;
    }
}
/**
 * Check if an IP address is whitelisted
 */
export async function isIpWhitelisted(clientIp) {
    try {
        // Check if IP whitelist is enabled
        const settingsRows = await db.select().from(settings).limit(1);
        const config = settingsRows[0];
        if (!config?.ipWhitelistEnabled) {
            return true; // If whitelist is disabled, allow all IPs
        }
        // Get all whitelist entries
        const entries = await db.select().from(ipWhitelist).all();
        for (const entry of entries) {
            if (entry.type === 'single') {
                if (entry.ipAddress === clientIp) {
                    return true;
                }
            }
            else if (entry.type === 'cidr') {
                if (ipMatchesCidr(clientIp, entry.ipAddress)) {
                    return true;
                }
            }
        }
        return false;
    }
    catch (e) {
        console.error('IP whitelist check error:', e.message);
        return true; // On error, allow access (fail open)
    }
}
/**
 * Get client IP address from request
 */
export function getClientIp(req) {
    // Check various headers for the real IP (when behind proxy/load balancer)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        const ips = forwarded.split(',');
        return ips[0].trim();
    }
    const realIp = req.headers['x-real-ip'];
    if (realIp) {
        return realIp;
    }
    return req.ip || req.connection?.remoteAddress || '127.0.0.1';
}
/**
 * Validate IP address or CIDR range
 */
export function validateIpOrCidr(input) {
    // CIDR pattern: IP/prefix (e.g., 192.168.1.0/24)
    const cidrPattern = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    // Single IP pattern
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (cidrPattern.test(input)) {
        const [ip, prefix] = input.split('/');
        const prefixNum = parseInt(prefix, 10);
        if (prefixNum < 0 || prefixNum > 32) {
            return { valid: false, type: null, error: 'CIDR prefix must be between 0 and 32' };
        }
        // Validate IP part
        const octets = ip.split('.');
        for (const octet of octets) {
            const num = parseInt(octet, 10);
            if (isNaN(num) || num < 0 || num > 255) {
                return { valid: false, type: null, error: 'Invalid IP address in CIDR range' };
            }
        }
        return { valid: true, type: 'cidr' };
    }
    else if (ipPattern.test(input)) {
        // Validate each octet
        const octets = input.split('.');
        for (const octet of octets) {
            const num = parseInt(octet, 10);
            if (isNaN(num) || num < 0 || num > 255) {
                return { valid: false, type: null, error: 'Invalid IP address' };
            }
        }
        return { valid: true, type: 'single' };
    }
    return { valid: false, type: null, error: 'Invalid format. Use IP address (e.g., 192.168.1.1) or CIDR range (e.g., 192.168.1.0/24)' };
}
/**
 * Check if an IP address is whitelisted for login
 */
export async function isLoginIpWhitelisted(clientIp) {
    try {
        // Check if login IP whitelist is enabled
        const settingsRows = await db.select().from(settings).limit(1);
        const config = settingsRows[0];
        if (!config?.loginIpWhitelistEnabled) {
            return true; // If whitelist is disabled, allow all IPs
        }
        // Get all login whitelist entries
        const entries = await db.select().from(loginIpWhitelist).all();
        for (const entry of entries) {
            if (entry.type === 'single') {
                if (entry.ipAddress === clientIp) {
                    return true;
                }
            }
            else if (entry.type === 'cidr') {
                if (ipMatchesCidr(clientIp, entry.ipAddress)) {
                    return true;
                }
            }
        }
        return false;
    }
    catch (e) {
        console.error('Login IP whitelist check error:', e.message);
        return true; // On error, allow access (fail open)
    }
}
//# sourceMappingURL=ipWhitelist.js.map