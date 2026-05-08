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
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const businessName = config?.business_name || 'Cita24';
  const businessConfig = previewConfig || config?.landing_config || {};
  const services = servicesData?.data || [];
  const staff = staffData?.data || [];

  return (
    <div className="bg-surface min-h-screen selection:bg-gold selection:text-white">
      {/* Navigation */}
      <LandingNavbar businessName={businessName} />

      <main>
        {/* Hero Section */}
        <LandingHero 
          title={businessConfig.hero?.title || businessName}
          subtitle={businessConfig.hero?.subtitle || config?.business_description}
          cta={businessConfig.hero?.cta_text}
        />

        {/* Services Section */}
        {(businessConfig.services_section?.visible !== false) && (
          <LandingServices services={services} title={businessConfig.services_section?.title} subtitle={businessConfig.services_section?.subtitle} />
        )}

        {/* Staff Section */}
        {(businessConfig.staff_section?.visible !== false) && (
          <LandingStaff staff={staff} title={businessConfig.staff_section?.title} subtitle={businessConfig.staff_section?.subtitle} />
        )}

        {/* Testimonials Section */}
        {(businessConfig.testimonials_section?.visible !== false) && (
          <LandingTestimonials items={businessConfig.testimonials} />
        )}

        {/* Location & Contact Section */}
        {(businessConfig.location_section?.visible !== false) && (
          <LandingLocation config={config || {}} title={businessConfig.location_section?.title} subtitle={businessConfig.location_section?.subtitle} />
        )}
      </main>

      {/* Footer / Contact */}
      <LandingContact 
        businessName={businessName} 
        socials={businessConfig.contact_section}
      />

      {/* Scroll to top decorative indicator */}
      <div className="fixed bottom-10 right-10 pointer-events-none opacity-20">
        <div className="w-px h-24 bg-gradient-to-b from-transparent via-gold to-transparent" />
      </div>
    </div>
  );
}
