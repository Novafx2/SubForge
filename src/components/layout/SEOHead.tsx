import { useEffect } from 'react';
import { FaqItem } from '../../utils/seoData';

interface SEOHeadProps {
  title: string;
  description: string;
  canonicalPath: string;
  toolCategory?: string;
  faqs?: FaqItem[];
  softwareType?: string;
  noIndex?: boolean;
}

export function SEOHead({
  title,
  description,
  canonicalPath,
  faqs,
  softwareType = 'MultimediaApplication',
  noIndex = false,
}: SEOHeadProps) {
  useEffect(() => {
    // 1. Update Title
    document.title = title;

    // Robots meta tag
    let robotsTag = document.querySelector('meta[name="robots"]');
    if (noIndex) {
      if (!robotsTag) {
        robotsTag = document.createElement('meta');
        robotsTag.setAttribute('name', 'robots');
        document.head.appendChild(robotsTag);
      }
      robotsTag.setAttribute('content', 'noindex, nofollow');
    } else if (robotsTag) {
      robotsTag.setAttribute('content', 'index, follow');
    }

    // 2. Update Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', description);

    // 3. Update Canonical Link
    const fullUrl = `https://subforge.app${canonicalPath}`;
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', fullUrl);

    // 4. Update OpenGraph Tags
    const updateOrCreateMeta = (property: string, content: string) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    updateOrCreateMeta('og:title', title);
    updateOrCreateMeta('og:description', description);
    updateOrCreateMeta('og:url', fullUrl);
    updateOrCreateMeta('og:type', 'website');

    // 5. Update Schema.org JSON-LD structured data
    let scriptTag = document.getElementById('seo-json-ld') as HTMLScriptElement | null;
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = 'seo-json-ld';
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }

    const schemas: any[] = [
      {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: title.split('–')[0].trim(),
        applicationCategory: softwareType,
        operatingSystem: 'All',
        browserRequirements: 'Requires JavaScript. Works offline.',
        url: fullUrl,
        description,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        featureList: [
          '100% Client-Side Processing',
          'Zero Upload to Cloud Servers',
          'Instant Format Conversion',
          'Millisecond Precision',
        ],
      },
    ];

    if (faqs && faqs.length > 0) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: f.answer,
          },
        })),
      });
    }

    scriptTag.text = JSON.stringify(schemas);
  }, [title, description, canonicalPath, faqs, softwareType]);

  return null;
}
