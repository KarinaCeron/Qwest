import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const N8N_WEBHOOK_URL =
  "https://karinaceron.app.n8n.cloud/webhook/dd564ef4-d017-43cb-bac2-e6c9efc57ac0";

const SCORECARD_INSTRUCTIONS = `Evalúa esta compañía y oportunidad laboral con un scorecard de 0 a 5 en cinco criterios.
Objetivo profesional: determinar si esta oportunidad es atractiva y, sobre todo, si aumenta de forma significativa
la probabilidad del candidato de convertirse en Head of Product en aproximadamente 3 años.
Sé crítico, basado en evidencia y comparable entre compañías. No describas solo la empresa: determina qué tan buena
es la oportunidad para el candidato.

Contexto del candidato (no negociables):
- Trabajo remoto como modalidad principal, viviendo permanentemente en Cali, Colombia.
- La compañía debe poder contratar desde Colombia (contractor o empleado con prestaciones de ley).
- Viajes ocasionales (offsites, eventos, reuniones puntuales) son compatibles. Presencia regular en oficina,
  mudanza o vivir cerca de una oficina rompen el no negociable.
- Benchmark de salario base: USD 7,000/mes (USD 84,000/año de base). Bonus, equity y beneficios se analizan aparte
  y no se usan para maquillar una base inferior.

Criterios (0-5 cada uno):
1. Etapa, financiación & runway (etapa, product-market fit, rondas, inversionistas, última ronda, headcount,
   contratación vs. despidos, expansión de producto/mercado/geografía, ingresos o clientes). No penalices bootstrap
   por no haber levantado capital; analiza crecimiento, clientes, rentabilidad y sostenibilidad.
   0 señales negativas fuertes; 1 fuera del objetivo/estancamiento; 2 aceptable pero incierto; 3 post-market fit con
   ronda verificable en 18-24 meses; 4 además crecimiento verificable; 5 expansión clara y sostenida.
2. Historia & calidad de la empresa (founders, background, evolución de producto, pivotes, clientes, hitos,
   reputación, layoffs). 0 señales negativas fuertes; 1 historia débil o confusa; 2 trayectoria normal;
   3 trayectoria sólida; 4 empresa respetable; 5 referente del sector.
3. Salario, compensación & no negociables (base mensual y anual, bonus, equity, total comp, rango publicado,
   ubicación requerida, modalidad contractual, contratación desde Colombia, trabajo desde Cali, timezone, política
   remota, oficina, viajes, beneficios, vacaciones, diferencias contractor vs. employee y costos asumidos).
   0 rompe un no negociable; 1 por debajo del objetivo o riesgo claro; 2 piso (~USD 7K base, sin margen);
   3 cumple; 4 por encima del objetivo; 5 excepcional. Si la base es USD 5K + USD 3K bonus, la base es USD 5K.
   Si hay rango USD 6K-8K, indica que potencialmente cumple sin asumir el techo. Si no hay info salarial, márcalo
   como incertidumbre; no inventes cifras.
4. Cultura & equipo (cómo trabaja el equipo, equipo de Product, manager y su background, seniority, autonomía,
   toma de decisiones, relación con Engineering/Design/Sales/founders, ritmo, micromanagement, rotación, tenure,
   reseñas de empleados y ex-empleados, de quién podría aprender). Busca señales independientes, no solo marketing.
   0 red flags verificadas; 1 incompatibilidad; 2 estándar; 3 compatible; 4 equipo del que aprendería;
   5 acelerador profesional. Distingue anécdota, patrón y evidencia consistente.
5. Trayectoria hacia Head of Product en ~3 años (scope real, ownership, outcomes, métricas, estrategia, discovery,
   roadmap, exposición a CEO/founders y ejecutivos, autonomía, relación con Engineering/Design/GTM, pricing,
   monetización, liderazgo de PMs, estructura y tamaño de Product, quién está por encima, promociones internas,
   crecimiento esperado). Scope > título. 0 me aleja de Product; 1 Product muy limitado; 2 buen PM con poco
   ownership; 3 desarrollo sólido; 4 trayectoria clara hacia liderazgo; 5 acelerador directo.

FORMATO DE RESPUESTA OBLIGATORIO. Empieza exactamente con esta tabla en markdown:

| Criterio | Score | Confianza | Veredicto |
| --- | --- | --- | --- |
| Etapa & runway | X/5 | Alta/Media/Baja | ... |
| Historia & empresa | X/5 | Alta/Media/Baja | ... |
| Salario & no negociables | X/5 | Alta/Media/Baja | ... |
| Cultura & equipo | X/5 | Alta/Media/Baja | ... |
| Head of Product en 3 años | X/5 | Alta/Media/Baja | ... |
| TOTAL | X/25 | | ... |

Después desarrolla cada criterio con esta estructura:
"N. <Criterio> — X/5" y dentro: "Qué encontré", "Evidencia", "Qué significa", "Qué no sabemos", y "Score: X/5"
explicando exactamente por qué recibió ese score.

Luego incluye, en este orden:
- EVIDENCIA: clasifica cada afirmación relevante como Hecho verificable / Información de terceros / Inferencia /
  Desconocido. No conviertas rumores en hechos; si dos fuentes se contradicen, señala la contradicción y cita fuentes.
- NIVEL DE CONFIANZA por criterio (Alta / Media / Baja).
- GREEN FLAGS / YELLOW FLAGS / RED FLAGS.
- RIESGOS DE ACEPTAR LA OPORTUNIDAD: 3-5 riesgos, cada uno clasificado como riesgo de compañía, financiero, del rol,
  cultural, de compensación o para la trayectoria hacia Head of Product.
- INFORMACIÓN QUE DEBO VALIDAR EN ENTREVISTAS: 5-10 preguntas priorizadas (runway, crecimiento, motivo de la
  contratación, expectativas de 6-12 meses, ownership, autonomía, métricas, relación con founders/CEO, tamaño y
  estructura de Product, liderazgo, contratación desde Colombia, trabajo desde Cali, viajes reales, compensación).
- DECISIÓN FINAL: clasifica la oportunidad de 0 a 5 con la escala
  (5 excepcional: perseguir agresivamente; 4 muy atractiva: avanzar; 3 interesante: investigar antes de decidir;
  2 débil; 1 no recomendable; 0 descartar) en una línea que empiece con "DECISIÓN FINAL: X — ...", explica brevemente,
  y responde explícitamente en una sola frase: "¿Esta compañía me acerca o me aleja de ser Head of Product en 3 años?",
  seguida de 2-3 razones concretas.

Si no existe evidencia suficiente, dilo explícitamente. No rellenes información faltante con suposiciones.`;

const CRITERIA = [
  { key: "stage", patterns: [/etapa/i, /runway/i, /financiaci/i] },
  { key: "history", patterns: [/historia/i, /calidad de la empresa/i] },
  { key: "compensation", patterns: [/salario/i, /compensaci/i, /no negociabl/i] },
  { key: "culture", patterns: [/cultura/i, /equipo/i] },
  { key: "path", patterns: [/head of product/i, /trayectoria/i, /camino/i] },
] as const;

function unwrap(text: string): string {
  let clean = text.trim();
  try {
    let parsed: unknown = JSON.parse(clean);
    if (Array.isArray(parsed)) parsed = parsed[0];
    if (typeof parsed === "string") return parsed;
    if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      const val = obj.output ?? obj.text ?? obj.response ?? obj.result ?? obj.message;
      if (typeof val === "string") return val;
    }
  } catch {
    const m = clean.match(/^\{\s*"(?:output|text|response|result|message)"\s*:\s*"([\s\S]*)"\s*\}$/);
    if (m) {
      clean = m[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    }
  }
  return clean;
}

/** Extracts per-criterion scores, confidence and verdicts from the markdown scorecard table. */
function parseScorecard(text: string) {
  const scores: Record<string, number | null> = {};
  const confidence: Record<string, string> = {};
  const verdicts: Record<string, string> = {};
  for (const c of CRITERIA) {
    scores[c.key] = null;
  }

  const lines = text.split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    const scoreMatch = line.match(/(\d(?:[.,]\d)?)\s*\/\s*5\b/);
    if (!scoreMatch) continue;
    const label = line.replace(/^\|/, "").split("|")[0] ?? line;
    const target = CRITERIA.find((c) => c.patterns.some((p) => p.test(label)));
    if (!target || scores[target.key] !== null) continue;

    const value = Math.max(0, Math.min(5, Math.round(Number(scoreMatch[1].replace(",", ".")))));
    scores[target.key] = value;

    if (line.startsWith("|")) {
      const cells = line.split("|").map((c) => c.trim()).filter((c) => c !== "");
      const conf = cells.find((c) => /^(alta|media|baja|high|medium|low)$/i.test(c));
      if (conf) confidence[target.key] = conf;
      const verdict = cells[cells.length - 1];
      if (verdict && !/\/\s*5/.test(verdict) && !/^(alta|media|baja)$/i.test(verdict)) {
        verdicts[target.key] = verdict;
      }
    }
  }

  const decision = text.match(/DECISI[ÓO]N FINAL\s*[:\-–]\s*([^\n]+)/i)?.[1]?.trim() ?? null;
  return { scores, confidence, verdicts, decision };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const company = typeof body.company === "string" ? body.company.trim() : "";
    if (company.length < 2) {
      return new Response(JSON.stringify({ error: "company required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const website = typeof body.website === "string" ? body.website.trim().slice(0, 300) : "";
    const role = typeof body.role === "string" ? body.role.trim().slice(0, 200) : "";
    const jobDescription =
      typeof body.jobDescription === "string" ? body.jobDescription.trim().slice(0, 6000) : "";

    const payload = {
      company: company.slice(0, 120),
      website,
      role,
      job_description: jobDescription,
      mode: "target-company-scorecard",
      scorecard: SCORECARD_INSTRUCTIONS,
    };

    console.log(`evaluate-target-company: POST to n8n for "${company}"`);
    let res = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    let text = await res.text();
    console.log(`evaluate-target-company: n8n POST [${res.status}] length ${text.length}`);

    if (!res.ok && (res.status === 404 || res.status === 405)) {
      const url = new URL(N8N_WEBHOOK_URL);
      url.searchParams.set("company", payload.company);
      if (website) url.searchParams.set("website", website);
      if (role) url.searchParams.set("role", role);
      url.searchParams.set("mode", payload.mode);
      res = await fetch(url.toString(), { method: "GET" });
      text = await res.text();
      console.log(`evaluate-target-company: n8n GET [${res.status}] length ${text.length}`);
    }

    if (!res.ok) {
      console.error(`evaluate-target-company n8n error [${res.status}]: ${text.slice(0, 500)}`);
      return new Response(
        JSON.stringify({ error: "Evaluation webhook failed", status: res.status, details: text.slice(0, 800) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const clean = unwrap(text).replace(/\\n/g, "\n");
    const parsed = parseScorecard(clean);

    return new Response(JSON.stringify({ text: clean, ...parsed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("evaluate-target-company error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
