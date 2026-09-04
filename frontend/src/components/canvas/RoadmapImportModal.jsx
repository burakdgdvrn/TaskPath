import React, { useState, useEffect } from 'react';
import { X, Wand2, ArrowRight, Copy, Check, Terminal, LayoutList } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import dagre from 'dagre';
import { jsonrepair } from 'jsonrepair';
import { apiImportRoadmap } from '../../services/api';

const generatePrompt = (topic, description, teamSize, level, nodeCount) => {
  const levelHint = {
    'Özet': 'Sadece ana fazları ve çok kritik görevleri içeren, yüksek seviyeli (high-level) bir özet harita çıkar.',
    'Standart': 'Geliştirme sürecini tüm ana hatlarıyla kapsayan standart bir plan oluştur. Ne çok yüzeysel ne de gereksiz yere boğucu olsun.',
    'Kapsamlı': 'Projeyi en ince ayrıntısına kadar planla. Ancak bunu yaparken görev kotası doldurmak için ASLA anlamsız, saçma veya yapay görevler uydurma. Sadece gerçekten yapılması gereken işleri detaylandır.'
  }[level] || 'Geliştirme sürecini tüm ana hatlarıyla kapsayan standart bir plan oluştur.';

  const teamHint = {
    'Solo (1 Kişi)': 'Bu projeyi tek bir kişi yapacak. Bu yüzden aynı anda çok fazla paralel görev (fan-out) açma. Harita daha çok sıralı (zincir) ilerlemeli.',
    'Küçük Ekip (2-3)': 'Bu projeyi 2-3 kişilik küçük bir ekip yapacak. Görevleri bu ekibin paralel çalışabileceği şekilde 2-3 koldan ilerlet.',
    'Büyük Ekip (4+)': 'Bu projeyi büyük bir ekip yapacak. Frontend, Backend, Tasarım gibi disiplinler tamamen bağımsız (ayrı startNode\'lar ile) başlayabilir. Ekipleri sadece kritik milestone\'larda birleştir.'
  }[teamSize] || 'Bu projeyi 2-3 kişilik küçük bir ekip yapacak.';

  const countInstruction = nodeCount && nodeCount.trim()
    ? `- İSTENEN GÖREV SAYISI: Kullanıcı özellikle toplam ${nodeCount} civarında görev (taskNode) üretmeni istiyor. Lütfen plana sağdık kalırken bu hedefe olabildiğince yaklaş.`
    : `- İSTENEN GÖREV SAYISI: Sayısal bir limitin yok, projenin kapsamı neyi gerektiriyorsa o büyüklükte bir akış kur.`;

  return `Sen dünya çapında tecrübeli bir Senior Yazılım Mimarı ve Agile Proje Yöneticisisin.
Bize "${topic || '[PROJE ADINI GİRİN]'}" projesi için gerçek hayat senaryosuna uygun bir yol haritası (roadmap) hazırla.
${description ? `PROJE DETAYLARI: ${description}` : ''}
Çıktın doğrudan sistemimiz tarafından okunup bir Directed Acyclic Graph (DAG) olarak çizilecek.

MİMARİ VE EKİP BİLGİSİ (Planı Buna Göre Yap):
- DETAY SEVİYESİ: ${levelHint}
- EKİP BÜYÜKLÜĞÜ: ${teamHint}
${countInstruction}

ADIM 1 — ZİHNİNDE PLANLA (Çıktıya yazma):
Projenin doğasına ve ekip büyüklüğüne göre işleri nasıl böleceğini düşün. Kimler aynı anda çalışabilir? Hangi işler birbirini beklemek zorunda? İstenen görev sayısına dikkat ederek mantıklı bir akış kur ve nihai çıktıyı SADECE JSON formatında döndür.

HÜCRE TÜRLERİ VE ANLAMLARI:
- "startNode": Haritanın başlangıç noktası. Ekip büyüklüğüne göre tek bir başlangıç da olabilir, birbirinden tamamen bağımsız ekipler varsa birden fazla startNode da olabilir.
- "milestoneNode": Paralel işlerin bittiği veya yeni fazların başladığı önemli senkronizasyon noktaları. Nereye koyacağına sen karar ver.
- "taskNode": Somut, uygulanabilir, tek bir iş birimi.
- "wikiNode": İş DEĞİLDİR — teknik kural, referans bilgi veya karar notudur. Giden oku (hedefi) olmaz.
- "endNode": Sürecin bittiği nokta(lar).

GRAF KURALLARI VE ALANLAR (Bu formatı birebir koru):
- "id": kesinlikle benzersiz (unique) olmalı.
- "label": kısa başlık.
- "description": 1 cümlelik açıklama.
- "tags": tek kelimelik kategori.
- "priority": "low" | "medium" | "high".
- "node_type": "startNode", "milestoneNode", "taskNode", "wikiNode", "endNode" değerlerinden biri.

ÖRNEK ÇIKTI FORMATI:
\`\`\`json
{
  "nodes": [
    { "id": "n1", "label": "Proje Başlangıcı", "description": "Gereksinim analizi", "tags": "Analiz", "priority": "high", "node_type": "startNode" }
  ],
  "edges": [
    { "source": "n1", "target": "n2" }
  ]
}
\`\`\`
Sadece \`\`\`json ... \`\`\` bloğunu döndür. Başka hiçbir açıklama, önsöz veya sonsöz yazma.`;
};

const generateSystemPrompt = () => {
  return `AŞAĞIDAKİ KURALLAR, BENİM KULLANDIĞIM YOL HARİTASI (DAG) SİSTEMİNİN ZORUNLU JSON ŞEMASIDIR:

1. HÜCRE TÜRLERİ (node_type): 
- "startNode": Başlangıç noktası
- "milestoneNode": Senkronizasyon (fan-in/fan-out) noktası
- "wikiNode": Karar/Not düğümü (İş değildir, giden oku olmaz)
- "taskNode": Uygulanabilir iş birimi
- "endNode": Bitiş noktası

2. ZORUNLU ALANLAR: 
- "id": Kesinlikle benzersiz (unique)
- "label": Kısa başlık
- "description": 1 cümlelik açıklama
- "tags": Tek kelimelik kategori
- "priority": "low" | "medium" | "high"
- "node_type": Yukarıdaki 5 türden biri

3. GRAF KURALLARI: 
- Döngü (cycle) yaratılamaz.
- Yetim düğüm (hiç oku olmayan) bırakılamaz.

ÖRNEK JSON ÇIKTISI:
\`\`\`json
{
  "nodes": [
    { "id": "n1", "label": "Başlangıç", "description": "Hazırlık", "tags": "Analiz", "priority": "high", "node_type": "startNode" }
  ],
  "edges": [
    { "source": "n1", "target": "n2" }
  ]
}
\`\`\`

BU AŞAMADAN SONRA SANA VERECEĞİM TÜM GÖREVLERİ VEYA PROJELERİ SADECE YUKARIDAKİ JSON ŞEMASINA UYGUN OLARAK DÖNDÜR.`;
};

const parseJSON = (text) => {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  let rawJson = jsonMatch ? jsonMatch[1] : text;

  let parsedData;
  try {
    parsedData = JSON.parse(rawJson);
  } catch (err) {
    try {
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
    let safeId = n.id;
    if (uniqueIds.has(safeId)) {
      safeId = `${safeId}_copy_${Math.floor(Math.random() * 1000)}`;
      duplicateWarnings.push(n.id);
    }
    uniqueIds.add(safeId);

    let safeType = n.node_type || n.type || n.nodeType;
    if (!validTypes.includes(safeType)) {
      safeType = 'taskNode';
    }

    return {
      id: safeId,
      label: n.label || n.title || n.name || n.text || 'İsimsiz Görev',
      description: n.description || n.desc || n.detail || '',
      priority: ['low', 'medium', 'high'].includes(n.priority) ? n.priority : 'medium',
      tags: n.tags || n.tag || n.category || '',
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
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState('wizard'); // 'wizard' | 'advanced'
  const [previewData, setPreviewData] = useState({ nodes: [], edges: [] });
  const [isImporting, setIsImporting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form States
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [teamSize, setTeamSize] = useState('Küçük Ekip (2-3)');
  const [level, setLevel] = useState('Standart');
  const [nodeCount, setNodeCount] = useState('');
  
  // Computed Prompt
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  // Output JSON Text
  const [text, setText] = useState('');

  useEffect(() => {
    if (mode === 'wizard') {
      setGeneratedPrompt(generatePrompt(topic, description, teamSize, level, nodeCount));
    } else {
      setGeneratedPrompt(generateSystemPrompt());
    }
  }, [topic, description, teamSize, level, nodeCount, mode]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (mode === 'wizard' && !topic.trim()) {
      toast.error('Lütfen önce bir proje adı girin.');
      return;
    }
    navigator.clipboard.writeText(generatedPrompt);
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
      setTopic('');
      setDescription('');
      setNodeCount('');
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
          style={{ maxWidth: '700px', width: '90%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        >
          <div className="modal-header" style={{flexDirection: 'column', alignItems: 'stretch', gap: '16px'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <div className="modal-title" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                <Wand2 size={20} style={{color: 'var(--accent-violet)'}} /> 
                Sihirli Yol Haritası (JSON)
              </div>
              <button onClick={onClose} className="btn-icon btn-ghost"><X size={20}/></button>
            </div>

            {/* TABS */}
            {step === 1 && (
              <div style={{display: 'flex', gap: '8px', background: 'var(--bg-tertiary)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-default)'}}>
                <button 
                  onClick={() => setMode('wizard')}
                  style={{
                    flex: 1, padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    background: mode === 'wizard' ? 'var(--bg-primary)' : 'transparent',
                    border: mode === 'wizard' ? '1px solid var(--border-default)' : '1px solid transparent',
                    borderRadius: '6px', cursor: 'pointer', color: mode === 'wizard' ? 'var(--text-primary)' : 'var(--text-muted)',
                    fontWeight: mode === 'wizard' ? '600' : '400',
                    transition: 'all 0.2s ease', boxShadow: mode === 'wizard' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  <LayoutList size={16}/> Sihirbaz Modu
                </button>
                <button 
                  onClick={() => setMode('advanced')}
                  style={{
                    flex: 1, padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    background: mode === 'advanced' ? 'var(--bg-primary)' : 'transparent',
                    border: mode === 'advanced' ? '1px solid var(--border-default)' : '1px solid transparent',
                    borderRadius: '6px', cursor: 'pointer', color: mode === 'advanced' ? 'var(--text-primary)' : 'var(--text-muted)',
                    fontWeight: mode === 'advanced' ? '600' : '400',
                    transition: 'all 0.2s ease', boxShadow: mode === 'advanced' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  <Terminal size={16}/> Gelişmiş Mod
                </button>
              </div>
            )}
          </div>

          <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
            {step === 1 ? (
              <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                
                {/* WIZARD FORM SECTION */}
                {mode === 'wizard' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)' }}>1. Proje Detaylarını Girin</div>
                    
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Proje Adı *</label>
                      <input 
                        type="text" 
                        className="input" 
                        placeholder="Örn: Uber benzeri mobil uygulama"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '16px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Ekip Büyüklüğü</label>
                        <select className="input" value={teamSize} onChange={(e) => setTeamSize(e.target.value)}>
                          <option value="Solo (1 Kişi)">Solo (1 Kişi)</option>
                          <option value="Küçük Ekip (2-3)">Küçük Ekip (2-3)</option>
                          <option value="Büyük Ekip (4+)">Büyük Ekip (4+)</option>
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Detay Seviyesi</label>
                        <select className="input" value={level} onChange={(e) => setLevel(e.target.value)}>
                          <option value="Özet">Özet</option>
                          <option value="Standart">Standart</option>
                          <option value="Kapsamlı">Kapsamlı</option>
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Görev Sayısı (Opsiyonel)</label>
                        <input 
                          type="text" 
                          className="input" 
                          placeholder="Örn: 25"
                          value={nodeCount}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            if (val === '0') return;
                            setNodeCount(val);
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Ekstra Notlar (Opsiyonel)</label>
                      <textarea 
                        className="input" 
                        placeholder="Kullanılacak teknolojiler, özel istekler, modüller..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        style={{ minHeight: '60px', resize: 'vertical' }}
                      />
                    </div>
                  </div>
                )}

                {/* ADVANCED MODE INFO */}
                {mode === 'advanced' && (
                  <div style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '16px', borderRadius: '8px', color: 'var(--text-primary)' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}><Terminal size={16}/> Gelişmiş Prompt Kullanımı</h4>
                    <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5', color: 'var(--text-muted)' }}>
                      İleri seviye kullanıcılar için form doldurmak yerine doğrudan JSON anatomisini veren ham (raw) koddur. Bunu yapay zekaya (ChatGPT/Claude) kopyalayın ve ardından istediğiniz karmaşıklıktaki projenizi kendi kelimelerinizle tasarlamasını isteyin.
                    </p>
                  </div>
                )}

                {/* PROMPT PREVIEW SECTION */}
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                    {mode === 'wizard' ? '2. Komutu Kopyalayın' : 'Sistem Kurallarını (Context) Kopyalayın'}
                  </div>
                  <p style={{fontSize: '13px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4'}}>
                    Bu metni <strong>ChatGPT, Claude veya Gemini'ye</strong> yapıştırın.
                  </p>
                  
                  <div style={{
                    background: '#1e1e1e', 
                    border: '1px solid #333',
                    borderRadius: '8px', 
                    overflow: 'hidden',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                      padding: '8px 12px', background: '#2d2d2d', borderBottom: '1px solid #444'
                    }}>
                      <div style={{fontSize: '11px', color: '#a3a3a3', fontWeight: '600', letterSpacing: '0.5px'}}>
                        {mode === 'wizard' ? 'DİNAMİK LLM PROMPT' : 'RAW SYSTEM CONTEXT'}
                      </div>
                      <button 
                        onClick={handleCopy}
                        style={{
                          background: (mode === 'advanced' || topic.trim()) ? (copied ? '#22c55e' : 'var(--accent-violet)') : '#555',
                          border: 'none', cursor: (mode === 'advanced' || topic.trim()) ? 'pointer' : 'not-allowed',
                          display: 'flex', alignItems: 'center', gap: '6px',
                          color: '#fff', fontSize: '12px', fontWeight: '500',
                          padding: '6px 12px', borderRadius: '4px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {copied ? <Check size={14}/> : <Copy size={14}/>}
                        {copied ? 'Kopyalandı' : 'Kopyala'}
                      </button>
                    </div>
                    
                    <div style={{ padding: '16px', maxHeight: '200px', overflowY: 'auto' }}>
                      <pre style={{ margin: 0, fontSize: '12px', color: '#e4e4e7', fontFamily: 'monospace', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                        {generatedPrompt}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* PASTE SECTION */}
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                    {mode === 'wizard' ? '3. Sonucu Yapıştırın' : 'AI Çıktısını Yapıştırın'}
                  </div>
                  <textarea 
                    className="input"
                    style={{
                      minHeight: '150px', 
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

          <div className="modal-footer" style={{display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-default)'}}>
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
