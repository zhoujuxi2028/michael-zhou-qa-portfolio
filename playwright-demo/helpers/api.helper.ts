/**
 * Typed API Helper — JSONPlaceholder Wrapper
 *
 * Interview Talking Point:
 * "TypeScript interfaces enforce the shape of API responses at compile time.
 * If the API changes a field name, the compiler catches it before tests run."
 */

import { type APIRequestContext } from '@playwright/test';

// ── Response Types ──────────────────────────────────────────────────

export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  address: {
    street: string;
    suite: string;
    city: string;
    zipcode: string;
    geo: { lat: string; lng: string };
  };
  phone: string;
  website: string;
  company: { name: string; catchPhrase: string; bs: string };
}

export interface Post {
  userId: number;
  id: number;
  title: string;
  body: string;
}

// ── API Helper Class ────────────────────────────────────────────────

export class ApiHelper {
  constructor(private readonly context: APIRequestContext) {}

  async getUsers(): Promise<User[]> {
    const response = await this.context.get('/users');
    return response.json();
  }

  async getUserById(id: number): Promise<User> {
    const response = await this.context.get(`/users/${id}`);
    return response.json();
  }

  async getPosts(userId?: number): Promise<Post[]> {
    const url = userId ? `/posts?userId=${userId}` : '/posts';
    const response = await this.context.get(url);
    return response.json();
  }

  async createPost(post: Omit<Post, 'id'>): Promise<Post> {
    const response = await this.context.post('/posts', { data: post });
    return response.json();
  }

  async updatePost(id: number, post: Partial<Post>): Promise<Post> {
    const response = await this.context.put(`/posts/${id}`, { data: post });
    return response.json();
  }

  async deletePost(id: number): Promise<number> {
    const response = await this.context.delete(`/posts/${id}`);
    return response.status();
  }
}
