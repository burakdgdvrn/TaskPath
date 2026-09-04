import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Map, GitBranch, Sparkles, MessageCircle } from 'lucide-react';
import useUIStore from '../../stores/uiStore';

const SLIDES = [
  {
    id: 'welcome',
    icon: <Map size={48} className="text-emerald-400" />,
    title: 'Vizyona Hoş Geldiniz',
    desc: 'TaskPath, projelerinizi karmaşık listelerden kurtararak görsel ve dinamik bir yol haritasına (DAG) dönüştürür. Bilgisayarınızda ve mobil cihazlarınızda kesintisiz, profesyonel bir proje yönetim deneyimine hazır olun.'
  },
  {
    id: 'drawing',
    icon: <GitBranch size={48} className="text-violet-400" />,
    title: 'Esnek Mimari ve Bağlantılar',
    desc: 'Haritanızı [Başlangıç] düğümleriyle başlatıp, [Milestone] ile fazlara ayırın ve [Görev] düğümleriyle detaylandırın. Masaüstü veya mobilde, düğümlerin kenarlarındaki bağlantı noktalarını (handle) birbirine sürükleyerek bağımlılıkları kolayca oluşturabilirsiniz.'
  },
  {
    id: 'ai',
    icon: <Sparkles size={48} className="text-amber-400" />,
    title: 'Yapay Zeka Destekli Planlama',
    desc: 'Büyük projeleri sıfırdan çizmek yerine "Sihirli Asa" aracımızı kullanın. Akıllı sihirbazımız, projenize en uygun komutu (Prompt) üretir. Bu komutu favori yapay zekanıza (ChatGPT, Claude) verin ve ürettiği şemayı sistemimize yapıştırarak haritanızı anında inşa edin.'
  },
  {
    id: 'team',
    icon: <MessageCircle size={48} className="text-blue-400" />,
    title: 'Gelişmiş Ekip İletişimi',
    desc: 'TaskPath, merkezi bir iletişim platformudur. İsterseniz bir görevin içine girip sadece o göreve özel tartışmalar başlatabilir, isterseniz de sol menü üzerinden ekibinizle anlık mesajlaşabilirsiniz.'
  }
];

export default function OnboardingModal({ isOpen, onClose }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const slide = SLIDES[currentSlide];

  return (
    <div className="onboarding-container">
      {/* Premium Overlay with blur */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="onboarding-overlay"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 30 }}
        transition={{ type: 'spring', damping: 30, stiffness: 400 }}
        className="onboarding-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Background Glows */}
        <div className="onboarding-glows">
          <div className="onboarding-glow onboarding-glow-violet" />
          <div className="onboarding-glow onboarding-glow-emerald" />
        </div>

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="onboarding-close"
        >
          <X size={20} />
        </button>

        {/* Content Area */}
        <div className="onboarding-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="onboarding-slide"
            >
              {/* Icon Container with Glassmorphism */}
              <div className="onboarding-icon-wrapper">
                <div className="onboarding-icon-blur" />
                <div className="onboarding-icon-glass">
                  {slide.icon}
                </div>
              </div>
              
              <h2 className="onboarding-title">
                {slide.title}
              </h2>
              
              <p className="onboarding-desc">
                {slide.desc}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Controls */}
        <div className="onboarding-footer">
          {/* Progress Indicators */}
          <div className="onboarding-progress">
            {SLIDES.map((_, idx) => (
              <div 
                key={idx}
                className={`onboarding-indicator ${idx === currentSlide ? 'active' : ''}`}
              />
            ))}
          </div>

          {/* Nav Buttons */}
          <div className="onboarding-nav">
            {currentSlide > 0 && (
              <button 
                onClick={handlePrev}
                className="onboarding-btn-prev"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <button 
              onClick={handleNext}
              className="onboarding-btn-next"
            >
              {currentSlide === SLIDES.length - 1 ? 'Başla' : 'İleri'}
              {currentSlide !== SLIDES.length - 1 && <ChevronRight size={18} strokeWidth={2.5} />}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
