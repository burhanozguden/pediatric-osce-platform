/**
 * Bu depo yalnızca arka uç (API + veri + guardrail) katmanını içerir.
 * Arayüz (öğrenci sohbet ekranı, karne ekranı) ayrı bir iş paketidir.
 */
export default function Home() {
  return (
    <main style={{ fontFamily: 'system-ui', padding: 24, maxWidth: 720 }}>
      <h1>Pediatrik Klinik Beslenme YZ OSCE Platformu</h1>
      <p>API uç noktaları:</p>
      <ul>
        <li>
          <code>POST /api/chat</code> – sanal ebeveyn (Ajan 1)
        </li>
        <li>
          <code>POST /api/evaluate</code> – akademik değerlendirici (Ajan 2) + klinik guardrail
        </li>
      </ul>
    </main>
  );
}
