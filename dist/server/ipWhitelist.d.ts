/**
 * Check if an IP address is whitelisted
 */
export declare function isIpWhitelisted(clientIp: string): Promise<boolean>;
/**
 * Get client IP address from request
 */
export declare function getClientIp(req: any): string;
/**
 * Validate IP address or CIDR range
 */
export declare function validateIpOrCidr(input: string): {
    valid: boolean;
    type: 'single' | 'cidr' | null;
    error?: string;
};
/**
 * Check if an IP address is whitelisted for login
 */
export declare function isLoginIpWhitelisted(clientIp: string): Promise<boolean>;
//# sourceMappingURL=ipWhitelist.d.ts.map