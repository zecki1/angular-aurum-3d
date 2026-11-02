import { ChangeDetectionStrategy, Component } from '@angular/core';

interface Etapa {
  numero: string;
  titulo: string;
  texto: string;
}

/**
 * O percurso de uma peça: do desenho à cravação.
 * Conteúdo editorial fixo — não depende de backend.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  selector: 'app-atelier',
  styleUrl: './atelier.css',
  templateUrl: './atelier.html',
})
export class Atelier {
  readonly etapas: Etapa[] = [
    {
      numero: 'I',
      titulo: 'O croqui',
      texto:
        'Tudo começa com lápis e papel. O desenho é feito no tamanho real, ao lado da mão de quem vai usar — porque joia se desenha no corpo, não na tela.',
    },
    {
      numero: 'II',
      titulo: 'A cera',
      texto:
        'O croqui vira cera, esculpida à mão em escala 1:1. É aqui que o aro ganha o peso certo e o engaste encontra o ângulo exato para a pedra.',
    },
    {
      numero: 'III',
      titulo: 'A fundição',
      texto:
        'A cera é perdida no gesso e o metal entra líquido. Ouro 18k ou platina 950: cada liga pede sua própria temperatura, seu próprio tempo.',
    },
    {
      numero: 'IV',
      titulo: 'A cravação',
      texto:
        'A pedra é assentada garra por garra, sob lupa. Depois vêm o polimento, o banho e a prova final — a peça só sai quando fica silenciosa no dedo.',
    },
  ];
}
