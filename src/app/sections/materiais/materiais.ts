import { ChangeDetectionStrategy, Component } from '@angular/core';

interface Materia {
  nome: string;
  detalhe: string;
  texto: string;
}

/** Matéria-prima da Maison: ligas e pedras. Conteúdo editorial fixo. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  selector: 'app-materiais',
  styleUrl: './materiais.css',
  templateUrl: './materiais.html',
})
export class Materiais {
  readonly materias: Materia[] = [
    {
      nome: 'Ouro 18k',
      detalhe: 'Au 750 · 75% de ouro puro',
      texto:
        'Amarelo, branco ou rosa: a mesma pureza, ligas diferentes. O ouro 18k é o ponto em que a joia ainda é ouro de verdade e já tem dureza para durar décadas.',
    },
    {
      nome: 'Platina 950',
      detalhe: 'Pt 950 · 95% de platina',
      texto:
        'Densa, branca e hipoalergênica. A platina não desbota nem amarela com o tempo — envelhece ganhando um brilho acetinado, como pedra polida por água.',
    },
    {
      nome: 'Diamantes',
      detalhe: 'Certificados · VS1 ou superior',
      texto:
        'Cada pedra acima de 0,30 ct chega com certificado de pureza e lapidação. Escolhemos a olho, sob luz neutra, antes de qualquer cravação.',
    },
  ];
}
