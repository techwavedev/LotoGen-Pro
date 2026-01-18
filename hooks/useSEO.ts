import { useEffect } from 'react';
import { LotteryDefinition } from '../types';

interface SEOProps {
  lottery: LotteryDefinition;
}

/**
 * Hook to dynamically update <title> and <meta> tags for SEO.
 * Since react-helmet-async is not compatible with React 19,
 * we manually update DOM elements.
 */
export function useSEO({ lottery }: SEOProps) {
  useEffect(() => {
    // Update title
    const baseTitle = 'LotoGen Pro';
    const lotteryName = lottery.name;
    document.title = `${lotteryName} - Gerador de Números | ${baseTitle}`;

    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        'content',
        `Gerador inteligente de números para ${lotteryName}. Análise estatística avançada, filtros otimizados e fechamentos combinatórios para loterias brasileiras. 100% grátis e sem anúncios!`
      );
    }

    // Update OG title
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute('content', `${lotteryName} - Gerador LotoGen Pro`);
    }

    // Update OG description
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) {
      ogDescription.setAttribute(
        'content',
        `Gere jogos otimizados para ${lotteryName} com análise estatística e matemática avançadas.`
      );
    }

    // Update canonical URL with query param for deep linking
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute('href', `https://lotogen.n2flow.tech/?game=${lottery.id}`);
    }

  }, [lottery.id, lottery.name]);
}
