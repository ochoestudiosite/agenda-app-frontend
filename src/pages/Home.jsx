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

  const businessName = config?.business_name || 'Cita24';
  const businessDesc = config?.business_description;
  const services = servicesData?.data || [];
  const staff = staffData?.data || [];

  return (
    <div className="bg-surface min-h-screen selection:bg-gold selection:text-white">
      {/* Navigation */}
      <LandingNavbar businessName={businessName} />

      <main>
        {/* Hero Section */}
        <LandingHero 
          businessName={businessName} 
          businessDescription={businessDesc} 
        />

        {/* Services Section */}
        <LandingServices services={services} />

        {/* Staff Section */}
        <LandingStaff staff={staff} />

        {/* Testimonials Section */}
        <LandingTestimonials />

        {/* Location & Contact Section */}
        <LandingLocation config={config || {}} />
      </main>

      {/* Footer / Contact */}
      <LandingContact businessName={businessName} />

      {/* Scroll to top decorative indicator */}
      <div className="fixed bottom-10 right-10 pointer-events-none opacity-20">
        <div className="w-px h-24 bg-gradient-to-b from-transparent via-gold to-transparent" />
      </div>
    </div>
  );
}
