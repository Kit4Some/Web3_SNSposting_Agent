import { TwitterApi, EUploadMimeType } from 'twitter-api-v2';
import fs from 'fs';
import path from 'path';
import { settingsRepository, postRepository } from '../../database/repositories';
import { shell } from 'electron';
import http from 'http';
import url from 'url';

export type TwitterAuthType = 'oauth1' | 'oauth2';

export interface TwitterCredentialsOAuth1 {
  type: 'oauth1';
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

export interface TwitterCredentialsOAuth2 {
  type: 'oauth2';
  clientId: string;
  clientSecret: string;
  // OAuth 2.0 User Context tokens (obtained via PKCE flow)
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
}

export type TwitterCredentials = TwitterCredentialsOAuth1 | TwitterCredentialsOAuth2;

export interface TwitterUserInfo {
  id: string;
  name: string;
  username: string;
  profileImageUrl?: string;
}

// OAuth 2.0 PKCE state storage
interface OAuth2State {
  codeVerifier: string;
  state: string;
  server?: http.Server;
}

export class TwitterService {
  private client: TwitterApi | null = null;
  private oauth2Client: TwitterApi | null = null;
  private oauth2State: OAuth2State | null = null;

  // OAuth 2.0 PKCE callback port
  private static readonly CALLBACK_PORT = 3847;
  private static readonly CALLBACK_URL = `http://localhost:${TwitterService.CALLBACK_PORT}/callback`;

  // OAuth 2.0 scopes required for posting tweets
  private static readonly OAUTH2_SCOPES = [
    'tweet.read',
    'tweet.write',
    'users.read',
    'offline.access', // Required for refresh token
  ];

  /**
   * Cancel any existing OAuth 2.0 flow
   */
  private cancelExistingOAuth2Flow(): void {
    if (this.oauth2State?.server) {
      try {
        this.oauth2State.server.close();
      } catch {
        // Ignore close errors
      }
    }
    this.oauth2State = null;
  }

  /**
   * Start OAuth 2.0 PKCE authorization flow
   * Opens browser for user authorization and returns tokens
   */
  async startOAuth2Flow(): Promise<{
    success: boolean;
    user?: TwitterUserInfo;
    error?: string;
  }> {
    const clientId = settingsRepository.get('twitterClientId');
    const clientSecret = settingsRepository.get('twitterClientSecret');

    if (!clientId) {
      return { success: false, error: 'Twitter Client ID not configured' };
    }

    // Cancel any existing OAuth flow
    this.cancelExistingOAuth2Flow();

    return new Promise((resolve) => {
      try {
        // Create OAuth 2.0 client
        const client = new TwitterApi({
          clientId,
          clientSecret: clientSecret || undefined,
        });

        // Generate authorization URL with PKCE (library handles codeVerifier internally)
        const { url: authUrl, codeVerifier, state } = client.generateOAuth2AuthLink(
          TwitterService.CALLBACK_URL,
          {
            scope: TwitterService.OAUTH2_SCOPES,
          }
        );

        // Store state for callback verification
        this.oauth2State = {
          codeVerifier,
          state,
        };

        // Start local callback server
        const server = http.createServer(async (req, res) => {
          try {
            const parsedUrl = url.parse(req.url || '', true);

            if (parsedUrl.pathname === '/callback') {
              const code = parsedUrl.query.code as string;
              const returnedState = parsedUrl.query.state as string;
              const error = parsedUrl.query.error as string;

              if (error) {
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(`
                  <html>
                    <head><title>Authorization Failed</title></head>
                    <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #1a1a2e;">
                      <div style="text-align: center; color: #fff;">
                        <h1 style="color: #ef4444;">❌ Authorization Failed</h1>
                        <p>Error: ${error}</p>
                        <p>You can close this window.</p>
                      </div>
                    </body>
                  </html>
                `);
                server.close();
                this.oauth2State = null;
                resolve({ success: false, error: `Authorization denied: ${error}` });
                return;
              }

              if (!code || returnedState !== this.oauth2State?.state) {
                res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(`
                  <html>
                    <head><title>Invalid Request</title></head>
                    <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #1a1a2e;">
                      <div style="text-align: center; color: #fff;">
                        <h1 style="color: #ef4444;">❌ Invalid Request</h1>
                        <p>State mismatch or missing authorization code.</p>
                        <p>You can close this window.</p>
                      </div>
                    </body>
                  </html>
                `);
                server.close();
                this.oauth2State = null;
                resolve({ success: false, error: 'Invalid callback: state mismatch or missing code' });
                return;
              }

              // Exchange code for tokens
              try {
                const tokenClient = new TwitterApi({
                  clientId,
                  clientSecret: clientSecret || undefined,
                });

                const {
                  accessToken,
                  refreshToken,
                  expiresIn,
                  client: loggedClient,
                } = await tokenClient.loginWithOAuth2({
                  code,
                  codeVerifier: this.oauth2State.codeVerifier,
                  redirectUri: TwitterService.CALLBACK_URL,
                });

                // Calculate expiration time
                const tokenExpiresAt = Date.now() + (expiresIn * 1000);

                // Save tokens to settings
                settingsRepository.set('twitterOAuth2AccessToken', accessToken);
                if (refreshToken) {
                  settingsRepository.set('twitterOAuth2RefreshToken', refreshToken);
                }
                settingsRepository.set('twitterOAuth2TokenExpiresAt', tokenExpiresAt.toString());

                // Get user info
                const me = await loggedClient.v2.me({
                  'user.fields': ['profile_image_url'],
                });

                // Update cached client
                this.oauth2Client = loggedClient;

                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(`
                  <html>
                    <head><title>Authorization Successful</title></head>
                    <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #1a1a2e;">
                      <div style="text-align: center; color: #fff;">
                        <h1 style="color: #22c55e;">✅ Authorization Successful!</h1>
                        <p>Connected as <strong>@${me.data.username}</strong></p>
                        <p>You can close this window and return to the app.</p>
                      </div>
                    </body>
                  </html>
                `);

                server.close();
                this.oauth2State = null;

                resolve({
                  success: true,
                  user: {
                    id: me.data.id,
                    name: me.data.name,
                    username: me.data.username,
                    profileImageUrl: me.data.profile_image_url,
                  },
                });
              } catch (tokenError) {
                console.error('Token exchange failed:', tokenError);
                res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(`
                  <html>
                    <head><title>Token Exchange Failed</title></head>
                    <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #1a1a2e;">
                      <div style="text-align: center; color: #fff;">
                        <h1 style="color: #ef4444;">❌ Token Exchange Failed</h1>
                        <p>${tokenError instanceof Error ? tokenError.message : 'Unknown error'}</p>
                        <p>You can close this window.</p>
                      </div>
                    </body>
                  </html>
                `);
                server.close();
                this.oauth2State = null;
                resolve({
                  success: false,
                  error: `Token exchange failed: ${tokenError instanceof Error ? tokenError.message : 'Unknown error'}`,
                });
              }
            } else {
              res.writeHead(404);
              res.end('Not found');
            }
          } catch (err) {
            console.error('Callback server error:', err);
            res.writeHead(500);
            res.end('Internal server error');
          }
        });

        // Handle server errors (e.g., port already in use)
        server.on('error', (err: NodeJS.ErrnoException) => {
          console.error('OAuth2 callback server error:', err);
          this.oauth2State = null;

          if (err.code === 'EADDRINUSE') {
            resolve({
              success: false,
              error: `Port ${TwitterService.CALLBACK_PORT} is already in use. Please wait a moment and try again.`,
            });
          } else {
            resolve({
              success: false,
              error: `Failed to start OAuth server: ${err.message}`,
            });
          }
        });

        server.listen(TwitterService.CALLBACK_PORT, () => {
          console.log(`OAuth2 callback server listening on port ${TwitterService.CALLBACK_PORT}`);
          // Open browser for authorization
          shell.openExternal(authUrl);
        });

        this.oauth2State.server = server;

        // Set timeout (5 minutes)
        const timeoutId = setTimeout(() => {
          if (this.oauth2State?.server) {
            this.oauth2State.server.close();
            this.oauth2State = null;
            resolve({ success: false, error: 'Authorization timeout (5 minutes)' });
          }
        }, 5 * 60 * 1000);

        // Clean up timeout when server closes
        server.on('close', () => {
          clearTimeout(timeoutId);
        });

      } catch (error) {
        console.error('OAuth2 flow error:', error);
        this.cancelExistingOAuth2Flow();
        resolve({
          success: false,
          error: `OAuth2 flow failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    });
  }

  /**
   * Refresh OAuth 2.0 access token using refresh token
   */
  async refreshOAuth2Token(): Promise<boolean> {
    const clientId = settingsRepository.get('twitterClientId');
    const clientSecret = settingsRepository.get('twitterClientSecret');
    const refreshToken = settingsRepository.get('twitterOAuth2RefreshToken');

    if (!clientId || !refreshToken) {
      console.error('Cannot refresh token: missing clientId or refreshToken');
      return false;
    }

    try {
      const client = new TwitterApi({
        clientId,
        clientSecret: clientSecret || undefined,
      });

      const {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn,
        client: refreshedClient,
      } = await client.refreshOAuth2Token(refreshToken);

      // Calculate new expiration time
      const tokenExpiresAt = Date.now() + (expiresIn * 1000);

      // Save new tokens
      settingsRepository.set('twitterOAuth2AccessToken', newAccessToken);
      if (newRefreshToken) {
        settingsRepository.set('twitterOAuth2RefreshToken', newRefreshToken);
      }
      settingsRepository.set('twitterOAuth2TokenExpiresAt', tokenExpiresAt.toString());

      // Update cached client
      this.oauth2Client = refreshedClient;

      console.log('OAuth2 token refreshed successfully');
      return true;
    } catch (error) {
      console.error('Failed to refresh OAuth2 token:', error);
      // Clear expired tokens
      settingsRepository.delete('twitterOAuth2AccessToken');
      settingsRepository.delete('twitterOAuth2RefreshToken');
      settingsRepository.delete('twitterOAuth2TokenExpiresAt');
      return false;
    }
  }

  /**
   * Check if OAuth 2.0 token needs refresh
   */
  private async ensureValidOAuth2Token(): Promise<boolean> {
    const tokenExpiresAt = settingsRepository.get('twitterOAuth2TokenExpiresAt');
    const accessToken = settingsRepository.get('twitterOAuth2AccessToken');

    if (!accessToken) {
      return false;
    }

    if (tokenExpiresAt) {
      const expiresAt = parseInt(tokenExpiresAt, 10);
      // Refresh if token expires in less than 5 minutes
      if (Date.now() > expiresAt - 5 * 60 * 1000) {
        console.log('OAuth2 token expiring soon, refreshing...');
        return await this.refreshOAuth2Token();
      }
    }

    return true;
  }

  /**
   * Check if OAuth 2.0 is authorized (has valid tokens)
   */
  isOAuth2Authorized(): boolean {
    const accessToken = settingsRepository.get('twitterOAuth2AccessToken');
    return !!accessToken;
  }

  /**
   * Revoke OAuth 2.0 authorization (clear tokens)
   */
  revokeOAuth2(): void {
    settingsRepository.delete('twitterOAuth2AccessToken');
    settingsRepository.delete('twitterOAuth2RefreshToken');
    settingsRepository.delete('twitterOAuth2TokenExpiresAt');
    this.oauth2Client = null;
    console.log('OAuth2 authorization revoked');
  }

  private getClient(): TwitterApi {
    const credentials = this.getCredentials();
    if (!credentials) {
      throw new Error('Twitter credentials not configured');
    }

    if (credentials.type === 'oauth2') {
      // OAuth 2.0 User Context - use stored access token
      const accessToken = settingsRepository.get('twitterOAuth2AccessToken');
      if (!accessToken) {
        throw new Error('OAuth 2.0 not authorized. Please authorize via Settings.');
      }

      if (!this.oauth2Client) {
        this.oauth2Client = new TwitterApi(accessToken);
      }
      return this.oauth2Client;
    } else {
      if (!this.client) {
        this.client = new TwitterApi({
          appKey: credentials.apiKey,
          appSecret: credentials.apiSecret,
          accessToken: credentials.accessToken,
          accessSecret: credentials.accessTokenSecret,
        });
      }
      return this.client;
    }
  }

  private async getClientWithUserContext(): Promise<TwitterApi> {
    const credentials = this.getCredentials();
    if (!credentials) {
      throw new Error('Twitter credentials not configured');
    }

    if (credentials.type === 'oauth2') {
      // Ensure token is valid
      const isValid = await this.ensureValidOAuth2Token();
      if (!isValid) {
        throw new Error('OAuth 2.0 token invalid or expired. Please re-authorize via Settings.');
      }
      return this.getClient();
    } else {
      return this.getClient();
    }
  }

  getAuthType(): TwitterAuthType {
    return (settingsRepository.get('twitterAuthType') as TwitterAuthType) || 'oauth1';
  }

  private getCredentials(): TwitterCredentials | null {
    const authType = this.getAuthType();

    if (authType === 'oauth2') {
      const clientId = settingsRepository.get('twitterClientId');
      const clientSecret = settingsRepository.get('twitterClientSecret');
      const accessToken = settingsRepository.get('twitterOAuth2AccessToken');
      const refreshToken = settingsRepository.get('twitterOAuth2RefreshToken');
      const tokenExpiresAt = settingsRepository.get('twitterOAuth2TokenExpiresAt');

      if (!clientId) {
        return null;
      }

      return {
        type: 'oauth2',
        clientId,
        clientSecret: clientSecret || '',
        accessToken: accessToken || undefined,
        refreshToken: refreshToken || undefined,
        tokenExpiresAt: tokenExpiresAt ? parseInt(tokenExpiresAt, 10) : undefined,
      };
    } else {
      const apiKey = settingsRepository.get('twitterApiKey');
      const apiSecret = settingsRepository.get('twitterApiSecret');
      const accessToken = settingsRepository.get('twitterAccessToken');
      const accessTokenSecret = settingsRepository.get('twitterAccessTokenSecret');

      if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
        return null;
      }

      return { type: 'oauth1', apiKey, apiSecret, accessToken, accessTokenSecret };
    }
  }

  async testConnection(): Promise<{
    success: boolean;
    user?: TwitterUserInfo;
    error?: string;
    authType?: TwitterAuthType;
    isAuthorized?: boolean;
  }> {
    try {
      const credentials = this.getCredentials();
      if (!credentials) {
        return { success: false, error: 'Twitter credentials not configured' };
      }

      if (credentials.type === 'oauth2') {
        // Check if OAuth 2.0 is authorized
        if (!credentials.accessToken) {
          return {
            success: false,
            error: 'OAuth 2.0 not authorized. Click "Authorize" to connect your Twitter account.',
            authType: 'oauth2',
            isAuthorized: false,
          };
        }

        // Ensure token is valid
        const isValid = await this.ensureValidOAuth2Token();
        if (!isValid) {
          return {
            success: false,
            error: 'OAuth 2.0 token expired. Click "Authorize" to reconnect.',
            authType: 'oauth2',
            isAuthorized: false,
          };
        }

        // Get user info
        const client = this.getClient();
        const me = await client.v2.me({
          'user.fields': ['profile_image_url'],
        });

        return {
          success: true,
          authType: 'oauth2',
          isAuthorized: true,
          user: {
            id: me.data.id,
            name: me.data.name,
            username: me.data.username,
            profileImageUrl: me.data.profile_image_url,
          },
        };
      } else {
        const client = this.getClient();
        const me = await client.v2.me({
          'user.fields': ['profile_image_url'],
        });

        return {
          success: true,
          authType: 'oauth1',
          user: {
            id: me.data.id,
            name: me.data.name,
            username: me.data.username,
            profileImageUrl: me.data.profile_image_url,
          },
        };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  async getUserInfo(): Promise<TwitterUserInfo | null> {
    try {
      const client = this.getClient();
      const me = await client.v2.me({
        'user.fields': ['profile_image_url'],
      });

      return {
        id: me.data.id,
        name: me.data.name,
        username: me.data.username,
        profileImageUrl: me.data.profile_image_url,
      };
    } catch (error) {
      console.error('Failed to get user info:', error);
      return null;
    }
  }

  async postTweet(text: string, imagePath?: string): Promise<string> {
    const credentials = this.getCredentials();
    if (!credentials) {
      throw new Error('Twitter credentials not configured');
    }

    // For OAuth 2.0, ensure we have valid user context tokens
    if (credentials.type === 'oauth2') {
      if (!credentials.accessToken) {
        throw new Error(
          'OAuth 2.0 not authorized. Please authorize via Settings to enable posting.'
        );
      }

      // Ensure token is valid before posting
      const isValid = await this.ensureValidOAuth2Token();
      if (!isValid) {
        throw new Error(
          'OAuth 2.0 token expired or invalid. Please re-authorize via Settings.'
        );
      }
    }

    const client = this.getClient();
    const authType = this.getAuthType();

    try {
      let mediaId: string | undefined;

      // Upload image if provided
      // Note: OAuth 2.0 User Context doesn't support v1 media upload
      // Media upload requires OAuth 1.0a authentication
      if (imagePath && fs.existsSync(imagePath)) {
        if (authType === 'oauth1') {
          // OAuth 1.0a supports media upload via v1 API
          const mimeType = this.getMimeType(imagePath);
          mediaId = await client.v1.uploadMedia(imagePath, { mimeType });
        } else {
          // OAuth 2.0 doesn't support media upload - log warning
          console.warn(
            'OAuth 2.0 does not support image upload. Posting text-only tweet. ' +
            'Use OAuth 1.0a for image support.'
          );
        }
      }

      // Post tweet
      const tweet = await client.v2.tweet({
        text,
        ...(mediaId && { media: { media_ids: [mediaId] } }),
      });

      if (!tweet.data.id) {
        throw new Error('Failed to post tweet: No ID returned');
      }

      return tweet.data.id;
    } catch (error: any) {
      console.error('Failed to post tweet:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));

      // Extract detailed error information
      const errorCode = error?.code || error?.data?.status;
      const errorTitle = error?.data?.title;
      const errorDetail = error?.data?.detail;
      const errorType = error?.data?.type;
      const errors = error?.data?.errors;

      console.error('Parsed error info:', {
        code: errorCode,
        title: errorTitle,
        detail: errorDetail,
        type: errorType,
        errors,
      });

      // Handle specific Twitter API errors
      if (errorCode === 402 || errorTitle === 'CreditsDepleted' ||
          errorDetail?.includes('credit') || errorType?.includes('credit')) {
        throw new Error(
          'Twitter API credits depleted. Please check your Twitter Developer Portal subscription. Basic plan ($100/month) or higher is required for posting tweets.'
        );
      }

      // Usage cap exceeded (Free tier limit)
      if (errorCode === 429 || errorTitle === 'UsageCapExceeded' ||
          errorDetail?.includes('usage') || errorDetail?.includes('cap')) {
        throw new Error(
          `Twitter API usage limit exceeded. ${errorDetail || 'Please upgrade your plan or wait for the limit to reset.'}`
        );
      }

      if (errorCode === 403) {
        const detail = errorDetail || 'Please verify your app has write permissions and your API plan supports posting.';
        throw new Error(
          `Twitter API access forbidden: ${detail}`
        );
      }

      if (errorCode === 401) {
        throw new Error(
          'Twitter authentication failed. Please check your API credentials in Settings.'
        );
      }

      // For any other error, include the full error message
      const message = error?.message || errorDetail || errorTitle || 'Unknown error';
      throw new Error(`Twitter API error: ${message}`);
    }
  }

  async publishPost(postId: number): Promise<string> {
    const post = postRepository.getById(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    try {
      const tweetId = await this.postTweet(post.content, post.imageUrl || undefined);

      // Update post status
      postRepository.markPosted(postId, tweetId);

      return tweetId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      postRepository.updateStatus(postId, 'failed', errorMessage);
      throw error;
    }
  }

  async publishNextScheduled(): Promise<{
    published: boolean;
    postId?: number;
    tweetId?: string;
    error?: string;
  }> {
    const post = postRepository.getNextScheduled();
    if (!post) {
      return { published: false };
    }

    try {
      const tweetId = await this.publishPost(post.id);
      return { published: true, postId: post.id, tweetId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { published: false, postId: post.id, error: errorMessage };
    }
  }

  resetClient(): void {
    this.client = null;
    this.oauth2Client = null;
  }

  hasCredentials(): boolean {
    return settingsRepository.hasTwitterCredentials();
  }

  private getMimeType(filePath: string): EUploadMimeType {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.png':
        return EUploadMimeType.Png;
      case '.jpg':
      case '.jpeg':
        return EUploadMimeType.Jpeg;
      case '.gif':
        return EUploadMimeType.Gif;
      case '.webp':
        return EUploadMimeType.Webp;
      default:
        return EUploadMimeType.Png;
    }
  }
}

export const twitterService = new TwitterService();
