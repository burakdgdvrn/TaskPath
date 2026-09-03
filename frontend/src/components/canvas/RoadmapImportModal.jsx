import React, { useState } from 'react';
import { X, Wand2, ArrowRight, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import dagre from 'dagre';
import { jsonrepair } from 'jsonrepair';
import { apiImportRoadmap } from '../../services/api';

const PROMPT_TEMPLATE = `Sen dünya çapında tecrübeli bir Senior Yazılım Mimarı ve Agile Proje Yöneticisisin.
Bize [PROJE KONUSU] projesi için çok kapsamlı, gerçek hayat senaryosuna uygun bir yol haritası (roadmap) hazırla.
Çıktın doğrudan sistemimiz tarafından okunup bir Directed Acyclic Graph (DAG) olarak çizilecek.

ADIM 1 — ZİHNİNDE PLANLA (çıktıya yazma, sadece düşün):
Önce projeyi 5-8 büyük FAZA ayır (örn: Analiz, Mimari, Backend, Frontend, Entegrasyon, Test, Yayın, Bakım).
Her faz için: bu fazda hangi işler birbirinden BAĞIMSIZ (paralel yapılabilir) hangileri birbirine BAĞIMLI (sıralı) düşün.
Ancak bu planlamayı sadece kendi içinde yap, nihai çıktı olarak SADECE JSON döndür.

İSKELET MANTIĞI (BUNU HER ZAMAN TAKİP ET):
Roadmap şu tekrarlayan kalıpla ilerlemeli:
[Start] -> [Milestone 1] -> (3-6 paralel taskNode) -> [Milestone 2] -> (3-6 paralel taskNode) -> [Milestone 3] -> ... -> [End]
Yani her Milestone, kendinden önceki paralel görevlerin BİRLEŞTİĞİ (fan-in) ve kendinden sonraki yeni paralel görevlerin BAŞLADIĞI (fan-out) bir senkronizasyon noktasıdır. Milestone'dan milestone'a asla doğrudan tek bir çizgiyle atlama — aralarında mutlaka gerçek iş yapan taskNode'lar olsun.

HÜCRE TÜRLERİ VE ANLAMLARI (her birini ne zaman kullanacağını öğren):
- "startNode": Haritanın TEK başlangıç noktası. Sadece 1 tane, hiç gelen oku yok.
- "milestoneNode": Bir fazın bittiği/yeni fazın başladığı dönüm noktası. Genellikle birden fazla görevi kendinde toplar (fan-in) ve birden fazla yeni görev başlatır (fan-out). Kendisi iş değil, senkronizasyon noktasıdır — 5-8 tane arasında olmalı.
- "taskNode": Somut, uygulanabilir, tek bir kişi/ekip tarafından birkaç saat-birkaç gün içinde bitirilebilecek iş birimi. Roadmap'in ana gövdesi bunlardan oluşur.
- "wikiNode": İş DEĞİLDİR — bir fazla ilgili kural, standart, referans bilgi veya teknik karar notudur (örn: "Renk paleti: #FF5733", "API rate limit: 100 req/dk"). Her fazda en az 1 tane wikiNode olmalı ki ekip önemli kararları unutmasın. wikiNode'un genelde tek bir gelen oku olur (bağlı olduğu fazdan), giden oku olmaz.
- "endNode": Sürecin bittiği nokta(lar). Birden fazla bağımsız bitiş dalı varsa birden fazla endNode olabilir, ama her dal mutlaka bir endNode'da son bulmalı.

SAYISAL KURALLAR:
1. Toplam en az 30-40 "taskNode" üret (milestone/start/end/wiki bu sayıma dahil değil). Güvenlik, test, veritabanı, frontend, backend, devops, dokümantasyon alanlarını atlama.
2. 5-8 arası "milestoneNode" olsun, her biri kendinden önceki paralel görevlerin fan-in noktası olsun.
3. Her milestone'dan sonra en az 3, ideal 4-6 paralel taskNode açılsın (bağımsız iş varsa hepsini paralel göster, gereksiz yere zincirleme).
4. Her fazda (milestone civarında) en az 1 wikiNode olsun.

BAĞLANTI (edges) KURALLARI:
- Paralel görevler: bir milestone'dan birden fazla task'a ok çıkar (fan-out).
- Birleşme: o paralel task'ların HEPSİ bir sonraki milestone'a ok verir (fan-in) — hiçbiri atlanmasın.
- DÖNGÜ (cycle) OLUŞTURMA — bir node asla, doğrudan ya da dolaylı olarak, kendine geri dönen bir yol üzerinde olmamalı.
- YETİM NODE bırakma — startNode hariç her node'un en az 1 gelen oku, endNode hariç her node'un en az 1 giden oku olmalı.

ALAN (field) KURALLARI:
- "id": kesinlikle benzersiz, kısa, anlamlı (örn: "task_db_schema", "m_faz2"). Asla boş bırakma.
- "label": kısa başlık (3-6 kelime). Asla boş bırakma.
- "description": 1 cümlelik somut açıklama. Asla boş string ("") bırakma — bilgi yoksa bile label'ı biraz açan bir cümle yaz.
- "priority": "low" | "medium" | "high" — milestoneNode'lar genelde "high" olmalı.
- "tags": tek kelimelik kategori (örn: "Backend", "Frontend", "DevOps", "Güvenlik", "Test", "Dokümantasyon"). Asla boş bırakma.

Örnek Şema (BU MANTIĞI TAKİP ET — paralel + birleşme + wikiNode dahil):
\`\`\`json
{
  "nodes": [
    { "id": "start", "label": "Proje Başlangıcı", "node_type": "startNode", "priority": "high", "description": "Gereksinimlerin toplanması ve proje kapsamının netleştirilmesi", "tags": "Analiz" },
    { "id": "m1", "label": "Faz 1: Mimari Tamamlandı", "node_type": "milestoneNode", "priority": "high", "description": "Mimari ve tasarım kararlarının onaylandığı senkronizasyon noktası", "tags": "Mimari" },
    { "id": "wiki_arch", "label": "Mimari Kararlar", "node_type": "wikiNode", "priority": "medium", "description": "Kullanılacak teknoloji yığını ve mimari desenler", "tags": "Referans" },
    { "id": "t_db", "label": "Veritabanı Şema Tasarımı", "node_type": "taskNode", "priority": "high", "description": "Tabloların ve ilişkilerin ER diyagramının çizilmesi", "tags": "Backend" },
    { "id": "t_ui", "label": "UI/UX Tasarımı", "node_type": "taskNode", "priority": "medium", "description": "Figma üzerinde ekran akışlarının hazırlanması", "tags": "Tasarım" },
    { "id": "t_api_spec", "label": "API Sözleşmesi Tasarımı", "node_type": "taskNode", "priority": "medium", "description": "Endpoint'lerin ve request/response şemalarının tanımlanması", "tags": "Backend" },
    { "id": "m2", "label": "Faz 2: Geliştirmeye Hazır", "node_type": "milestoneNode", "priority": "high", "description": "Tüm tasarım çıktılarının onaylanıp geliştirmeye geçildiği nokta", "tags": "Geliştirme" }
  ],
  "edges": [
    { "source": "start", "target": "m1" },
    { "source": "m1", "target": "wiki_arch" },
    { "source": "m1", "target": "t_db" },
    { "source": "m1", "target": "t_ui" },
    { "source": "m1", "target": "t_api_spec" },
    { "source": "t_db", "target": "m2" },
    { "source": "t_ui", "target": "m2" },
    { "source": "t_api_spec", "target": "m2" }
  ]
}
\`\`\`

SON KONTROL (JSON'u vermeden önce kendine sor):
- Toplam taskNode sayım 30-40'ın üzerinde mi?
- Her milestone gerçekten bir fan-in + fan-out noktası mı, yoksa tek zincir mi oldu?
- Her fazda en az 1 wikiNode var mı?
- Herhangi bir node yetim mi kaldı (hiç oku yok)?
- Döngü oluşturan bir bağlantı var mı?
- Her node'un description ve tags alanı dolu mu?

Sadece \`\`\`json ... \`\`\` bloğunu döndür. Başka hiçbir açıklama, önsöz veya sonsöz yazma.`;

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
