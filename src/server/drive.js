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
exports.GoogleDriveService = void 0;
var googleapis_1 = require("googleapis");
var fs_1 = require("fs");
var path_1 = require("path");
var fs_2 = require("fs");
var GoogleDriveService = /** @class */ (function () {
    function GoogleDriveService(config) {
        var _a;
        this.oauth2Client = new googleapis_1.google.auth.OAuth2(config.clientId, config.clientSecret);
        // Trim and validate refresh token
        var refreshToken = (_a = config.refreshToken) === null || _a === void 0 ? void 0 : _a.trim();
        if (!refreshToken) {
            throw new Error('Refresh token is required');
        }
        console.log('Initializing Drive service with refresh token length:', refreshToken.length);
        this.oauth2Client.setCredentials({
            refresh_token: refreshToken,
        });
        this.drive = googleapis_1.google.drive({ version: 'v3', auth: this.oauth2Client });
    }
    /**
     * Get authenticated Drive client
     */
    GoogleDriveService.prototype.ensureAuth = function () {
        return __awaiter(this, void 0, void 0, function () {
            var token, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.oauth2Client.getAccessToken()];
                    case 1:
                        token = _a.sent();
                        if (!token.token) {
                            throw new Error('Failed to get access token');
                        }
                        console.log('Drive authentication successful');
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _a.sent();
                        console.error('Drive authentication error:', error_1.message, error_1.code);
                        if (error_1.code === 401 || error_1.message.includes('invalid_grant')) {
                            throw new Error('Invalid refresh token. Please regenerate it using the OAuth flow.');
                        }
                        throw new Error("Drive authentication failed: ".concat(error_1.message));
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * List files in Google Drive
     */
    GoogleDriveService.prototype.listFiles = function () {
        return __awaiter(this, arguments, void 0, function (options) {
            var folderId, _a, pageSize, customQuery, _b, fields, query, response, error_2;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, this.ensureAuth()];
                    case 1:
                        _c.sent();
                        folderId = options.folderId, _a = options.pageSize, pageSize = _a === void 0 ? 100 : _a, customQuery = options.query, _b = options.fields, fields = _b === void 0 ? 'files(id,name,mimeType,size,modifiedTime,parents,webViewLink)' : _b;
                        query = customQuery || '';
                        if (folderId) {
                            query = query
                                ? "".concat(query, " and '").concat(folderId, "' in parents")
                                : "'".concat(folderId, "' in parents");
                        }
                        // Always exclude trashed files
                        query = query
                            ? "".concat(query, " and trashed=false")
                            : 'trashed=false';
                        _c.label = 2;
                    case 2:
                        _c.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, this.drive.files.list({
                                q: query || undefined,
                                pageSize: pageSize,
                                fields: fields,
                                orderBy: 'modifiedTime desc',
                            })];
                    case 3:
                        response = _c.sent();
                        return [2 /*return*/, (response.data.files || [])];
                    case 4:
                        error_2 = _c.sent();
                        throw new Error("Failed to list Drive files: ".concat(error_2.message));
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get file metadata
     */
    GoogleDriveService.prototype.getFile = function (fileId) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ensureAuth()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, this.drive.files.get({
                                fileId: fileId,
                                fields: 'id,name,mimeType,size,modifiedTime,parents,webViewLink',
                            })];
                    case 3:
                        response = _a.sent();
                        if (!response.data) {
                            throw new Error("File not found or inaccessible: ".concat(fileId));
                        }
                        return [2 /*return*/, response.data];
                    case 4:
                        error_3 = _a.sent();
                        console.error('Get file error:', error_3.message, error_3.code);
                        if (error_3.code === 404) {
                            throw new Error("File not found: ".concat(fileId, ". Please check the file ID is correct."));
                        }
                        else if (error_3.code === 403) {
                            throw new Error("Access denied to file: ".concat(fileId, ". Please check file permissions."));
                        }
                        throw new Error("Failed to get file metadata: ".concat(error_3.message));
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Upload a file to Google Drive
     */
    GoogleDriveService.prototype.uploadFile = function (options) {
        return __awaiter(this, void 0, void 0, function () {
            var filePath, fileName, folderId, mimeType, onProgress, stats, fileSize, finalFileName, fileMetadata, media, response, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ensureAuth()];
                    case 1:
                        _a.sent();
                        filePath = options.filePath, fileName = options.fileName, folderId = options.folderId, mimeType = options.mimeType, onProgress = options.onProgress;
                        stats = (0, fs_2.statSync)(filePath);
                        fileSize = stats.size;
                        finalFileName = fileName || path_1.default.basename(filePath);
                        fileMetadata = {
                            name: finalFileName,
                        };
                        if (folderId) {
                            fileMetadata.parents = [folderId];
                        }
                        media = {
                            mimeType: mimeType || 'application/octet-stream',
                            body: (0, fs_2.createReadStream)(filePath),
                        };
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 7, , 8]);
                        if (!(fileSize > 5 * 1024 * 1024)) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.uploadLargeFile(fileMetadata, media, fileSize, onProgress)];
                    case 3: 
                    // Files larger than 5MB
                    return [2 /*return*/, _a.sent()];
                    case 4: return [4 /*yield*/, this.drive.files.create({
                            requestBody: fileMetadata,
                            media: media,
                            fields: 'id,name,mimeType,size,modifiedTime,parents,webViewLink',
                        })];
                    case 5:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                    case 6: return [3 /*break*/, 8];
                    case 7:
                        error_4 = _a.sent();
                        throw new Error("Failed to upload file: ".concat(error_4.message));
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Upload large files using resumable upload
     */
    GoogleDriveService.prototype.uploadLargeFile = function (fileMetadata, media, fileSize, onProgress) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.drive.files.create({
                            requestBody: fileMetadata,
                            media: media,
                            fields: 'id,name,mimeType,size,modifiedTime,parents,webViewLink',
                        })];
                    case 1:
                        response = _a.sent();
                        if (onProgress) {
                            onProgress(fileSize, fileSize);
                        }
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    /**
     * Upload a directory (recursively upload all files)
     */
    GoogleDriveService.prototype.uploadDirectory = function (options) {
        return __awaiter(this, void 0, void 0, function () {
            var dirPath, folderId, onProgress, uploadedFiles, files, totalFiles, dirName, driveFolder, i, file, relativePath, fileName, uploaded, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ensureAuth()];
                    case 1:
                        _a.sent();
                        dirPath = options.dirPath, folderId = options.folderId, onProgress = options.onProgress;
                        uploadedFiles = [];
                        return [4 /*yield*/, this.getAllFilesInDirectory(dirPath)];
                    case 2:
                        files = _a.sent();
                        totalFiles = files.length;
                        dirName = path_1.default.basename(dirPath);
                        return [4 /*yield*/, this.createFolder({
                                name: dirName,
                                parentId: folderId,
                            })];
                    case 3:
                        driveFolder = _a.sent();
                        uploadedFiles.push(driveFolder);
                        i = 0;
                        _a.label = 4;
                    case 4:
                        if (!(i < files.length)) return [3 /*break*/, 9];
                        file = files[i];
                        relativePath = path_1.default.relative(dirPath, file);
                        fileName = relativePath.replace(/\\/g, '/');
                        if (onProgress) {
                            onProgress(i + 1, totalFiles, fileName);
                        }
                        _a.label = 5;
                    case 5:
                        _a.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, this.uploadFile({
                                filePath: file,
                                fileName: fileName,
                                folderId: driveFolder.id,
                            })];
                    case 6:
                        uploaded = _a.sent();
                        uploadedFiles.push(uploaded);
                        return [3 /*break*/, 8];
                    case 7:
                        error_5 = _a.sent();
                        console.error("Failed to upload ".concat(fileName, ":"), error_5);
                        return [3 /*break*/, 8];
                    case 8:
                        i++;
                        return [3 /*break*/, 4];
                    case 9: return [2 /*return*/, uploadedFiles];
                }
            });
        });
    };
    /**
     * Get all files in a directory recursively
     */
    GoogleDriveService.prototype.getAllFilesInDirectory = function (dirPath) {
        return __awaiter(this, void 0, void 0, function () {
            var files, entries, _i, entries_1, entry, fullPath, subFiles;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        files = [];
                        return [4 /*yield*/, fs_1.promises.readdir(dirPath, { withFileTypes: true })];
                    case 1:
                        entries = _a.sent();
                        _i = 0, entries_1 = entries;
                        _a.label = 2;
                    case 2:
                        if (!(_i < entries_1.length)) return [3 /*break*/, 6];
                        entry = entries_1[_i];
                        fullPath = path_1.default.join(dirPath, entry.name);
                        if (!entry.isDirectory()) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.getAllFilesInDirectory(fullPath)];
                    case 3:
                        subFiles = _a.sent();
                        files.push.apply(files, subFiles);
                        return [3 /*break*/, 5];
                    case 4:
                        files.push(fullPath);
                        _a.label = 5;
                    case 5:
                        _i++;
                        return [3 /*break*/, 2];
                    case 6: return [2 /*return*/, files];
                }
            });
        });
    };
    /**
     * Create a folder in Google Drive
     */
    GoogleDriveService.prototype.createFolder = function (options) {
        return __awaiter(this, void 0, void 0, function () {
            var name, parentId, fileMetadata, response, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ensureAuth()];
                    case 1:
                        _a.sent();
                        name = options.name, parentId = options.parentId;
                        fileMetadata = {
                            name: name,
                            mimeType: 'application/vnd.google-apps.folder',
                        };
                        if (parentId) {
                            fileMetadata.parents = [parentId];
                        }
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, this.drive.files.create({
                                requestBody: fileMetadata,
                                fields: 'id,name,parents',
                            })];
                    case 3:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                    case 4:
                        error_6 = _a.sent();
                        throw new Error("Failed to create folder: ".concat(error_6.message));
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Find or create a folder by name
     */
    GoogleDriveService.prototype.findOrCreateFolder = function (options) {
        return __awaiter(this, void 0, void 0, function () {
            var name, parentId, query, response, error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ensureAuth()];
                    case 1:
                        _a.sent();
                        name = options.name, parentId = options.parentId;
                        query = "name='".concat(name.replace(/'/g, "\\'"), "' and mimeType='application/vnd.google-apps.folder' and trashed=false");
                        if (parentId) {
                            query += " and '".concat(parentId, "' in parents");
                        }
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, this.drive.files.list({
                                q: query,
                                fields: 'files(id,name,parents)',
                                pageSize: 1,
                            })];
                    case 3:
                        response = _a.sent();
                        if (response.data.files && response.data.files.length > 0) {
                            return [2 /*return*/, response.data.files[0]];
                        }
                        return [3 /*break*/, 5];
                    case 4:
                        error_7 = _a.sent();
                        return [3 /*break*/, 5];
                    case 5: return [4 /*yield*/, this.createFolder({ name: name, parentId: parentId })];
                    case 6: 
                    // Folder doesn't exist, create it
                    return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Download a file from Google Drive
     */
    GoogleDriveService.prototype.downloadFile = function (fileId, destinationPath) {
        return __awaiter(this, void 0, void 0, function () {
            var file, fileName, googleDocsMimeTypes, exportMimeType, isGoogleDoc, fileExtension, nameParts, finalFileName, finalPath, response_1, exportError_1, downloadError_1, apiError_1, writeStream_1, downloadedBytes_1, totalBytes_1, error_8, errorObj;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.ensureAuth()];
                    case 1:
                        _b.sent();
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 19, , 20]);
                        // Get file metadata to get the name
                        console.log('Getting file metadata for:', fileId);
                        return [4 /*yield*/, this.getFile(fileId)];
                    case 3:
                        file = _b.sent();
                        if (!file) {
                            throw new Error("File not found: ".concat(fileId));
                        }
                        fileName = file.name || "drive_file_".concat(fileId);
                        console.log('File metadata retrieved:', {
                            id: file.id,
                            name: fileName,
                            mimeType: file.mimeType,
                            size: file.size
                        });
                        googleDocsMimeTypes = {
                            'application/vnd.google-apps.document': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
                            'application/vnd.google-apps.spreadsheet': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
                            'application/vnd.google-apps.presentation': 'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
                            'application/vnd.google-apps.drawing': 'image/png', // .png
                            'application/vnd.google-apps.script': 'application/vnd.google-apps.script+json', // .json
                        };
                        exportMimeType = googleDocsMimeTypes[file.mimeType || ''];
                        isGoogleDoc = !!exportMimeType;
                        console.log('File type check:', {
                            mimeType: file.mimeType,
                            isGoogleDoc: isGoogleDoc,
                            exportMimeType: exportMimeType
                        });
                        fileExtension = '';
                        if (isGoogleDoc) {
                            if (file.mimeType === 'application/vnd.google-apps.document')
                                fileExtension = '.docx';
                            else if (file.mimeType === 'application/vnd.google-apps.spreadsheet')
                                fileExtension = '.xlsx';
                            else if (file.mimeType === 'application/vnd.google-apps.presentation')
                                fileExtension = '.pptx';
                            else if (file.mimeType === 'application/vnd.google-apps.drawing')
                                fileExtension = '.png';
                            else if (file.mimeType === 'application/vnd.google-apps.script')
                                fileExtension = '.json';
                        }
                        else {
                            nameParts = fileName.split('.');
                            if (nameParts.length > 1) {
                                fileExtension = '.' + nameParts[nameParts.length - 1];
                            }
                        }
                        finalFileName = fileName.endsWith(fileExtension) ? fileName : fileName + fileExtension;
                        finalPath = path_1.default.join(destinationPath, finalFileName);
                        // Ensure destination directory exists
                        return [4 /*yield*/, fs_1.promises.mkdir(destinationPath, { recursive: true })];
                    case 4:
                        // Ensure destination directory exists
                        _b.sent();
                        console.log('Starting download:', finalFileName, 'to', finalPath, isGoogleDoc ? '(exporting Google Doc)' : '');
                        _b.label = 5;
                    case 5:
                        _b.trys.push([5, 15, , 16]);
                        if (!isGoogleDoc) return [3 /*break*/, 10];
                        // For Google Docs, use the export endpoint
                        console.log('Exporting Google Doc to:', exportMimeType, 'for file:', fileId);
                        _b.label = 6;
                    case 6:
                        _b.trys.push([6, 8, , 9]);
                        return [4 /*yield*/, this.drive.files.export({
                                fileId: fileId,
                                mimeType: exportMimeType,
                            }, {
                                responseType: 'stream',
                                timeout: 600000,
                            })];
                    case 7:
                        response_1 = _b.sent();
                        console.log('Export request successful');
                        return [3 /*break*/, 9];
                    case 8:
                        exportError_1 = _b.sent();
                        console.error('Export failed:', exportError_1.message, exportError_1.code);
                        // If export fails, provide helpful error
                        throw new Error("Cannot export this Google Docs file (".concat(file.mimeType, "). You may need to download it manually from Google Drive (File \u2192 Download \u2192 Choose format) and then import the downloaded file. Error: ").concat(exportError_1.message));
                    case 9: return [3 /*break*/, 14];
                    case 10:
                        // For regular files, use the get endpoint with alt=media
                        console.log('Downloading regular file:', fileId);
                        _b.label = 11;
                    case 11:
                        _b.trys.push([11, 13, , 14]);
                        return [4 /*yield*/, this.drive.files.get({
                                fileId: fileId,
                                alt: 'media'
                            }, {
                                responseType: 'stream',
                                timeout: 600000 // 10 minutes timeout
                            })];
                    case 12:
                        response_1 = _b.sent();
                        console.log('Download request successful');
                        return [3 /*break*/, 14];
                    case 13:
                        downloadError_1 = _b.sent();
                        console.error('Download failed:', downloadError_1.message, downloadError_1.code);
                        // If download fails with "binary content" error, it might be a Google Doc we didn't detect
                        if (downloadError_1.message && downloadError_1.message.includes('binary content')) {
                            throw new Error('This file cannot be downloaded directly. It may be a Google Docs file. Please download it manually from Google Drive (File → Download) and import the downloaded file, or select a binary file (like .zip, .tar.gz, .sql.gz, etc.).');
                        }
                        throw downloadError_1;
                    case 14: return [3 /*break*/, 16];
                    case 15:
                        apiError_1 = _b.sent();
                        console.error('API call error:', apiError_1.message, apiError_1.code);
                        // Re-throw with better message if it's already been handled
                        if (apiError_1.message && apiError_1.message.includes('Cannot export') || apiError_1.message.includes('cannot be downloaded')) {
                            throw apiError_1;
                        }
                        // Otherwise, provide generic error
                        throw new Error("Failed to access file: ".concat(apiError_1.message || 'Unknown error'));
                    case 16: return [4 /*yield*/, Promise.resolve().then(function () { return require('fs'); })];
                    case 17:
                        writeStream_1 = (_b.sent()).createWriteStream(finalPath);
                        downloadedBytes_1 = 0;
                        totalBytes_1 = file.size ? parseInt(file.size) : undefined;
                        if (totalBytes_1) {
                            console.log('File size:', formatBytes(totalBytes_1));
                        }
                        return [4 /*yield*/, new Promise(function (resolve, reject) {
                                var timeout = setTimeout(function () {
                                    writeStream_1.destroy();
                                    reject(new Error('Download timeout - file is too large or connection is slow'));
                                }, 600000); // 10 minute timeout
                                // Handle both export and download responses
                                var stream = response_1.data || response_1;
                                if (!stream) {
                                    clearTimeout(timeout);
                                    reject(new Error('No response stream received'));
                                    return;
                                }
                                stream
                                    .on('data', function (chunk) {
                                    downloadedBytes_1 += chunk.length;
                                    if (totalBytes_1 && downloadedBytes_1 % (10 * 1024 * 1024) === 0) { // Log every 10MB
                                        var percent = ((downloadedBytes_1 / totalBytes_1) * 100).toFixed(1);
                                        console.log("Download progress: ".concat(percent, "% (").concat(formatBytes(downloadedBytes_1), " / ").concat(formatBytes(totalBytes_1), ")"));
                                    }
                                })
                                    .on('error', function (err) {
                                    clearTimeout(timeout);
                                    console.error('Stream error:', err.message);
                                    reject(err);
                                })
                                    .pipe(writeStream_1)
                                    .on('finish', function () {
                                    clearTimeout(timeout);
                                    console.log('Download completed:', formatBytes(downloadedBytes_1));
                                    resolve();
                                })
                                    .on('error', function (err) {
                                    clearTimeout(timeout);
                                    console.error('Write stream error:', err.message);
                                    reject(err);
                                });
                            })];
                    case 18:
                        _b.sent();
                        return [2 /*return*/, finalPath];
                    case 19:
                        error_8 = _b.sent();
                        console.error('Download error:', {
                            message: error_8.message,
                            code: error_8.code,
                            stack: error_8.stack,
                            response: (_a = error_8.response) === null || _a === void 0 ? void 0 : _a.data
                        });
                        // Check for specific Google Docs error from API
                        if (error_8.message && (error_8.message.includes('Only files with binary content can be downloaded') ||
                            error_8.message.includes('fileNotDownloadable'))) {
                            // This means we tried to download a Google Doc directly
                            // This shouldn't happen if detection worked, but provide helpful message
                            throw new Error('This is a Google Docs/Sheets/Slides file. These files need to be exported first. Please download the file manually from Google Drive (File → Download) and then import the downloaded file, or select a binary file (like .zip, .tar.gz, .sql.gz, etc.).');
                        }
                        // Parse error response if it's a JSON string
                        if (error_8.message && typeof error_8.message === 'string' && error_8.message.includes('"code"')) {
                            try {
                                errorObj = JSON.parse(error_8.message);
                                if (errorObj.error) {
                                    if (errorObj.error.code === 403 && errorObj.error.reason === 'fileNotDownloadable') {
                                        throw new Error('This file type cannot be downloaded directly. It is a Google Docs file. Please download it manually from Google Drive (File → Download) and import the downloaded file, or select a binary file (like .zip, .tar.gz, .sql.gz, etc.).');
                                    }
                                    throw new Error(errorObj.error.message || 'Download failed');
                                }
                            }
                            catch (parseError) {
                                // If parsing fails, use original error
                                console.error('Error parsing error message:', parseError);
                            }
                        }
                        // Check if it's an export error
                        if (error_8.code === 403 || (error_8.message && error_8.message.includes('export'))) {
                            throw new Error("Failed to export Google Docs file: ".concat(error_8.message, ". Please try downloading the file manually from Google Drive (File \u2192 Download) first, then import the downloaded file."));
                        }
                        throw new Error("Failed to download file: ".concat(error_8.message || 'Unknown error'));
                    case 20: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Download an entire folder from Google Drive (recursively)
     */
    GoogleDriveService.prototype.downloadFolder = function (folderId, destinationPath) {
        return __awaiter(this, void 0, void 0, function () {
            var folder, folderName, finalFolderPath, files, _i, files_1, item, itemError_1, error_9;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ensureAuth()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 15, , 16]);
                        // Get folder metadata
                        console.log('Getting folder metadata for:', folderId);
                        return [4 /*yield*/, this.getFile(folderId)];
                    case 3:
                        folder = _a.sent();
                        if (!folder) {
                            throw new Error("Folder not found: ".concat(folderId));
                        }
                        if (folder.mimeType !== 'application/vnd.google-apps.folder') {
                            throw new Error("Not a folder: ".concat(folderId));
                        }
                        folderName = folder.name || "drive_folder_".concat(folderId);
                        finalFolderPath = path_1.default.join(destinationPath, folderName);
                        // Create the folder
                        return [4 /*yield*/, fs_1.promises.mkdir(finalFolderPath, { recursive: true })];
                    case 4:
                        // Create the folder
                        _a.sent();
                        console.log('Created folder:', finalFolderPath);
                        return [4 /*yield*/, this.listFiles({ folderId: folderId })];
                    case 5:
                        files = _a.sent();
                        console.log("Found ".concat(files.length, " items in folder"));
                        _i = 0, files_1 = files;
                        _a.label = 6;
                    case 6:
                        if (!(_i < files_1.length)) return [3 /*break*/, 14];
                        item = files_1[_i];
                        _a.label = 7;
                    case 7:
                        _a.trys.push([7, 12, , 13]);
                        if (!(item.mimeType === 'application/vnd.google-apps.folder')) return [3 /*break*/, 9];
                        // Recursively download subfolder
                        console.log('Downloading subfolder:', item.name);
                        return [4 /*yield*/, this.downloadFolder(item.id, finalFolderPath)];
                    case 8:
                        _a.sent();
                        return [3 /*break*/, 11];
                    case 9:
                        // Download file
                        console.log('Downloading file:', item.name);
                        return [4 /*yield*/, this.downloadFile(item.id, finalFolderPath)];
                    case 10:
                        _a.sent();
                        _a.label = 11;
                    case 11: return [3 /*break*/, 13];
                    case 12:
                        itemError_1 = _a.sent();
                        console.error("Failed to download ".concat(item.name, ":"), itemError_1.message);
                        return [3 /*break*/, 13];
                    case 13:
                        _i++;
                        return [3 /*break*/, 6];
                    case 14: return [2 /*return*/, finalFolderPath];
                    case 15:
                        error_9 = _a.sent();
                        console.error('Folder download error:', error_9.message);
                        throw new Error("Failed to download folder: ".concat(error_9.message || 'Unknown error'));
                    case 16: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Delete a file from Google Drive
     */
    GoogleDriveService.prototype.deleteFile = function (fileId) {
        return __awaiter(this, void 0, void 0, function () {
            var error_10;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ensureAuth()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, this.drive.files.delete({ fileId: fileId })];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        error_10 = _a.sent();
                        throw new Error("Failed to delete file: ".concat(error_10.message));
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get folder structure (list folders)
     */
    GoogleDriveService.prototype.listFolders = function (parentId) {
        return __awaiter(this, void 0, void 0, function () {
            var query, response, error_11;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ensureAuth()];
                    case 1:
                        _a.sent();
                        query = "mimeType='application/vnd.google-apps.folder' and trashed=false";
                        if (parentId) {
                            query += " and '".concat(parentId, "' in parents");
                        }
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, this.drive.files.list({
                                q: query,
                                fields: 'files(id,name,parents)',
                                orderBy: 'name',
                            })];
                    case 3:
                        response = _a.sent();
                        return [2 /*return*/, (response.data.files || [])];
                    case 4:
                        error_11 = _a.sent();
                        throw new Error("Failed to list folders: ".concat(error_11.message));
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get root folder ID (My Drive)
     */
    GoogleDriveService.prototype.getRootFolder = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // The root folder ID is always 'root' in Google Drive
                return [2 /*return*/, {
                        id: 'root',
                        name: 'My Drive',
                    }];
            });
        });
    };
    /**
     * Check if Drive is properly configured and accessible
     */
    GoogleDriveService.prototype.testConnection = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_12;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.ensureAuth()];
                    case 1:
                        _a.sent();
                        // Try to list root folder to verify access
                        return [4 /*yield*/, this.drive.files.list({
                                pageSize: 1,
                                q: "trashed=false",
                            })];
                    case 2:
                        // Try to list root folder to verify access
                        _a.sent();
                        return [2 /*return*/, true];
                    case 3:
                        error_12 = _a.sent();
                        console.error('Drive testConnection error:', error_12.message, error_12.code);
                        throw new Error("Drive connection test failed: ".concat(error_12.message || 'Unknown error'));
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return GoogleDriveService;
}());
exports.GoogleDriveService = GoogleDriveService;
function formatBytes(bytes) {
    if (bytes === 0)
        return '0 B';
    var k = 1024;
    var sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
