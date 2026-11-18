import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthErrors, AuthService } from './auth.service';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="login-page" aria-labelledby="page-title">
      <header class="login-heading"><h1 id="page-title">Criar conta</h1><p>Cadastre seu acesso ao Campus Reservas.</p></header>
      <form class="login-card" (submit)="submit($event)" novalidate>
        @for (field of fields; track field.key) {
          <label class="login-field"><span>{{ field.label }}</span>
            <input [name]="field.key" [type]="field.type" [autocomplete]="field.autocomplete" required
              [value]="values()[field.key]" (input)="update(field.key, $event)" />
            @for (message of messages(field.key); track message) { <small class="field-error">{{ message }}</small> }
          </label>
        }
        @for (message of messages('non_field_errors'); track message) { <p class="error-message" role="alert">{{ message }}</p> }
        <button class="btn btn-success w-100" type="submit" [disabled]="submitting()">
          {{ submitting() ? 'Criando…' : 'Criar conta' }}
        </button>
      </form>
      <p class="register-prompt">Já tem acesso? <a routerLink="/login">Entrar</a></p>
    </section>
  `,
  styles: [`
    :host{display:block}.login-page{max-width:34rem;margin:clamp(1rem,5vw,4rem) auto}
    .login-heading{margin-bottom:1.5rem}.login-heading h1{font-size:clamp(1.6rem,4vw,2.2rem)}
    .login-heading p,.register-prompt{color:var(--text-muted)}
    .login-card{display:grid;gap:1rem;padding:clamp(1rem,4vw,1.5rem);border:1px solid var(--border);border-radius:var(--radius);background:var(--surface)}
    .login-field{display:grid;gap:.35rem;color:var(--text-muted);font-size:.85rem}
    .login-field input{min-height:2.8rem;padding:.5rem .7rem;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--text)}
    .field-error,.error-message{color:#a23d35}.register-prompt{margin-top:1.2rem}
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly fields = [
    { key: 'username', label: 'Usuário', type: 'text', autocomplete: 'username' },
    { key: 'email', label: 'E-mail', type: 'email', autocomplete: 'email' },
    { key: 'firstName', label: 'Nome', type: 'text', autocomplete: 'given-name' },
    { key: 'lastName', label: 'Sobrenome', type: 'text', autocomplete: 'family-name' },
    { key: 'password', label: 'Senha', type: 'password', autocomplete: 'new-password' },
    { key: 'passwordConfirmation', label: 'Confirme a senha', type: 'password', autocomplete: 'new-password' },
  ];
  protected readonly values = signal<Record<string, string>>({});
  protected readonly errors = signal<AuthErrors>({});
  protected readonly submitting = signal(false);
  protected update(key: string, event: Event): void {
    this.values.update(values => ({ ...values, [key]: (event.target as HTMLInputElement).value }));
  }
  protected messages(key: string): string[] { return this.errors()[key] ?? []; }
  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    this.submitting.set(true);
    const errors = await this.auth.register(this.values() as Parameters<AuthService['register']>[0]);
    this.submitting.set(false);
    this.errors.set(errors ?? {});
    if (!errors) void this.router.navigateByUrl(this.auth.homePath());
  }
}
