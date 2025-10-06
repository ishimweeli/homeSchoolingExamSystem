import axios from 'axios';
import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiService {
  private instance: AxiosInstance;
  private refreshPromise: Promise<string> | null = null;
  private tokenCheckInterval: ReturnType<typeof setInterval> | null = null;
  private onTokenExpiredCallback: (() => void) | null = null;

  constructor() {
    this.instance = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    this.initTokenValidation();
  }

  /**
   * Register a callback to be called when tokens expire
   */
  public onTokenExpired(callback: () => void): void {
    this.onTokenExpiredCallback = callback;
  }

  private setupInterceptors() {
    this.instance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = this.getToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error: AxiosError) => {
        return Promise.reject(error);
      }
    );

    this.instance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            if (!this.refreshPromise) {
              this.refreshPromise = this.refreshToken();
            }

            const newToken = await this.refreshPromise;
            this.refreshPromise = null;

            this.setToken(newToken);
            originalRequest.headers.Authorization = `Bearer ${newToken}`;

            return this.instance(originalRequest);
          } catch (refreshError) {
            this.clearTokens();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async refreshToken(): Promise<string> {
    const refreshToken = localStorage.getItem('refreshToken');

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post(`${API_URL}/auth/refresh`, {
      refreshToken,
    });

    const { token, refreshToken: newRefreshToken } = response.data.data;

    this.setToken(token);
    this.setRefreshToken(newRefreshToken);

    return token;
  }

  private getToken(): string | null {
    return localStorage.getItem('token');
  }

  private setToken(token: string): void {
    localStorage.setItem('token', token);
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  private setRefreshToken(token: string): void {
    localStorage.setItem('refreshToken', token);
  }

  private clearTokens(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    this.stopTokenValidation();
    
    // Notify subscribers about token expiration
    if (this.onTokenExpiredCallback) {
      this.onTokenExpiredCallback();
    }
  }

  /**
   * Decode JWT token without verification (client-side only)
   */
  private decodeToken(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if a token is expired
   */
  private isTokenExpired(token: string | null): boolean {
    if (!token) return true;

    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) return true;

    // Check if token is expired (with 30 second buffer)
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime + 30;
  }

  /**
   * Initialize token validation and periodic checking
   */
  private initTokenValidation(): void {
    // Check tokens on initialization
    this.validateTokens();

    // Check tokens every minute
    this.tokenCheckInterval = setInterval(() => {
      this.validateTokens();
    }, 60000); // 60 seconds
  }

  /**
   * Stop token validation interval
   */
  private stopTokenValidation(): void {
    if (this.tokenCheckInterval) {
      clearInterval(this.tokenCheckInterval);
      this.tokenCheckInterval = null;
    }
  }

  /**
   * Validate stored tokens and clear if expired
   */
  private validateTokens(): void {
    const token = this.getToken();
    const refreshToken = this.getRefreshToken();

    // If access token is expired, check refresh token
    if (this.isTokenExpired(token)) {
      // If refresh token is also expired, clear everything
      if (this.isTokenExpired(refreshToken)) {
        console.log('Tokens expired, clearing authentication');
        this.clearTokens();
        // Trigger logout in auth store
        if (window.location.pathname !== '/login' && 
            window.location.pathname !== '/register' &&
            !window.location.pathname.startsWith('/auth/')) {
          window.location.href = '/login';
        }
      }
    }
  }

  // Auth methods
  async login(emailOrUsername: string, password: string) {
    const response = await this.instance.post('/auth/login', {
      emailOrUsername,
      password,
    });

    const { token, refreshToken, user } = response.data.data;
    this.setToken(token);
    this.setRefreshToken(refreshToken);

    return { user, token };
  }

  getGoogleOAuthUrl(): string {
    // Backend initiates OAuth at /api/auth/google
    return `${API_URL}/auth/google`;
  }

  async register(data: {
    email: string;
    password: string;
    name: string;
    username?: string;
    role?: string;
  }) {
    const response = await this.instance.post('/auth/register', data);

    const { token, refreshToken, user } = response.data.data;
    this.setToken(token);
    this.setRefreshToken(refreshToken);

    return { user, token };
  }

  async logout() {
    this.clearTokens();
  }

  async getProfile() {
    const response = await this.instance.get('/auth/profile');
    return response.data.data;
  }

  async updateProfile(data: { name?: string; username?: string; avatar?: string }) {
    const response = await this.instance.put('/auth/profile', data);
    return response.data.data;
  }

  // Password reset & verification
  async requestPasswordReset(email: string) {
    return this.instance.post('/auth/forgot-password', { email });
  }

  async resetPassword(token: string, password: string) {
    return this.instance.post('/auth/reset-password', { token, password });
  }

  async resendVerification(email: string) {
    return this.instance.post('/auth/resend-verification', { email });
  }

  async verifyEmail(token: string) {
    return this.instance.get(`/auth/verify-email`, { params: { token } });
  }

  // Generic methods
  async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.instance.get(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.instance.post(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.instance.put(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.instance.delete(url);
    return response.data;
  }

  // Users - Students management
  async listStudents() {
    const res = await this.instance.get('/users/students');
    return res.data.data;
  }

  async createStudent(payload: { name: string; username: string; password: string }) {
    const res = await this.instance.post('/users/students', payload);
    return res.data.data;
  }

  async deleteStudent(id: string) {
    const res = await this.instance.delete(`/users/students/${id}`);
    return res.data;
  }

  // Dashboard data
  async getDashboardStats() {
    const res = await this.instance.get('/dashboard/stats');
    return res.data.data;
  }

  async getRecentActivity() {
    const res = await this.instance.get('/dashboard/activity');
    return res.data.data;
  }

  async listExams(params?: any) {
    const res = await this.instance.get('/exams', { params });
    return res.data.data;
  }

  async getAssignedExams() {
    const res = await this.instance.get('/students/assigned-exams');
    return res.data.data;
  }

  async getExam(id: string) {
    const res = await this.instance.get(`/exams/${id}`);
    return res.data.data;
  }

  async listStudyModules(params?: any) {
    const res = await this.instance.get('/study-modules', { params });
    return res.data.data;
  }

  async getAssignedModules() {
    const res = await this.instance.get('/study-modules/assignments');
    return res.data.data;
  }

  async createStudyModule(payload: {
    title: string;
    description?: string;
    topic: string;
    subject: string;
    gradeLevel: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    totalLessons?: number;
    passingScore?: number;
    livesEnabled?: boolean;
    maxLives?: number;
    xpReward?: number;
    badgeType?: string;
  }) {
    const res = await this.instance.post('/study-modules', payload);
    return res.data.data;
  }

  async generateStudyModule(payload: {
    subject: string;
    gradeLevel: number;
    topic: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    lessonCount?: number;
    includeGamification?: boolean;
  }) {
    const res = await this.instance.post('/study-modules/generate', payload);
    return res.data.data;
  }
}

export const api = new ApiService();
export default api;