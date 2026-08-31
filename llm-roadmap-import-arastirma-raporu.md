# LLM Destekli Roadmap İçe Aktarma — Detaylı Araştırma Raporu

**Amaç:** Kullanıcının dışarıdaki bir LLM'e proje anlatıp, dönen JSON'u TaskPath'e
yapıştırarak yüzlerce görevi otomatik olarak kanvasa/klasör yapısına yerleştirmesi.
Bu rapor, bu özelliğin gerçekçi sınırlarını, avantajlarını, risklerini ve
**özellikle ücretsiz hosting (Vercel + ücretsiz Postgres sağlayıcıları) ile
canlıya alındığında** nelere dikkat edilmesi gerektiğini araştırmaya dayanarak
özetliyor.

---

## 1. Avantajlar (neden yapmaya değer)

- **Zaman kazancı büyük:** 20-50 görevlik bir yapıyı elle kurmak saatler
  sürerken, LLM ile bu dakikalar içinde çıkarılabilir.
- **Ek maliyet yok (V1 için):** Dışarıdan LLM kullanma modelinde (kullanıcı
  kendi ChatGPT/Claude hesabını kullanıyor), TaskPath'in bir API faturası
  ödemesi gerekmiyor — sadece bir "yapıştır ve içe aktar" ekranı.
- **Esnek şema:** JSON yapısı hem basit düz liste hem de klasörlü (workspace)
  hiyerarşi taşıyabilir — küçük projede LLM'i zorlamaz, büyük projede tam
  yapı kurabilir.
- **Var olan altyapıyla uyumlu:** Node/edge veri modeliniz zaten var, bu
  özellik yeni bir sistem değil, var olan modele "toplu veri girişi" kapısı
  açıyor.

---

## 2. Riskler ve Dikkat Edilmesi Gerekenler

### 2.1. LLM tarafı riskler — JSON'un kendisi güvenilir olmayabilir

**a) Çıktı uzunluğu sınırı (output token limiti) — en kritik risk**

LLM'lerin "context window" (ne kadar okuyabildiği) ile "output cap" (**tek
bir cevapta ne kadar üretebildiği**) birbirinden tamamen farklı, çok daha
düşük bir sınır. Ücretsiz/standart kullanıcı arayüzlerinde (ChatGPT web,
Claude web gibi) bu sınır, API'nin izin verdiği tam sayının çok altında
kalıyor — pratikte tek bir cevap birkaç bin ile on binkaç bin token
arasında kesiliyor, bu da kabaca 3.000-12.000 kelimelik bir çıktıya denk
geliyor.

**Bunun senin özelliğin için anlamı:** JSON, düz yazıya göre token
açısından "pahalı" bir format — tırnak işaretleri, parantezler, tekrar eden
alan adları (`"title"`, `"description"`, `"depends_on"` her görev için
tekrar tekrar yazılıyor) token'ları hızlı tüketiyor. 50 görevlik, kısa
açıklamalı bir JSON muhtemelen sorunsuz tamamlanır. **200+ görevlik,
detaylı açıklamalı bir JSON, ücretsiz/standart bir LLM arayüzünde çıktı
sınırına takılıp yarım kesilme riski taşıyor** — sonuç: bozuk, parse
edilemeyen JSON.

**b) "Halüsinasyon" ve tutarsızlık riski**

- LLM, `depends_on` içinde var olmayan bir id uydurabilir, ya da aynı id'yi
  iki farklı göreve verebilir (uniqueness garantisi yok).
- Çok uzun görev listelerinde LLM, listenin başındaki id formatını
  (örn. `t1`, `t2`) ortalarda unutup farklı bir formata (`task_1`,
  `Task-1`) geçebilir — bu, `depends_on` referanslarını kırar.
- Döngüsel bağımlılık (A→B→A) üretme ihtimali de var, özellikle liste
  uzadıkça LLM'in "hangi görev neye bağlıydı" takibi zayıflıyor.

**c) Kısmi/kesik JSON**

Çıktı sınırına yaklaşan bir cevap, JSON'un ortasında kesilip devam
isteyebilir ("devam et" dedirtmek gerekir) — bu hem kullanıcı deneyimini
bozar hem de "ilk yarı + ikinci yarı"nın birleştirilmesi ek bir iş, hataya
açık bir adım haline gelir.

### 2.2. Performans riskleri — frontend tarafı (React Flow)

React Flow'un kendi dokümantasyonu ve toplulukta yazılan optimizasyon
rehberleri, **yüzlerce node'da varsayılan ayarlarla performans sorunu
yaşandığını** açıkça belirtiyor: node sürüklemesi gibi sık state
güncellemeleri, özellikle custom node/edge component'leri memoize
edilmemişse (`React.memo` kullanılmamışsa) gereksiz yeniden render'lara yol
açıyor ve 80+ node civarında bile fark edilir yavaşlama bildiren
geliştirici örnekleri var. Önerilen çözümler: custom node/edge'leri
memoize etmek, sadece görünür alandaki elemanları render etmek
(viewport-based rendering — React Flow bunu kısmen otomatik yapıyor ama
custom component'lerin kendisi de buna uymalı), node güncellemelerini
debounce etmek, ve büyük graf'ları küçük alt-graf'lara bölmek.

**Senin sistemin için özel risk:** `smartEdgeUtil.js`'teki A* algoritması,
her edge için ayrı bir grid taraması yapıyor. Kodda zaten
`width * height > 1000000` durumunda routing'in tamamen devre dışı
kaldığını gördük — yani **yüzlerce node yayılmış bir alanda, akıllı
rotalama muhtemelen kendini kapatıp düz çizgiye (fallback) düşecek**. Bu
işlevsel olarak çalışır ama görsel kaliteyi bozar. Ayrıca yüzlerce edge
için yüzlerce ayrı A* çağrısı, import anında (tek seferde) ciddi bir CPU
yükü demek — bu hesaplamayı arka planda / kademeli yapmak gerekebilir.

**Layout (Dagre/ELK) maliyeti:** Otomatik yerleşim hesaplaması da
graf büyüklüğüyle orantılı bir maliyet taşıyor — küçük-orta graf'larda
(50-100 node) tarayıcıda anlık, ama yüzlerce node + yoğun bağımlılıkta
gözle görülür bir gecikme (1-2 saniye+) yaratabilir. Bu, "içe aktarma
sırasında kısa bir yükleme animasyonu göster" ihtiyacını doğuruyor.

### 2.3. Backend / veritabanı riskleri

- **Toplu ekleme (bulk insert):** Yüzlerce node+edge'i tek tek API
  çağrısıyla eklemek performans felaketi olur (yüzlerce HTTP round-trip).
  Tek bir transaction içinde toplu insert şart — ama bu da "yarısı
  eklenip hata olursa ne olacak" (transaction rollback) senaryosunu
  düzgün ele almayı gerektiriyor.
- **Veritabanı boyutu:** Ücretsiz Postgres sağlayıcılarının çoğu (Supabase,
  Neon gibi) depolamayı **500 MB - birkaç GB** aralığında sınırlıyor.
  Görev/node verisi kendisi küçük (birkaç KB/kayıt) olduğu için bu sınıra
  binlerce görevle bile kolay ulaşılmaz — asıl risk, ileride eklenecek
  ekstra veri (yorumlar, dosya ekleri, chat mesaj geçmişi gibi) ile bu
  sınırın hızla dolması.
- **Bağlantı sayısı sınırı:** Ücretsiz katmanlarda eşzamanlı veritabanı
  bağlantı sayısı da sınırlı (örn. Supabase ücretsiz planında ~60 doğrudan
  bağlantı) — WebSocket tabanlı çoklu kullanıcı sisteminle birlikte, çok
  sayıda eşzamanlı kullanıcı olursa bu sınıra yaklaşılabilir, bağlantı
  havuzlama (pooling) kullanmak önemli.
- **Boşta kalınca duraklama (idle pause):** Bazı ücretsiz veritabanı
  sağlayıcıları (Supabase gibi), proje bir süre (örn. 7 gün) kullanılmazsa
  projeyi otomatik duraklatıyor — bu, ilk mesajın "soğuk başlangıç"
  gecikmesi yaşamasına neden olabilir, kritik değil ama sürpriz olmasın.

### 2.4. Hosting / platform riskleri — Vercel özelinde

Projenin backend'i FastAPI+Docker tabanlı, Vercel'i sadece frontend için
kullanıyorsun (mimari raporunda böyle yazıyor) — bu doğru bir ayrım, çünkü
şunlar Vercel'in ücretsiz (Hobby) planında ciddi kısıtlar:

- **Fonksiyon çalışma süresi sınırı:** Hobby planda serverless fonksiyonlar
  varsayılan olarak kısa bir sürede (kaynaklar arasında 10 saniye ile 60
  saniye arasında değişen rakamlar var, muhtemelen plan/konfigürasyona
  göre farklılaşıyor) zaman aşımına uğruyor — eğer import işlemi (JSON
  parse + validasyon + toplu insert + layout tetikleme) bu süreyi
  aşarsa istek 504 hatasıyla kesilir. **Backend'in Vercel'de olmaması bu
  riski senin için zaten büyük ölçüde ortadan kaldırıyor**, sadece
  backend'i nerede barındıracağını seçerken bu sınırı unutma.
- **İstek gövdesi (body) boyutu sınırı:** Vercel serverless fonksiyonlarında
  bilinen bir sınır, tek bir isteğin gövdesinin **4.5 MB** ile sınırlı
  olması. 200+ görevlik, açıklamalı bir JSON muhtemelen bunun çok altında
  kalır (birkaç yüz KB civarı), ama "kullanıcı çok uzun açıklamalar
  yapıştırırsa" senaryosunu göz ardı etme — büyük JSON'ları parçalara
  bölerek göndermek bir güvenlik payı olur.
- **WebSocket uyumsuzluğu:** Vercel'in klasik serverless fonksiyonları,
  doğası gereği kalıcı bağlantı (WebSocket) tutamıyor — bu senin projen
  için zaten bilinen bir kısıt olduğundan (backend Docker'da barınıyor),
  yeni bir risk değil, ama **backend'i de "ücretsiz, Vercel gibi" bir
  platforma taşımayı düşünürsen**, WebSocket destekleyen bir platform
  (Railway, Render, Fly.io gibi "always-on container" sunan servisler)
  seçmen gerektiğini hatırlatmak isterim — WebSocket gerektiren gerçek
  zamanlı işbirliği özelliğin, klasik "serverless function" mantığıyla
  çalışan platformlarda çalışmaz.

---

## 3. Somut Karşılaştırma: 50 Görev vs 200+ Görev

| Konu | ~50 görev | 200+ görev |
|---|---|---|
| LLM çıktısının yarım kesilme riski | Düşük — standart çıktı sınırının rahatça altında | Orta-Yüksek — özellikle detaylı açıklamalarla sınıra yaklaşılabilir |
| JSON'da id/bağımlılık hatası riski | Düşük | Orta — liste uzadıkça LLM'in tutarlılığı bozulma ihtimali artıyor |
| React Flow render performansı | Sorunsuz (varsayılan ayarlarla bile) | Memoizasyon + viewport optimizasyonu **şart** |
| A* rota hesaplama süresi | Anlık | Fallback (düz çizgi) devreye girebilir, işlem süresi artar |
| Otomatik layout (Dagre) süresi | Anlık (<1sn) | Gözle görülür gecikme olası (1-2sn+), yükleme göstergesi gerekir |
| Backend toplu-ekleme karmaşıklığı | Basit tek transaction yeterli | Hata yönetimi (kısmi başarı, rollback) daha dikkatli kurulmalı |
| Önizleme ekranı gerekliliği | İsteğe bağlı | Neredeyse zorunlu (kullanıcı ne olacağını görmeden onay vermemeli) |

---

## 4. Önerilen Yaklaşım (riskleri azaltarak ilerlemek için)

1. **İlk versiyonu 50-75 görevle sınırla** (yazılım olarak bir üst sınır
   koy, aşan JSON'ları "çok büyük, bölerek içe aktarın" diye reddet). Bu,
   hem LLM çıktı kesilme riskini hem de performans/layout gecikmesini
   büyük ölçüde ortadan kaldırıyor. Sınırı sonradan artırmak, düşürmekten
   çok daha kolay.
2. **Parçalı içe aktarmayı destekle:** Kullanıcı 150 görevlik bir proje
   istiyorsa, LLM'e "önce sadece Backend bölümünü, sonra Frontend
   bölümünü ayrı ayrı üret" dedirtmesini kolaylaştıracak bir prompt
   şablonu ver — büyük projeleri tek dev JSON yerine birden fazla küçük
   içe aktarmaya bölmek, hem LLM hem sistem için daha güvenli.
3. **Validasyonu sıkı ve açıklayıcı yap:** Hatalı id, döngü, eksik alan
   gibi durumlarda kullanıcıya "JSON'un neresi bozuk" diye net bir hata
   göster — kullanıcı LLM'e "şu hatayı düzelt" diye geri dönebilsin.
4. **Önizleme ekranını atlama:** Kaç görev, kaç bağlantı, hangi
   workspace'lere dağılacağı özetini onaydan önce mutlaka göster.
5. **Backend'i Vercel'de barındırma düşüncesi varsa vazgeç:** Zaten
   Docker/FastAPI kullanıyorsun, bu doğru — WebSocket + uzun süren
   toplu-import işlemleri klasik serverless (Vercel Hobby) ile uyumsuz.
   Backend için "always-on" bir ücretsiz/ucuz katman (Railway, Render,
   Fly.io gibi) daha uygun düşer.
6. **Veritabanı seçiminde Neon veya Supabase'in ücretsiz katmanı** bu
   ölçekteki bir proje için fazlasıyla yeterli — asıl dikkat edilmesi
   gereken, projenin 7 gün kullanılmazsa duraklaması (soğuk başlangıç
   gecikmesi) ve bağlantı havuzlama kullanımı.

---

## 5. Sonuç

Fikir teknik olarak tamamen yapılabilir ve mevcut mimarine (node/edge veri
modeli, WebSocket, Zustand store) doğal olarak oturuyor. Asıl risk
"özelliğin çalışıp çalışmayacağı" değil, **"büyük ölçekte sessizce
bozulma"** riski — LLM çıktısı yarıda kesilir, layout yavaşlar, veya
tutarsız id'ler görünmeyen hatalara yol açar. Bunların hepsi, **görev
sayısına bir üst sınır koyup, o sınırın altında sağlam çalışan bir V1
kurarak** büyük ölçüde yönetilebilir. Sınırı büyütmek, ürünü kırmadan
yapılabilecek bir sonraki adım olur.

---

## Kaynaklar

- Vercel Functions resmi dokümantasyonu ve sınırlar — vercel.com/docs/functions/limitations
- Vercel Hobby plan sınırları (2026 güncel) — deploywise.dev, fencode.dev, promptstoproduct.com
- Vercel'de WebSocket desteği — Vercel Knowledge Base (vercel.com/kb), ably.com
- ChatGPT çıktı/token sınırları (2026) — aitoolsynergy.com, qwe.edu.pl, justdone.com
- Supabase ücretsiz katman sınırları (2026) — aiagencyplus.com, iloveblogs.blog, designrevision.com
- Neon / ücretsiz Postgres karşılaştırması (2026) — swyftstack.com, koyeb.com, perkstack.co
- React Flow performans optimizasyonu — reactflow.dev/learn/advanced-use/performance, xyflow/xyflow GitHub tartışmaları, medium.com (Synergy Codes, Azim Uddin Ahamed)

*Not: Ücretsiz katman sınırları sağlayıcılar tarafından sık değiştiriliyor —
mimari bir karar vermeden önce ilgili sağlayıcının güncel fiyatlandırma
sayfasından teyit etmen faydalı olur.*
