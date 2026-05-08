import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import LandingNavbar from '../components/landing/LandingNavbar';
import LandingHero from '../components/landing/LandingHero';
import LandingServices from '../components/landing/LandingServices';
import LandingStaff from '../components/landing/LandingStaff';
import LandingTestimonials from '../components/landing/LandingTestimonials';
import LandingLocation from '../components/landing/LandingLocation';
import LandingContact from '../components/landing/LandingContact';

export default function Home() {
  const { data: config } = useQuery({ 
    queryKey: ['config'], 
    queryFn: api.getConfig 
  });

  const { data: servicesData } = useQuery({ 
    queryKey: ['services'], 
    queryFn: api.getServices 
  });

  const { data: staffData } = useQuery({ 
    queryKey: ['specialists'], 
    queryFn: api.getSpecialists 
  });

  const [previewConfig, setPreviewConfig] = useState(null);

  // Listen for live preview updates from admin dashboard
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === 'LANDING_PREVIEW') {
        setPreviewConfig(event.data.config);
      }
    };
    window.addEventListener('message', handleMessage);
    
    // Notify parent that we are ready to receive preview data
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'LANDING_READY' }, '*');
    }

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const businessName = config?.business_name || 'Cita24';
  
  // Robust parsing of landing_config
  let savedConfig = config?.landing || config?.landing_config || {};
  if (typeof savedConfig === 'string') {
    try { savedConfig = JSON.parse(savedConfig); } catch { savedConfig = {}; }
  }

  const bc = previewConfig || savedConfig;
  const services = servicesData?.services || servicesData?.data || [];
  const staff = staffData?.specialists || staffData?.data || [];

  return (
    <div className="min-h-screen bg-surface selection:bg-gold/30 selection:text-ink">
      <LandingNavbar 
        businessName={businessName} 
        config={bc} 
      />

      <main>
        <LandingHero 
          title={bc.hero?.title}
          subtitle={bc.hero?.subtitle}
          cta={bc.hero?.cta_text}
          secondaryCta={bc.hero?.secondary_cta_text}
          features={bc.hero?.features}
          showFeatures={bc.hero?.show_features}
        />

        {(bc.services_section?.visible !== false) && (
          <LandingServices 
            services={services} 
            customServices={bc.services_section?.custom_items}
            useCustom={bc.services_section?.use_custom === true}
            title={bc.services_section?.title}
            subtitle={bc.services_section?.subtitle}
            buttonText={bc.services_section?.button_text}
            linkText={bc.services_section?.link_text}
          />
        )}

        {(bc.staff_section?.visible !== false) && (
          <LandingStaff 
            staff={staff} 
            customStaff={bc.staff_section?.custom_items}
            useCustom={bc.staff_section?.use_custom === true}
            title={bc.staff_section?.title}
            subtitle={bc.staff_section?.subtitle}
          />
        )}

        {(bc.testimonials_section?.visible !== false) && (
          <LandingTestimonials 
            items={bc.testimonials} 
            title={bc.testimonials_section?.title}
            subtitle={bc.testimonials_section?.subtitle}
          />
        )}

        {(bc.location_section?.visible !== false) && (
          <LandingLocation 
            config={config || {}} 
            locationConfig={bc.location_section || {}}
            title={bc.location_section?.title}
            subtitle={bc.location_section?.subtitle} 
          />
        )}
      </main>

      <LandingContact 
        businessName={bc.navbar?.business_name || businessName} 
        socials={bc.contact_section}
        config={bc}
      />

      <div className="fixed bottom-10 right-10 pointer-events-none opacity-20">
        <div className="w-px h-24 bg-gradient-to-b from-transparent via-gold to-transparent" />
      </div>
    </div>
  );
}
