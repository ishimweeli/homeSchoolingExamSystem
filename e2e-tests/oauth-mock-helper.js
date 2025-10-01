const express = require('express');
const jwt = require('jsonwebtoken');

// Mock OAuth2 server for testing
class OAuth2MockServer {
  constructor(port = 4000) {
    this.port = port;
    this.app = express();
    this.server = null;
    this.setupRoutes();
  }

  setupRoutes() {
    this.app.use(express.json());

    // Mock Google OAuth2 authorization endpoint
    this.app.get('/oauth2/v2/auth', (req, res) => {
      const { client_id, redirect_uri, scope, response_type, state } = req.query;

      // Simulate user consent and redirect back with code
      const authCode = 'mock_auth_code_' + Date.now();
      const redirectUrl = `${redirect_uri}?code=${authCode}&state=${state || ''}`;

      res.redirect(redirectUrl);
    });

    // Mock Google OAuth2 token endpoint
    this.app.post('/oauth2/v4/token', (req, res) => {
      const { code, client_id, client_secret, redirect_uri, grant_type } = req.body;

      if (grant_type === 'authorization_code') {
        // Return mock tokens
        res.json({
          access_token: 'mock_access_token_' + Date.now(),
          refresh_token: 'mock_refresh_token_' + Date.now(),
          token_type: 'Bearer',
          expires_in: 3600,
          id_token: jwt.sign({
            iss: 'https://accounts.google.com',
            sub: 'mock_google_user_123',
            email: 'mockuser@gmail.com',
            email_verified: true,
            name: 'Mock Google User',
            picture: 'https://example.com/photo.jpg',
            given_name: 'Mock',
            family_name: 'User',
            locale: 'en',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600
          }, 'mock_secret')
        });
      } else {
        res.status(400).json({ error: 'unsupported_grant_type' });
      }
    });

    // Mock Google userinfo endpoint
    this.app.get('/oauth2/v2/userinfo', (req, res) => {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'invalid_token' });
      }

      res.json({
        id: 'mock_google_user_123',
        email: 'mockuser@gmail.com',
        verified_email: true,
        name: 'Mock Google User',
        given_name: 'Mock',
        family_name: 'User',
        picture: 'https://example.com/photo.jpg',
        locale: 'en'
      });
    });

    // Mock GitHub OAuth2 authorization endpoint
    this.app.get('/login/oauth/authorize', (req, res) => {
      const { client_id, redirect_uri, scope, state } = req.query;

      const authCode = 'mock_github_code_' + Date.now();
      const redirectUrl = `${redirect_uri}?code=${authCode}&state=${state || ''}`;

      res.redirect(redirectUrl);
    });

    // Mock GitHub OAuth2 token endpoint
    this.app.post('/login/oauth/access_token', (req, res) => {
      const { code, client_id, client_secret, redirect_uri } = req.body;

      res.json({
        access_token: 'mock_github_token_' + Date.now(),
        token_type: 'bearer',
        scope: 'user:email'
      });
    });

    // Mock GitHub user endpoint
    this.app.get('/user', (req, res) => {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('token ')) {
        return res.status(401).json({ error: 'Bad credentials' });
      }

      res.json({
        id: 456789,
        login: 'mockgithubuser',
        name: 'Mock GitHub User',
        email: 'mockuser@github.com',
        avatar_url: 'https://avatars.githubusercontent.com/u/456789',
        bio: 'Mock GitHub user for testing',
        public_repos: 10,
        followers: 5,
        following: 3
      });
    });

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', service: 'OAuth2 Mock Server' });
    });
  }

  start() {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`OAuth2 Mock Server running on port ${this.port}`);
        resolve();
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('OAuth2 Mock Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// Helper function to configure app with mock OAuth2
function configureMockOAuth2(backendUrl) {
  const mockConfig = {
    google: {
      authorizationURL: 'http://localhost:4000/oauth2/v2/auth',
      tokenURL: 'http://localhost:4000/oauth2/v4/token',
      userInfoURL: 'http://localhost:4000/oauth2/v2/userinfo',
      clientID: 'mock_google_client_id',
      clientSecret: 'mock_google_client_secret',
      callbackURL: `${backendUrl}/api/auth/google/callback`
    },
    github: {
      authorizationURL: 'http://localhost:4000/login/oauth/authorize',
      tokenURL: 'http://localhost:4000/login/oauth/access_token',
      userInfoURL: 'http://localhost:4000/user',
      clientID: 'mock_github_client_id',
      clientSecret: 'mock_github_client_secret',
      callbackURL: `${backendUrl}/api/auth/github/callback`
    }
  };

  return mockConfig;
}

module.exports = {
  OAuth2MockServer,
  configureMockOAuth2
};