import { loadEnv } from './env.js';

export type CreatePullRequestInput = {
  owner: string;
  repo: string;
  baseBranch: string;
  headBranch: string;
  title: string;
  body?: string;
  draft?: boolean;
};

export type GitHubPullRequest = {
  number: number;
  html_url: string;
  url: string;
  state: string;
};

export class GitHubApiError extends Error {
  statusCode: number;
  details: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = 'GitHubApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class GitHubClient {
  async createPullRequest(input: CreatePullRequestInput): Promise<GitHubPullRequest> {
    return this.request<GitHubPullRequest>(
      'POST',
      `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/pulls`,
      {
        title: input.title,
        head: input.headBranch,
        base: input.baseBranch,
        body: input.body || '',
        draft: Boolean(input.draft),
      },
    );
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    loadEnv();

    const apiBaseUrl = (process.env.GITHUB_API_BASE_URL || 'https://api.github.com').replace(/\/$/, '');
    const token = process.env.GITHUB_TOKEN || '';

    if (!token) {
      throw new GitHubApiError(500, 'GITHUB_TOKEN is not configured');
    }

    const response = await fetch(`${apiBaseUrl}${path}`, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'vide-ai-agent',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : undefined;

    if (!response.ok) {
      const message = isGitHubErrorResponse(data) ? data.message : 'GitHub API request failed';
      throw new GitHubApiError(response.status, message, data);
    }

    return data as T;
  }
}

function isGitHubErrorResponse(value: unknown): value is { message: string } {
  return typeof value === 'object'
    && value !== null
    && 'message' in value
    && typeof (value as { message: unknown }).message === 'string';
}
