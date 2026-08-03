import { useId, useState } from 'react';
import { Plus } from 'lucide-react';
import { SectionHeader } from './LandingServices';

// ─── Defaults ────────────────────────────────────────────────────────────────
const DEFAULTS = [
  { question: '¿Cómo agendo una cita?', answer: 'Da clic en "Reservar", elige el servicio, la fecha y el horario que prefieras. Recibirás una confirmación al instante por correo o WhatsApp.' },
  { question: '¿Puedo cancelar o reprogramar mi cita?', answer: 'Sí, desde el enlace de confirmación que recibiste puedes cancelar o cambiar tu cita hasta el tiempo límite indicado en tus recordatorios.' },
  { question: '¿Qué métodos de pago aceptan?', answer: 'Aceptamos pago en el establecimiento y, cuando está disponible, pago en línea con tarjeta al momento de reservar.' },
  { question: '¿Necesito crear una cuenta para reservar?', answer: 'No. Puedes reservar como invitado con solo tu nombre, teléfono y correo — no se requiere contraseña.' },
  { question: '¿Qué pasa si llego tarde a mi cita?', answer: 'Te recomendamos llegar unos minutos antes. Si sabes que llegarás tarde, contáctanos directamente para ajustar el horario si es posible.' },
];

// JSON.stringify no escapa "<", así que una respuesta que contenga literalmente
// "</script>" cerraría el tag anfitrión antes de tiempo. < es la mitigación
// estándar (misma técnica que usa Next.js para JSON-LD) — inocua para JSON.parse.
function safeJsonLd(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

function FaqJsonLd({ items }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }}
    />
  );
}

// ─── Item ───────────────────────────────────────────────────────────────────
function FaqItem({ item, isOpen, onToggle, panelId }) {
  return (
    <div className="rounded-[20px] landing-card-shape border border-edge/60 bg-card overflow-hidden transition-colors duration-200 hover:border-edge-strong/50">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="w-full flex items-center justify-between gap-4 text-left px-5 sm:px-6 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:ring-offset-2 focus-visible:ring-offset-card rounded-[20px]"
      >
        <span className="text-[15px] sm:text-base font-semibold text-ink leading-snug">
          {item.question}
        </span>
        <span
          aria-hidden="true"
          className={`shrink-0 w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300 ${
            isOpen ? 'bg-gold border-gold rotate-45' : 'border-edge text-ink-2'
          }`}
        >
          <Plus size={15} strokeWidth={2.4} className={isOpen ? 'text-on-gold' : ''} />
        </span>
      </button>

      {/* grid-template-rows 0fr→1fr anima el alto sin medir scrollHeight — mismo
          enfoque "sin framer-motion" que el resto de la landing (ver LandingLocation). */}
      <div
        id={panelId}
        role="region"
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <p className="px-5 sm:px-6 pb-5 text-[14px] leading-relaxed text-ink-2">
            {item.answer}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────
export default function LandingFAQ({ items = [], title, subtitle, subtitleAccent }) {
  const base = items.length > 0 ? items : DEFAULTS;
  const [openIdx, setOpenIdx] = useState(null);
  const uid = useId();

  return (
    <section id="faq" className="relative py-24 lg:py-32 overflow-hidden bg-surface">
      <div aria-hidden="true" className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-edge to-transparent" />

      <div className="section-container">
        <SectionHeader
          eyebrow={title || 'Preguntas Frecuentes'}
          title={subtitle}
          accent={subtitleAccent}
          fallback={<>Todo lo que necesitas<br /><span className="text-ink-3">saber antes de reservar.</span></>}
        />

        <div className="mt-14 lg:mt-16 max-w-[760px] mx-auto space-y-3">
          {base.map((item, i) => (
            <FaqItem
              key={i}
              item={item}
              panelId={`${uid}-faq-panel-${i}`}
              isOpen={openIdx === i}
              onToggle={() => setOpenIdx(openIdx === i ? null : i)}
            />
          ))}
        </div>
      </div>

      <FaqJsonLd items={base} />
    </section>
  );
}
