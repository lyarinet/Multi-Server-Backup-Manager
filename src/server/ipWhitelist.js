"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isIpWhitelisted = isIpWhitelisted;
exports.getClientIp = getClientIp;
exports.validateIpOrCidr = validateIpOrCidr;
exports.isLoginIpWhitelisted = isLoginIpWhitelisted;
var db_1 = require("./db");
var schema_1 = require("./db/schema");
/**
 * Check if an IP address matches a CIDR range
 */
function ipMatchesCidr(ip, cidr) {
    try {
        var _a = cidr.split('/'), rangeIp = _a[0], prefixLength = _a[1];
        var prefix = parseInt(prefixLength, 10);
        if (isNaN(prefix) || prefix < 0 || prefix > 32) {
            return false;
        }
        var ipToNumber = function (ip) {
            return ip.split('.').reduce(function (acc, octet) { return (acc << 8) + parseInt(octet, 10); }, 0) >>> 0;
        };
        var rangeNum = ipToNumber(rangeIp);
        var ipNum = ipToNumber(ip);
        var mask = (0xFFFFFFFF << (32 - prefix)) >>> 0;
        return (ipNum & mask) === (rangeNum & mask);
    }
    catch (e) {
        return false;
    }
}
/**
 * Check if an IP address is whitelisted
 */
function isIpWhitelisted(clientIp) {
    return __awaiter(this, void 0, void 0, function () {
        var settingsRows, config, entries, _i, entries_1, entry, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, db_1.db.select().from(schema_1.settings).limit(1)];
                case 1:
                    settingsRows = _a.sent();
                    config = settingsRows[0];
                    if (!(config === null || config === void 0 ? void 0 : config.ipWhitelistEnabled)) {
                        return [2 /*return*/, true]; // If whitelist is disabled, allow all IPs
                    }
                    return [4 /*yield*/, db_1.db.select().from(schema_1.ipWhitelist).all()];
                case 2:
                    entries = _a.sent();
                    for (_i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
                        entry = entries_1[_i];
                        if (entry.type === 'single') {
                            if (entry.ipAddress === clientIp) {
                                return [2 /*return*/, true];
                            }
                        }
                        else if (entry.type === 'cidr') {
                            if (ipMatchesCidr(clientIp, entry.ipAddress)) {
                                return [2 /*return*/, true];
                            }
                        }
                    }
                    return [2 /*return*/, false];
                case 3:
                    e_1 = _a.sent();
                    console.error('IP whitelist check error:', e_1.message);
                    return [2 /*return*/, true]; // On error, allow access (fail open)
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Get client IP address from request
 */
function getClientIp(req) {
    var _a;
    // Check various headers for the real IP (when behind proxy/load balancer)
    var forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        var ips = forwarded.split(',');
        return ips[0].trim();
    }
    var realIp = req.headers['x-real-ip'];
    if (realIp) {
        return realIp;
    }
    return req.ip || ((_a = req.connection) === null || _a === void 0 ? void 0 : _a.remoteAddress) || '127.0.0.1';
}
/**
 * Validate IP address or CIDR range
 */
function validateIpOrCidr(input) {
    // CIDR pattern: IP/prefix (e.g., 192.168.1.0/24)
    var cidrPattern = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    // Single IP pattern
    var ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (cidrPattern.test(input)) {
        var _a = input.split('/'), ip = _a[0], prefix = _a[1];
        var prefixNum = parseInt(prefix, 10);
        if (prefixNum < 0 || prefixNum > 32) {
            return { valid: false, type: null, error: 'CIDR prefix must be between 0 and 32' };
        }
        // Validate IP part
        var octets = ip.split('.');
        for (var _i = 0, octets_1 = octets; _i < octets_1.length; _i++) {
            var octet = octets_1[_i];
            var num = parseInt(octet, 10);
            if (isNaN(num) || num < 0 || num > 255) {
                return { valid: false, type: null, error: 'Invalid IP address in CIDR range' };
            }
        }
        return { valid: true, type: 'cidr' };
    }
    else if (ipPattern.test(input)) {
        // Validate each octet
        var octets = input.split('.');
        for (var _b = 0, octets_2 = octets; _b < octets_2.length; _b++) {
            var octet = octets_2[_b];
            var num = parseInt(octet, 10);
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
function isLoginIpWhitelisted(clientIp) {
    return __awaiter(this, void 0, void 0, function () {
        var settingsRows, config, entries, _i, entries_2, entry, e_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, db_1.db.select().from(schema_1.settings).limit(1)];
                case 1:
                    settingsRows = _a.sent();
                    config = settingsRows[0];
                    if (!(config === null || config === void 0 ? void 0 : config.loginIpWhitelistEnabled)) {
                        return [2 /*return*/, true]; // If whitelist is disabled, allow all IPs
                    }
                    return [4 /*yield*/, db_1.db.select().from(schema_1.loginIpWhitelist).all()];
                case 2:
                    entries = _a.sent();
                    for (_i = 0, entries_2 = entries; _i < entries_2.length; _i++) {
                        entry = entries_2[_i];
                        if (entry.type === 'single') {
                            if (entry.ipAddress === clientIp) {
                                return [2 /*return*/, true];
                            }
                        }
                        else if (entry.type === 'cidr') {
                            if (ipMatchesCidr(clientIp, entry.ipAddress)) {
                                return [2 /*return*/, true];
                            }
                        }
                    }
                    return [2 /*return*/, false];
                case 3:
                    e_2 = _a.sent();
                    console.error('Login IP whitelist check error:', e_2.message);
                    return [2 /*return*/, true]; // On error, allow access (fail open)
                case 4: return [2 /*return*/];
            }
        });
    });
}
