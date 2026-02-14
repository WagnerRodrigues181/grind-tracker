/**
 * Mapeamento de imagens das atividades
 */

import pesquisaImg from '../../assets/Pesquisa1.webp';
import estudoTecnicoImg from '../../assets/EstudoTecnico.webp';
import crossfitImg from '../../assets/Crossfit.webp';
import rosarioImg from '../../assets/Rosário.webp';
import leituraImg from '../../assets/Leitura.webp';
import musculacaoImg from '../../assets/Musculação.webp';
import journalImg from '../../assets/Journal.webp';
import sonoImg from '../../assets/Sono.webp';
import corridaImg from '../../assets/Corrida.webp';
import bikeImg from '../../assets/Bike.webp';
import dietaCuttingImg from '../../assets/Dieta (cutting).webp';
import dietaBulkingImg from '../../assets/Dieta (bulking).webp';
import higieneImg from '../../assets/Higiene.webp';

export const ACTIVITY_IMAGES = {
  Pesquisa: pesquisaImg,
  'Estudo Técnico': estudoTecnicoImg,
  Crossfit: crossfitImg,
  'Rosário (Terço)': rosarioImg,
  Leitura: leituraImg,
  Musculação: musculacaoImg,
  Journal: journalImg,
  Sono: sonoImg,
  Corrida: corridaImg,
  'Dieta (cutting)': dietaCuttingImg,
  'Dieta (bulking)': dietaBulkingImg,
  Bike: bikeImg,
  Higiene: higieneImg,
};

/**
 * Retorna a imagem de uma atividade
 */
export function getActivityImage(activityName) {
  return ACTIVITY_IMAGES[activityName] || null;
}
