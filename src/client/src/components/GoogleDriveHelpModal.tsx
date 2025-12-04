import React from 'react';
import { Button } from './ui/button';
import { X, ExternalLink, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface GoogleDriveHelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function GoogleDriveHelpModal({ isOpen, onClose }: GoogleDriveHelpModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-10">
            <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-4xl mx-4 my-auto max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-card border-b border-border flex items-center justify-between p-6">
                    <h2 className="text-2xl font-semibold">Google Drive Setup Guide</h2>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Quick Overview */}
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-semibold mb-2">Quick Overview</h3>
                                <p className="text-sm text-muted-foreground">
                                    This guide will help you set up Google Drive API access in about 5-10 minutes. 
                                    You'll need to create a Google Cloud Project, enable the Drive API, and get OAuth credentials.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Step 1 */}
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">1</span>
                            Create Google Cloud Project
                        </h3>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground ml-10">
                            <li>Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline inline-flex items-center gap-1">Google Cloud Console <ExternalLink className="w-3 h-3" /></a></li>
                            <li>Click on the project dropdown at the top</li>
                            <li>Click <strong>"New Project"</strong></li>
                            <li>Enter a project name (e.g., "Server Backup App")</li>
                            <li>Click <strong>"Create"</strong> and wait for it to be created</li>
                            <li>Select the new project from the dropdown</li>
                        </ol>
                    </div>

                    {/* Step 2 */}
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">2</span>
                            Enable Google Drive API
                        </h3>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground ml-10">
                            <li>Navigate to <strong>"APIs & Services"</strong> → <strong>"Library"</strong></li>
                            <li>Search for <strong>"Google Drive API"</strong></li>
                            <li>Click on <strong>"Google Drive API"</strong> from the results</li>
                            <li>Click <strong>"Enable"</strong> and wait for it to be enabled</li>
                        </ol>
                    </div>

                    {/* Step 3 */}
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">3</span>
                            Configure OAuth Consent Screen
                        </h3>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground ml-10">
                            <li>Navigate to <strong>"APIs & Services"</strong> → <strong>"OAuth consent screen"</strong></li>
                            <li>Select <strong>"External"</strong> user type (unless you have Google Workspace)</li>
                            <li>Click <strong>"Create"</strong></li>
                            <li>Fill in required information:
                                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                                    <li><strong>App name:</strong> Server Backup App (or your preferred name)</li>
                                    <li><strong>User support email:</strong> Your email address</li>
                                    <li><strong>Developer contact:</strong> Your email address</li>
                                </ul>
                            </li>
                            <li>Click <strong>"Save and Continue"</strong></li>
                            <li>On the <strong>"Scopes"</strong> page:
                                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                                    <li>Click <strong>"Add or Remove Scopes"</strong></li>
                                    <li>Add these scopes:
                                        <ul className="list-circle list-inside ml-6 mt-1 space-y-1 font-mono text-xs">
                                            <li><code>drive.file</code> - View and manage Google Drive files</li>
                                            <li><code>drive.metadata.readonly</code> - View metadata for files</li>
                                        </ul>
                                    </li>
                                    <li>Click <strong>"Update"</strong> then <strong>"Save and Continue"</strong></li>
                                </ul>
                            </li>
                            <li>On the <strong>"Test users"</strong> page:
                                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                                    <li>Click <strong>"Add Users"</strong></li>
                                    <li>Add your Google account email</li>
                                    <li>Click <strong>"Add"</strong> then <strong>"Save and Continue"</strong></li>
                                </ul>
                            </li>
                            <li>Review and click <strong>"Back to Dashboard"</strong></li>
                        </ol>
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 ml-10 mt-2">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-muted-foreground">
                                    <strong>Note:</strong> If your app is in "Testing" mode, only test users can authorize it. 
                                    To make it available to all users, submit it for verification (or keep it in testing mode with your email as a test user).
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Step 4 */}
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">4</span>
                            Create OAuth 2.0 Credentials
                        </h3>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground ml-10">
                            <li>Navigate to <strong>"APIs & Services"</strong> → <strong>"Credentials"</strong></li>
                            <li>Click <strong>"+ CREATE CREDENTIALS"</strong> at the top</li>
                            <li>Select <strong>"OAuth client ID"</strong></li>
                            <li>Select <strong>"Web application"</strong> as the application type</li>
                            <li>Fill in the details:
                                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                                    <li><strong>Name:</strong> Server Backup App Client (or your preferred name)</li>
                                    <li><strong>Authorized JavaScript origins:</strong> Your app URL (e.g., <code className="text-xs bg-muted px-1 py-0.5 rounded">https://your-domain.com</code>)</li>
                                    <li><strong>Authorized redirect URIs:</strong> <code className="text-xs bg-muted px-1 py-0.5 rounded">https://your-domain.com/oauth_callback</code></li>
                                </ul>
                            </li>
                            <li>Click <strong>"Create"</strong></li>
                            <li><strong>IMPORTANT:</strong> Copy both the <strong>Client ID</strong> and <strong>Client Secret</strong> from the popup</li>
                        </ol>
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 ml-10 mt-2">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-muted-foreground">
                                    <strong>Security Note:</strong> Keep your Client Secret secure. Do not share it publicly or commit it to version control.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Step 5 */}
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">5</span>
                            Get Refresh Token (Recommended Method)
                        </h3>
                        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 ml-10">
                            <div className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium mb-2">Using In-App OAuth Flow (Easiest)</p>
                                    <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                                        <li>In this form, enter your <strong>Client ID</strong> and <strong>Client Secret</strong></li>
                                        <li>Click the <strong>"Get via OAuth"</strong> button next to the Refresh Token field</li>
                                        <li>A new window will open asking you to sign in with Google</li>
                                        <li>Sign in with your Google account (the one you added as a test user)</li>
                                        <li>Review the permissions and click <strong>"Allow"</strong></li>
                                        <li>You'll be redirected back and the refresh token will be saved automatically</li>
                                    </ol>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Step 6 */}
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">6</span>
                            Configure in App
                        </h3>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground ml-10">
                            <li>Fill in the form with your credentials:
                                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                                    <li><strong>Client ID:</strong> From Step 4</li>
                                    <li><strong>Client Secret:</strong> From Step 4</li>
                                    <li><strong>Refresh Token:</strong> From Step 5 (or manually if using alternative method)</li>
                                </ul>
                            </li>
                            <li>Enable <strong>"Automatically upload backups to Google Drive"</strong> checkbox</li>
                            <li>(Optional) Enter a <strong>Default Folder ID</strong> if you want backups in a specific folder</li>
                            <li>Click <strong>"Update Provider"</strong> to save</li>
                        </ol>
                    </div>

                    {/* Step 7 */}
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">7</span>
                            Test the Connection
                        </h3>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground ml-10">
                            <li>After saving, click the <strong>"Test Connection"</strong> button</li>
                            <li>You should see: <strong>"Connection successful!"</strong></li>
                            <li>If you see an error, check:
                                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                                    <li>Client ID and Client Secret are correct</li>
                                    <li>Redirect URI matches exactly: <code className="text-xs bg-muted px-1 py-0.5 rounded">https://your-domain.com/oauth_callback</code></li>
                                    <li>OAuth consent screen is configured correctly</li>
                                    <li>Your email is added as a test user (if app is in testing mode)</li>
                                </ul>
                            </li>
                        </ol>
                    </div>

                    {/* Quick Reference */}
                    <div className="border-t border-border pt-6 mt-6">
                        <h3 className="text-lg font-semibold mb-4">Quick Reference</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="bg-muted/50 rounded-lg p-4">
                                <p className="font-medium mb-2">Required Scopes:</p>
                                <ul className="list-disc list-inside space-y-1 text-muted-foreground font-mono text-xs">
                                    <li><code>drive.file</code></li>
                                    <li><code>drive.metadata.readonly</code></li>
                                </ul>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-4">
                                <p className="font-medium mb-2">Redirect URI Format:</p>
                                <code className="text-xs bg-background px-2 py-1 rounded block">https://your-domain.com/oauth_callback</code>
                            </div>
                        </div>
                    </div>

                    {/* Troubleshooting */}
                    <div className="border-t border-border pt-6 mt-6">
                        <h3 className="text-lg font-semibold mb-4">Common Issues</h3>
                        <div className="space-y-3 text-sm">
                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                                <p className="font-medium mb-1">"Redirect URI mismatch" error</p>
                                <p className="text-muted-foreground text-xs">
                                    Ensure the redirect URI in Google Cloud Console exactly matches your app's callback URL. 
                                    Check for trailing slashes or protocol mismatches (http vs https).
                                </p>
                            </div>
                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                                <p className="font-medium mb-1">"Access blocked: This app's request is invalid"</p>
                                <p className="text-muted-foreground text-xs">
                                    Make sure your email is added as a test user in OAuth consent screen. 
                                    Verify the OAuth consent screen is properly configured with required scopes.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="sticky bottom-0 bg-card border-t border-border p-6 flex justify-end">
                    <Button onClick={onClose}>Got it, thanks!</Button>
                </div>
            </div>
        </div>
    );
}

