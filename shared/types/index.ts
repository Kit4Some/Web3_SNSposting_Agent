// Session Types (Multi-account support)
export interface Session {
  id: number;
  name: string;
  description?: string;
  twitterApiKey?: string;
  twitterApiSecret?: string;
  twitterAccessToken?: string;
  twitterAccessTokenSecret?: string;
  enabled: boolean;
  postingInterval: number; // days
  postingTime: string; // HH:mm format
  createdAt: number;
  updatedAt: number;
}

export interface SessionWithStats extends Session {
  sourceCount: number;
  pendingPosts: number;
  postedCount: number;
}

// News Source Types
export type SourceType = 'api' | 'rss' | 'scrape';

export interface SourceConfig {
  apiKey?: string;
  rateLimit?: number;
  selectors?: {
    title: string;
    content: string;
    date: string;
    link: string;
  };
  itemLimit?: number;
}

export interface NewsSource {
  id: number;
  sessionId?: number; // Optional session association
  name: string;
  type: SourceType;
  url: string;
  enabled: boolean;
  config?: SourceConfig;
  lastFetchedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface NewsSourceWithSession extends NewsSource {
  session?: Session;
}

// News Item Types
export interface NewsItem {
  id: number;
  sourceId: number;
  externalId?: string;
  title: string;
  content?: string;
  summary?: string;
  url?: string;
  amountLost?: number;
  chain?: string;
  classification?: string;
  technique?: string;
  publishedAt?: number;
  fetchedAt: number;
  processed: boolean;
  createdAt: number;
}

export interface NewsItemWithSource extends NewsItem {
  source: NewsSource;
}

// Post Types
export type PostStatus = 'draft' | 'scheduled' | 'posted' | 'failed';

export interface Post {
  id: number;
  sessionId?: number; // Optional session association
  newsItemId: number;
  content: string;
  imageUrl?: string;
  imagePrompt?: string;
  status: PostStatus;
  scheduledFor?: number;
  postedAt?: number;
  tweetId?: string;
  errorMessage?: string;
  createdAt: number;
  updatedAt: number;
}

export interface PostWithNews extends Post {
  newsItem: NewsItem;
}

// Template Types
export type TemplateType = 'summary' | 'image';

export interface Template {
  id: number;
  name: string;
  type: TemplateType;
  content: string;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

// Settings Types
export type TwitterAuthType = 'oauth1' | 'oauth2';

export interface AppSettings {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  // Twitter OAuth 1.0a credentials
  twitterApiKey?: string;
  twitterApiSecret?: string;
  twitterAccessToken?: string;
  twitterAccessTokenSecret?: string;
  // Twitter OAuth 2.0 credentials (PKCE flow)
  twitterAuthType?: TwitterAuthType;
  twitterClientId?: string;
  twitterClientSecret?: string;
  // OAuth 2.0 tokens (obtained via PKCE flow, not user-entered)
  twitterOAuth2AccessToken?: string;
  twitterOAuth2RefreshToken?: string;
  twitterOAuth2TokenExpiresAt?: string;
  postingInterval: number; // days
  postingTime: string; // HH:mm format
  newsCollectionInterval: number; // hours
  language: 'ko' | 'en' | 'ja' | 'zh';
  theme: 'dark' | 'light';
}

// Twitter User Info for OAuth 2.0
export interface TwitterUserInfo {
  id: string;
  name: string;
  username: string;
  profileImageUrl?: string;
}

// OAuth 2.0 Authorization Result
export interface OAuth2AuthResult {
  success: boolean;
  user?: TwitterUserInfo;
  error?: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Dashboard Stats
export interface DashboardStats {
  totalNews: number;
  unprocessedNews: number;
  scheduledPosts: number;
  postedCount: number;
  lastPostDate?: number;
  nextScheduledPost?: number;
}

// DeFiLlama Hack Type
export interface DefiLlamaHack {
  date: number;
  name: string;
  classification: string;
  technique: string;
  amount: number | null;
  chain: string[];
  bridgeHack: boolean;
  targetType: string;
  source: string;
  returnedFunds: number | null;
}
