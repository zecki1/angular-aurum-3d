import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

const ID_ANUNCIO = 'aurum-anuncio';

/**
 * Live region única para a página (WCAG 4.1.3 — Status Messages).
 *
 * Por que um serviço e não `aria-live` espalhado no template:
 * leitores de tela só anunciam uma live region **se o texto mudar depois** que a
 * region já está na árvore. Criar a region no primeiro `anunciar()` faz o
 * primeiro aviso se perder em boa parte dos leitores — por isso ela é criada
 * no construtor do app e reutilizada para todos os avisos.
 */
@Injectable({ providedIn: 'root' })
export class AnunciadorService {
  private readonly doc = inject(DOCUMENT);
  private readonly polite = this.criar('polite');
  private readonly assertive = this.criar('assertive');
  private contador = 0;

  /** Aviso que pode esperar a fim da fala atual (ex.: "Fonte: 18 pixels"). */
  anunciar(mensagem: string): void {
    this.escrever(this.polite, mensagem);
  }

  /** Aviso urgente (ex.: "E-mail inválido"). */
  anunciarUrgente(mensagem: string): void {
    this.escrever(this.assertive, mensagem);
  }

  private escrever(alvo: HTMLElement, mensagem: string): void {
    if (!mensagem) return;
    // Sem isto, repetir a mesma string (ex.: "Fonte: 18 pixels" duas vezes) não
    // gera mutação e o leitor de tela não anuncia de novo. O espaço de largura
    // zero alterna invisivelmente para forçar a mudança de `textContent`.
    this.contador++;
    alvo.textContent = this.contador % 2 === 0 ? mensagem : `${mensagem}\u200B`;
  }


  /**
   * Reaproveita a region se ela já existir. Duas instâncias do serviço (HMR,
   * injetor de teste, `bootstrap` repetido) criariam dois elementos com o mesmo
   * `id` — HTML inválido, e o leitor de tela leria só um deles.
   */
  private criar(politica: 'polite' | 'assertive'): HTMLElement {
    const id = `${ID_ANUNCIO}-${politica}`;
    const existente = this.doc.getElementById(id);
    if (existente) return existente;

    const regiao = this.doc.createElement('div');
    regiao.id = id;
    regiao.setAttribute('role', 'status');
    regiao.setAttribute('aria-live', politica);
    regiao.setAttribute('aria-atomic', 'true');
    regiao.className = 'sr-only';
    this.doc.body.appendChild(regiao);
    return regiao;
  }
}
