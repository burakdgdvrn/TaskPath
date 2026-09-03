import React, { useState } from 'react';
import { X, Wand2, ArrowRight, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import dagre from 'dagre';
import { jsonrepair } from 'jsonrepair';
import { apiImportRoadmap } from '../../services/api';

const PROMPT_TEMPLATE = `Sen dünya çapında tecrübeli bir Senior Yazılım Mimarı ve Agile Proje Yöneticisisin. 
Bize [PROJE KONUNUZU YAZIN] projesi için çok kapsamlı, gerçek hayat senaryosuna uygun bir yol haritası (roadmap) hazırla.

SİSTEMİN ÇALIŞMA MANTIĞI:
Bize çıktıyı KESİNLİKLE sadece aşağıdaki JSON şemasına uygun olarak vermelisin. Çıktın doğrudan sistemimiz tarafından okunup bir Directed Acyclic Graph (DAG) olarak çizilecek.

KURALLAR:
1. En az 30-40 görevden oluşan çok kapsamlı bir plan çıkar. Güvenlik, test, veritabanı, frontend, backend, devops, dokümantasyon gibi detayları atlama.
2. Paralel İş Akışı: Aynı anda yapılabilecek işleri (örneğin tasarım yapılırken veritabanı şemasının çizilmesi) paralel ilerlet. Bunun için "edges" kısmında bir hedeften birden fazla göreve ok çıkar ve sonraki fazda bunları tekrar tek bir hedefte (örneğin bir test veya entegrasyon noktası) birleştir.
3. HÜCRE TÜRLERİ (node_type): Sadece şu 5 değerden birini kullan: "startNode", "milestoneNode", "wikiNode", "taskNode", "endNode".
4. ÖNCELİK (priority): "low", "medium", "high"
5. ID DEĞERLERİ: Her node için "id" kesinlikle benzersiz (unique) olmalıdır (örn: "n1", "n2", "task_db_1" vb.).

Örnek Şema:
\`\`\`json
{
  "nodes": [
    { "id": "start", "label": "Proje Başlangıcı", "node_type": "startNode", "priority": "high", "description": "Gereksinimlerin toplanması", "tags": "Analiz" },
    { "id": "m1", "label": "Faz 1: Mimari", "node_type": "milestoneNode", "priority": "high", "description": "", "tags": "" },
    { "id": "t1", "label": "Veritabanı Tasarımı", "node_type": "taskNode", "priority": "medium", "description": "Tabloların oluşturulması", "tags": "Backend" },
    { "id": "t2", "label": "UI/UX Tasarımı", "node_type": "taskNode", "priority": "medium", "description": "Figma ekranları", "tags": "Tasarım" },
    { "id": "m2", "label": "Faz 2: Geliştirme", "node_type": "milestoneNode", "priority": "high", "description": "", "tags": "" }
  ],
  "edges": [
    { "source": "start", "target": "m1" },
    { "source": "m1", "target": "t1" },
    { "source": "m1", "target": "t2" },
    { "source": "t1", "target": "m2" },
    { "source": "t2", "target": "m2" }
  ]
}
\`\`\`
Sadece \`\`\`json ... \`\`\` bloğunu döndür. Başka bir açıklama yapma.`;

const parseJSON = (text) => {
  // Extract JSON block using Regex
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  let rawJson = jsonMatch ? jsonMatch[1] : text;

  let parsedData;
  try {
    parsedData = JSON.parse(rawJson);
  } catch (err) {
    try {
      // Defensive 1: jsonrepair integration
      const repaired = jsonrepair(rawJson);
      parsedData = JSON.parse(repaired);
    } catch (repairErr) {
      throw new Error('Geçersiz JSON formatı. Lütfen AI çıktısını kontrol edip eksik parantezleri düzeltin.');
    }
  }

  if (!parsedData || !parsedData.nodes || !parsedData.edges) {
    throw new Error('JSON içerisinde "nodes" ve "edges" dizileri bulunamadı.');
  }

  const validTypes = ['startNode', 'endNode', 'milestoneNode', 'wikiNode', 'taskNode'];
  const uniqueIds = new Set();
  const duplicateWarnings = [];
  
  const nodes = parsedData.nodes.map(n => {
    // Defensive 2: Duplicate ID prevention
    let safeId = n.id;
    if (uniqueIds.has(safeId)) {
      safeId = `${safeId}_copy_${Math.floor(Math.random() * 1000)}`;
      duplicateWarnings.push(n.id);
    }
    uniqueIds.add(safeId);

    // Defensive 3: Node type validation
    let safeType = n.node_type;
    if (!validTypes.includes(safeType)) {
      safeType = 'taskNode'; // Fallback
    }

    return {
      id: safeId,
      label: n.label || 'İsimsiz Görev',
      description: n.description || '',
      priority: ['low', 'medium', 'high'].includes(n.priority) ? n.priority : 'medium',
      tags: n.tags || '',
      node_type: safeType
    };
  });

  if (duplicateWarnings.length > 0) {
    toast.warn(`Yapay zeka bazı ID'leri tekrar etmiş. Sistemi korumak için ${duplicateWarnings.length} ID onarıldı.`);
  }

  const edges = parsedData.edges.map(e => ({
    source_id: e.source,
    target_id: e.target,
    edge_type: 'depends_on'
  })).filter(e => uniqueIds.has(e.source_id) && uniqueIds.has(e.target_id));

  return { nodes, edges };
};

const applyDagreLayout = (nodes, edges) => {
  const g = new dagre.graphlib.Graph();
  // LR means Left-to-Right (Horizontal tree)
  g.setGraph({ rankdir: 'LR', nodesep: 50, ranksep: 200 });
  g.setDefaultEdgeLabel(() => ({}));
  
  nodes.forEach(n => {
    g.setNode(n.id, { width: 300, height: 100 });
  });
  
  edges.forEach(e => {
    g.setEdge(e.source_id, e.target_id);
  });
  
  dagre.layout(g);
  
  return nodes.map(n => {
    const nodeWithPos = g.node(n.id);
    return {
      ...n,
      position_x: nodeWithPos ? nodeWithPos.x - 150 : 0,
      position_y: nodeWithPos ? nodeWithPos.y - 50 : 0
    };
  });
};

export default function RoadmapImportModal({ isOpen, onClose, boardId }) {
  const [text, setText] = useState('');
  const [step, setStep] = useState(1); // 1: Input, 2: Preview
  const [previewData, setPreviewData] = useState({ nodes: [], edges: [] });
  const [isImporting, setIsImporting] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(PROMPT_TEMPLATE);
    setCopied(true);
    toast.success('Komut kopyalandı!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNext = () => {
    try {
      const { nodes, edges } = parseJSON(text);
      
      if (nodes.length === 0) {
        toast.error('JSON içerisinde geçerli düğüm (node) bulunamadı.');
        return;
      }
      
      if (nodes.length > 250) {
        toast.error('V1 sürümü için maksimum 250 görev içe aktarabilirsiniz. Lütfen listenizi bölün.');
        return;
      }

      const layoutedNodes = applyDagreLayout(nodes, edges);
      setPreviewData({ nodes: layoutedNodes, edges });
      setStep(2);
    } catch (err) {
      toast.error(err.message || 'Bir hata oluştu. Lütfen formatı kontrol edin.');
    }
  };

  const handleImport = async () => {
    try {
      setIsImporting(true);
      await apiImportRoadmap(boardId, {
        nodes: previewData.nodes,
        edges: previewData.edges
      });
      toast.success('Yol haritası başarıyla içe aktarıldı!');
      setText('');
      setStep(1);
      onClose();
    } catch (err) {
      toast.error(err.message || 'İçe aktarma sırasında bir hata oluştu.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        className="modal-overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        <motion.div 
          className="modal"
          initial={{ y: 20, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.95 }}
          style={{ maxWidth: '600px', width: '90%' }}
        >
          <div className="modal-header">
            <div className="modal-title" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <Wand2 size={20} style={{color: 'var(--accent-violet)'}} /> 
              Sihirli Yol Haritası (JSON)
            </div>
            <button onClick={onClose} className="btn-icon btn-ghost"><X size={20}/></button>
          </div>

          <div className="modal-body">
            {step === 1 ? (
              <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                <p style={{fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.5'}}>
                  ChatGPT, Claude veya Gemini'ye projenizi anlatıp <strong>kesin bir formatta</strong> yanıt almak için aşağıdaki komutu kullanın. Ardından size verdiği JSON listesini kopyalayıp aşağıdaki kutuya yapıştırın.
                </p>
                
                <div style={{
                  background: '#1e1e1e', // Her zaman koyu tema kod bloğu görünümü
                  border: '1px solid #333',
                  borderRadius: '8px', 
                  overflow: 'hidden',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }}>
                  <div style={{
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '8px 12px',
                    background: '#2d2d2d',
                    borderBottom: '1px solid #444'
                  }}>
                    <div style={{fontSize: '11px', color: '#a3a3a3', fontWeight: '600', letterSpacing: '0.5px'}}>
                      LLM PROMPT (KOPYALA)
                    </div>
                    <button 
                      onClick={handleCopy}
                      style={{
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '4px',
                        color: copied ? '#4ade80' : '#d4d4d8', fontSize: '12px',
                        padding: '4px 8px', borderRadius: '4px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#3f3f46'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {copied ? <Check size={14}/> : <Copy size={14}/>}
                      {copied ? 'Kopyalandı' : 'Kopyala'}
                    </button>
                  </div>
                  
                  <div style={{
                    padding: '16px',
                    maxHeight: '200px',
                    overflowY: 'auto'
                  }}>
                    <pre style={{
                      margin: 0,
                      fontSize: '12px', 
                      color: '#e4e4e7', 
                      fontFamily: 'JetBrains Mono, Fira Code, monospace',
                      whiteSpace: 'pre-wrap',
                      lineHeight: '1.6'
                    }}>
                      {PROMPT_TEMPLATE}
                    </pre>
                  </div>
                </div>

                <div style={{fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '8px'}}>
                  LLM'in Ürettiği JSON Kodunu Buraya Yapıştırın:
                </div>
                <textarea 
                  className="input"
                  style={{
                    minHeight: '200px', 
                    resize: 'vertical', 
                    fontFamily: 'monospace', 
                    fontSize: '13px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-default)',
                  }}
                  placeholder='{&#10;  "nodes": [...],&#10;  "edges": [...]&#10;}'
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </div>
            ) : (
              <div style={{display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center', padding: '24px 0'}}>
                <div style={{textAlign: 'center'}}>
                  <h3 style={{margin: '0 0 8px 0', color: 'var(--text-primary)'}}>Önizleme Özeti</h3>
                  <p style={{margin: 0, color: 'var(--text-muted)', fontSize: '14px'}}>
                    Haritanız oluşturulmaya hazır.
                  </p>
                </div>
                
                <div style={{display: 'flex', gap: '32px'}}>
                  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'}}>
                    <div style={{fontSize: '36px', fontWeight: 'bold', color: 'var(--accent-teal)'}}>
                      {previewData.nodes.length}
                    </div>
                    <div style={{fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px'}}>Görev</div>
                  </div>
                  
                  <div style={{width: '1px', background: 'var(--border)'}}></div>
                  
                  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'}}>
                    <div style={{fontSize: '36px', fontWeight: 'bold', color: 'var(--accent-violet)'}}>
                      {previewData.edges.length}
                    </div>
                    <div style={{fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px'}}>Bağlantı</div>
                  </div>
                </div>
                
                <div style={{fontSize: '13px', color: 'var(--text-primary)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', padding: '12px', borderRadius: '8px', textAlign: 'center', lineHeight: '1.5'}}>
                  Tüm görevler birbirinin üzerine binmeyecek şekilde otomatik olarak hizalandı.<br/>Onayladığınızda çalışma alanınıza eklenecektir.
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer" style={{display: 'flex', justifyContent: 'space-between'}}>
            {step === 2 ? (
              <button onClick={() => setStep(1)} className="btn btn-ghost">Geri Dön</button>
            ) : (
              <div></div>
            )}
            
            {step === 1 ? (
              <button 
                onClick={handleNext} 
                className="btn btn-primary"
                disabled={!text.trim()}
              >
                İleri <ArrowRight size={16} style={{marginLeft: '4px'}}/>
              </button>
            ) : (
              <button 
                onClick={handleImport} 
                className="btn btn-primary"
                disabled={isImporting}
              >
                {isImporting ? 'Oluşturuluyor...' : 'Haritayı Oluştur'}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
