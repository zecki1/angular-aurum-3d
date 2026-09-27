/**
 * Executa `acao` depois que o Angular aplica o DOM.
 *
 * Por que não basta `focus()` direto: sob `OnPush` + signals, o elemento alvo
 * (um `role="alert"`, o cartão novo de um `radiogroup`) só existe na árvore no
 * ciclo seguinte. Focar antes disso é não-op — e o teste de teclado falha sem
 * dizer por quê.
 *
 * `requestAnimationFrame` é preferível a `setTimeout(…, 0)`: ele roda no mesmo
 * quadro do paint, então o foco não pisca.
 */
export function apósRender(acao: () => void): void {
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(acao);
    return;
  }
  setTimeout(acao, 0);
}
