import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, firstValueFrom, of } from 'rxjs';

export type UserProfile = 'solicitante' | 'responsavel' | 'administrador';

export interface AuthUser {
  readonly id: number;
  readonly username: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly profile: UserProfile;
}

export type AuthErrors = Record<string, string[]>;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  readonly user = signal<AuthUser | null>(null);
  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly profileLabel = computed(() => {
    switch (this.user()?.profile) {
      case 'responsavel': return 'Responsável';
      case 'administrador': return 'Administrador';
      case 'solicitante': return 'Solicitante';
      default: return 'Visitante';
    }
  });
  readonly homePath = computed(() => this.user()?.profile === 'responsavel'
    ? '/gestao' : this.user()?.profile === 'administrador' ? '/admin' : '/minhas-reservas');
  readonly loading = signal(true);

  async initialize(): Promise<void> {
    try {
      await firstValueFrom(this.http.get('/api/csrf/'));
      this.user.set(await firstValueFrom(this.http.get<AuthUser>('/api/auth/me/').pipe(
        catchError(() => of(null)),
      )));
    } catch {
      this.user.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  async login(username: string, password: string): Promise<AuthErrors | null> {
    try {
      this.user.set(await firstValueFrom(this.http.post<AuthUser>('/api/auth/login/', { username, password })));
      return null;
    } catch (error) {
      return this.readErrors(error);
    }
  }

  async register(payload: {
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    passwordConfirmation: string;
  }): Promise<AuthErrors | null> {
    try {
      this.user.set(await firstValueFrom(this.http.post<AuthUser>('/api/auth/cadastro/', payload)));
      return null;
    } catch (error) {
      return this.readErrors(error);
    }
  }

  async logout(): Promise<void> {
    await firstValueFrom(this.http.post<void>('/api/auth/logout/', {}));
    this.user.set(null);
    await this.router.navigateByUrl('/login');
  }

  private readErrors(error: unknown): AuthErrors {
    if (error instanceof HttpErrorResponse && error.error && typeof error.error === 'object') {
      return error.error as AuthErrors;
    }
    return { non_field_errors: ['Não foi possível conectar à API. Tente novamente.'] };
  }
}
