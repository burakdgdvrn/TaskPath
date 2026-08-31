import React, { useState } from 'react';
import { X, Wand2, ArrowRight, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import dagre from 'dagre';
import { apiImportRoadmap } from '../../services/api';

const PROMPT_TEMPLATE = `Sen bir sistem mimarısın. Bize [PROJE KONUNUZU YAZIN] projesi için bir yol haritası (roadmap) hazırla.
Çıktın, bizim özel sistemimiz tarafından otomatik olarak bir Akış Şemasına (Flowchart) dönüştürülecektir. 

SİSTEMİN ÇALIŞMA MANTIĞI (Ağaç Yapısı & Oklar):
1. Sistemimiz, Markdown listesindeki girintileri (indentation) okuyarak oklar (bağlantılar) çizer. KESİNLİKLE her girinti için tam 4 boşluk (space) kullan.
2. **Sıralı Akış (Soldan Sağa):** Bir görevin, diğerinden SONRA gelmesini istiyorsan onu bir eskisinin ALTINA (4 boşluk içeriye) yazmalısın. (Örn: A'nın içine B'yi, B'nin içine C'yi yazarsan A -> B -> C şeklinde soldan sağa zincir oluşur).
3. **Paralel Akış (Aynı Anda):** Görevlerin aynı anda (alt alta) yapılmasını istiyorsan onları AYNI HİZADA yazmalısın.

HÜCRE TÜRLERİ (Başına köşeli parantez ile yazılır):
- \`[Start]\`: Haritanın başlangıç noktasıdır. En üstte 0 girintiyle sadece 1 tane olmalıdır.
- \`[Milestone]\`: Ana aşamalar ve dönüm noktalarıdır. Projenin büyük fazlarını temsil eder.
- \`[Wiki]\`: O aşamanın kuralları, notları veya referans bilgileridir. Daima bilgi vermek için kullanılır.
- \`[End]\`: Sürecin sonudur. En derin girintiye sahip son hücre olmalıdır.
- \`Standart Görev\`: Başına tür yazılmayan her şey, yapılması gereken standart iş parçalarıdır.

METADATA (İsteğe Bağlı):
Görevlerin sonuna veya başına \`[Etiket:Tasarım]\`, \`[Öncelik:Yüksek]\` gibi etiketler ekleyebilirsin. Kısa açıklamaları (:) sonrasına yaz.

DOĞRU BİR ZİNCİRLEME ÖRNEĞİ (Görevler birbirini bekler):
\`\`\`markdown
- [Start] Proje Lansmanı: Sistemin başlatılması
    - [Milestone] Faz 1: Analiz ve Tasarım
        - [Wiki] Tasarım Kuralları: Renk paletleri ve yazı tipleri
        - Müşteri Görüşmesi: İhtiyaçların alınması
            - Telif Hakları İncelemesi: Hukuki sürecin kontrolü
                - [Milestone] [Öncelik:Yüksek] Faz 2: Geliştirme
                    - Veritabanı Kurulumu: Tabloların oluşturulması
                        - API Entegrasyonu: Sunucu bağlantıları
                            - [End] Canlıya Alma: Sistem yayını
\`\`\``;

const parseMarkdown = (text) => {
  const lines = text.split('\n');
  const nodes = [];
  const edges = [];
  
  // Normalize tabs to 4 spaces
  const normalizedLines = lines.map(line => line.replace(/\t/g, '    '));
  
  let currentId = 1;
  const stack = []; // stores { level, id }
  
  for (let line of normalizedLines) {
    if (!line.trim()) continue;
    
    const headingMatch = line.match(/^(#+)\s+(.*)/);
    let rawLevel, content;
    
    if (headingMatch) {
      rawLevel = (headingMatch[1].length - 1) * 4; // # is level 0, ## is level 4 (equivalent to 1 indent)
      content = headingMatch[2].trim();
    } else {
      const bulletMatch = line.match(/^(\s*)(?:-|\*)\s+(.*)/);
      if (bulletMatch) {
        rawLevel = bulletMatch[1].length;
        content = bulletMatch[2].trim();
      } else {
        continue; // skip lines that aren't headers or bullets
      }
    }
    
    // Extract metadata
    let cleanContent = content;
    let nodeType = "task";
    let priority = "medium";
    let tags = "";
    let description = "";
    
    // [Start], [End], [Milestone], [Wiki] (Type)
    const typeMatch = cleanContent.match(/^\[([a-zA-Z0-9_]+)\]/);
    if (typeMatch && !typeMatch[1].toLowerCase().includes('etiket') && !typeMatch[1].toLowerCase().includes('öncelik')) {
      const rawType = typeMatch[1].toLowerCase();
      const typeMap = {
        'startnode': 'startNode', 'start': 'startNode',
        'endnode': 'endNode', 'end': 'endNode',
        'milestonenode': 'milestoneNode', 'milestone': 'milestoneNode',
        'wikinode': 'wikiNode', 'wiki': 'wikiNode', 'not': 'wikiNode',
        'tasknode': 'taskNode', 'task': 'taskNode'
      };
      nodeType = typeMap[rawType] || rawType;
      cleanContent = cleanContent.replace(/^\[[a-zA-Z0-9_]+\]/, '').trim();
    }
    
    // [Öncelik:Yüksek]
    const priorityMatch = cleanContent.match(/\[Öncelik:\s*(Düşük|Orta|Yüksek|Low|Medium|High)\]/i);
    if (priorityMatch) {
      const pMap = {
        'düşük': 'low', 'low': 'low',
        'orta': 'medium', 'medium': 'medium',
        'yüksek': 'high', 'high': 'high'
      };
      priority = pMap[priorityMatch[1].toLowerCase()] || 'medium';
      cleanContent = cleanContent.replace(/\[Öncelik:\s*.*?\]/i, '').trim();
    }
    
    // [Etiket:AI,Frontend]
    const tagMatch = cleanContent.match(/\[Etiket:\s*(.*?)\]/i);
    if (tagMatch) {
      tags = tagMatch[1].trim();
      cleanContent = cleanContent.replace(/\[Etiket:\s*.*?\]/i, '').trim();
    }
    
    // Title: Description split
    let label = cleanContent;
    const splitIndex = cleanContent.indexOf(':');
    if (splitIndex !== -1 && splitIndex < 60) {
      label = cleanContent.substring(0, splitIndex).trim();
      description = cleanContent.substring(splitIndex + 1).trim();
    }

    const id = `temp-${currentId++}`;
    nodes.push({ id, label, description, priority, tags, node_type: nodeType });
    
    while (stack.length > 0 && stack[stack.length - 1].level >= rawLevel) {
      stack.pop();
    }
    
    if (stack.length > 0) {
      edges.push({
        source_id: stack[stack.length - 1].id,
        target_id: id,
        edge_type: "depends_on"
      });
    }
    
    stack.push({ level: rawLevel, id });
  }
  
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
      position_x: nodeWithPos.x - 150,
      position_y: nodeWithPos.y - 50
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
    const { nodes, edges } = parseMarkdown(text);
    if (nodes.length === 0) {
      toast.error('Geçerli bir Markdown listesi bulunamadı.');
      return;
    }
    
    if (nodes.length > 150) {
      toast.error('V1 sürümü için maksimum 150 görev içe aktarabilirsiniz. Lütfen listenizi bölün.');
      return;
    }

    const layoutedNodes = applyDagreLayout(nodes, edges);
    setPreviewData({ nodes: layoutedNodes, edges });
    setStep(2);
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
              Sihirli Yol Haritası
            </div>
            <button onClick={onClose} className="btn-icon btn-ghost"><X size={20}/></button>
          </div>

          <div className="modal-body">
            {step === 1 ? (
              <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                <p style={{fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.5'}}>
                  ChatGPT, Claude veya Gemini'ye projenizi anlatıp <strong>kesin bir formatta</strong> yanıt almak için aşağıdaki komutu kullanın. Ardından size verdiği listeyi kopyalayıp aşağıdaki kutuya yapıştırın.
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
                  LLM Çıktısını Buraya Yapıştırın:
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
                  placeholder="- Faz 1: Hazırlık&#10;  - Rakip Analizi&#10;- Faz 2: Tasarım..."
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
