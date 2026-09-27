import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AnunciadorService } from '../../core/anunciador.service';
import { apósRender } from '../../core/apos-render';
import { CampoLead, LeadService } from '../../core/lead.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  selector: 'app-lead-capture',
  styleUrl: './lead-capture.css',
  templateUrl: './lead-capture.html',
})
export class LeadCapture {
  private readonly leads = inject(LeadService);
  private readonly anunciador = inject(AnunciadorService);

  private readonly campoNome = viewChild.required<ElementRef<HTMLInputElement>>('leadsNome');
  private readonly campoEmail = viewChild.required<ElementRef<HTMLInputElement>>('leadsEmail');
  private readonly sucesso = viewChild<ElementRef<HTMLElement>>('leadsSucesso');
  private readonly resumoErro = viewChild<ElementRef<HTMLElement>>('leadsErro');

  readonly nome = signal('');
  readonly email = signal('');
  readonly enviando = signal(false);
  readonly enviado = signal(false);
  readonly erro = signal('');
  /** Campo culpado pelo erro — dirige `aria-invalid` e o foco. */
  readonly campoComErro = signal<CampoLead | null>(null);

  readonly nomeInvalido = computed(() => this.campoComErro() === 'nome');
  readonly emailInvalido = computed(() => this.campoComErro() === 'email');

  async enviar(): Promise<void> {
    if (this.enviando()) return;
    this.enviando.set(true);
    this.erro.set('');
    this.campoComErro.set(null);

    const resultado = await this.leads.cadastrar({ nome: this.nome(), email: this.email() });

    this.enviando.set(false);
    if (!resultado.ok) {
      this.erro.set(resultado.mensagem ?? 'Algo deu errado. Tente de novo.');
      this.campoComErro.set(resultado.campo ?? 'formulario');
      this.anunciador.anunciarUrgente(resultado.mensagem ?? 'Erro no envio do formulário.');
      this.focarProblema(resultado.campo);
      return;
    }

    this.enviado.set(true);
    this.nome.set('');
    this.email.set('');
    // Sem mover o foco, quem envia só ouve um "status" e não sabe o que houve.
    apósRender(() => this.sucesso()?.nativeElement.focus());
  }

  /** Limpa o erro do campo assim que o usuário corrige. */
  aoEditar(campo: 'nome' | 'email'): void {
    if (this.campoComErro() === campo) {
      this.campoComErro.set(null);
      this.erro.set('');
    }
  }

  private focarProblema(campo: CampoLead | undefined): void {
    apósRender(() => {
      if (campo === 'nome') this.campoNome().nativeElement.focus();
      else if (campo === 'email') this.campoEmail().nativeElement.focus();
      else this.resumoErro()?.nativeElement.focus();
    });
  }
}


