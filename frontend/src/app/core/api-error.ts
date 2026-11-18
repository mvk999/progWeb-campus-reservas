import { HttpErrorResponse } from '@angular/common/http';

export function apiErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
    if (error.status === 401) return 'Entre na sua conta para consultar estes dados.';
    if (error.status === 403) return 'Sua conta não tem permissão para acessar estes dados.';
    if (error.status === 404) return 'O registro solicitado não foi encontrado ou não está mais disponível.';
    const body = error.error as Record<string, unknown> | null;
    if (body && typeof body === 'object') {
      const detail = body['detail'];
      if (typeof detail === 'string') return detail;
      const messages = Object.values(body).flatMap(value => Array.isArray(value) ? value.filter(item => typeof item === 'string') : typeof value === 'string' ? [value] : []);
      if (messages.length) return messages.join(' ');
    }
    if (error.status >= 500) return 'O servidor encontrou um problema. Tente novamente em alguns instantes.';
  }
  return 'Não foi possível carregar os dados. Tente novamente.';
}

export function loginRequired(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 401;
}
