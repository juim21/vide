import { FastifyInstance } from 'fastify';
import { loadEnv } from '../utils/env.js';
import { GitHubApiError, GitHubClient } from '../utils/github.js';

type CreatePullRequestBody = {
  owner?: string;
  repo?: string;
  baseBranch?: string;
  headBranch?: string;
  title?: string;
  body?: string;
  draft?: boolean;
};

const github = new GitHubClient();

export async function githubRoutes(app: FastifyInstance) {
  app.get('/api/github/pull-requests', async () => ({
    success: true,
    data: {
      message: 'Use POST /api/github/pull-requests to create a GitHub pull request.',
      githubTokenConfigured: isGitHubTokenConfigured(),
      requiredEnvironment: ['GITHUB_TOKEN'],
      optionalEnvironment: {
        GITHUB_API_BASE_URL: 'Defaults to https://api.github.com',
      },
      exampleBody: {
        owner: 'juim21',
        repo: 'vide',
        baseBranch: 'main',
        headBranch: 'dev',
        title: '[AI] Add GitHub PR creation API',
        body: '## Summary\n- Created by AI agent',
        draft: true,
      },
    },
  }));

  app.post('/api/github/pull-requests', async (request, reply) => {
    const body = request.body as CreatePullRequestBody;
    const validationError = validateCreatePullRequestBody(body);

    if (validationError) {
      return reply.status(400).send({ success: false, error: validationError });
    }

    try {
      const pullRequest = await github.createPullRequest({
        owner: body.owner!,
        repo: body.repo!,
        baseBranch: body.baseBranch!,
        headBranch: body.headBranch!,
        title: body.title!,
        body: body.body,
        draft: body.draft,
      });

      return reply.status(201).send({
        success: true,
        data: {
          status: 'pr_created',
          pullRequestNumber: pullRequest.number,
          pullRequestUrl: pullRequest.html_url,
          apiUrl: pullRequest.url,
          state: pullRequest.state,
        },
      });
    } catch (error) {
      if (error instanceof GitHubApiError) {
        return reply.status(error.statusCode).send({
          success: false,
          error: error.message,
          details: error.details,
        });
      }

      request.log.error(error);
      return reply.status(500).send({ success: false, error: 'Failed to create pull request' });
    }
  });
}

function validateCreatePullRequestBody(body: CreatePullRequestBody) {
  const requiredFields: Array<keyof CreatePullRequestBody> = [
    'owner',
    'repo',
    'baseBranch',
    'headBranch',
    'title',
  ];

  for (const field of requiredFields) {
    if (!body[field] || typeof body[field] !== 'string') {
      return `${field} is required`;
    }
  }

  if (body.body !== undefined && typeof body.body !== 'string') {
    return 'body must be a string';
  }

  if (body.draft !== undefined && typeof body.draft !== 'boolean') {
    return 'draft must be a boolean';
  }

  return null;
}

function isGitHubTokenConfigured() {
  loadEnv();
  return Boolean(process.env.GITHUB_TOKEN);
}
