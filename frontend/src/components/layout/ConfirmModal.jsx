import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useUIStore from '../../stores/uiStore';

export default function ConfirmModal() {
  const { confirmModalOpen, confirmConfig, closeConfirmModal } = useUIStore();

  if (!confirmModalOpen || !confirmConfig) return null;

  const { title, message, confirmText = 'Onayla', cancelText = 'İptal', type = 'danger', onConfirm } = confirmConfig;

  const handleConfirm = () => {
    onConfirm();
    closeConfirmModal();
  };

  const buttonStyle = type === 'danger' ? { background: 'var(--accent-rose)', color: 'white', border: 'none' } : {};
  const buttonClass = type === 'danger' ? 'btn' : 'btn btn-primary';

  return (
    <AnimatePresence>
      <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeConfirmModal}>
        <motion.div className="modal" style={{ maxWidth: 400 }} initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: 'spring', duration: 0.4 }} onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">{title}</h2>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={closeConfirmModal}><X /></button>
          </div>

          <div className="modal-body">
            {message}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={closeConfirmModal}>{cancelText}</button>
            <button type="button" className={buttonClass} style={buttonStyle} onClick={handleConfirm}>{confirmText}</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
