import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://vagsdb.github.io",
  "http://localhost:3000",
]);

function cors(origin: string | null) {
  const safeOrigin = origin && allowedOrigins.has(origin) ? origin : "https://vagsdb.github.io";
  return {
    "Access-Control-Allow-Origin": safeOrigin,
    "Access-Control-Allow-Headers": "content-type, apikey, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

const STOP = new Set([
  "the","and","for","with","that","this","from","have","into","more","someone","people","person","about","what","kind","right","now",
  "και","που","για","των","την","τον","στο","στη","στην","ένα","μια","μου","με","από","είναι","θελω","θέλω","κάποιον","ανθρωπο","άνθρωπο",
]);

const THEMES: Record<string, string[]> = {
  depth: ["deep","depth","meaning","meaningful","questions","ideas","philosophy","βαθυ","βάθος","νοημα","νόημα","ιδεες","ιδέες"],
  challenge: ["challenge","challenging","debate","opposite","different","disagree","προκλη","διαφων","αντιθε","διαφορε"],
  visual: ["visual","image","design","architecture","photography","art","οπτικ","εικον","σχεδι","αρχιτεκτον","φωτογραφ","τεχνη","τέχνη"],
  science: ["science","research","biology","medicine","technology","data","ai","επιστημ","ερευν","βιολογ","ιατρ","τεχνολογ","δεδομεν"],
  city: ["city","athens","place","places","walk","street","neighborhood","πολη","πόλη","αθηνα","αθήνα","μερος","μέρος","βόλτα","δρομο"],
  culture: ["book","books","music","film","cinema","culture","museum","exhibition","βιβλ","μουσικ","ταιν","σινεμ","κουλτουρ","μουσει","εκθεση","έκθεση"],
  making: ["make","making","build","create","craft","project","φτιαχν","δημιουργ","κατασκευ","εργο","έργο"],
  quiet: ["quiet","calm","slow","gentle","subtle","silence","ησυχ","ηρεμ","αργ","διακριτ"],
  play: ["play","playful","fun","humor","laugh","spontaneous","παιχνιδ","χιουμορ","γέλιο","γελιο","αυθορμη"],
  learning: ["learn","learning","curious","curiosity","discover","explore","μαθ","περιεργ","ανακαλυ","εξερευν"],
  conviviality: ["convivial","warm","warmth","easy","ease","coffee","food","meal","table","drink","hospitality","together","company","παρεα","παρέα","ζεστ","καφε","καφέ","φαγητ","τραπεζ","ποτο","ποτό","φιλοξεν","μαζι","μαζί"],
};

function normalize(value: unknown) {
  return String(value ?? "").toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "");
}

function tokens(value: unknown) {
  return new Set(
    normalize(value)
      .replace(/[^\p{L}\p{N}\s-]/gu, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2 && !STOP.has(token)),
  );
}

function themeSet(value: unknown) {
  const text = normalize(value);
  const result = new Set<string>();
  for (const [theme, terms] of Object.entries(THEMES)) {
    if (terms.some((term) => text.includes(normalize(term)))) result.add(theme);
  }
  return result;
}

function jaccard(left: Set<string>, right: Set<string>) {
  if (!left.size || !right.size) return 0;
  let common = 0;
  left.forEach((item) => { if (right.has(item)) common += 1; });
  return common / (left.size + right.size - common);
}

function similarity(a: unknown, b: unknown) {
  return Math.max(jaccard(themeSet(a), themeSet(b)), jaccard(tokens(a), tokens(b)) * 0.7);
}

function list(value: unknown) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string").join(" ") : "";
}

function positiveText(model: Record<string, any>) {
  return [
    model?.curiosity?.label,
    model?.curiosity?.evidence,
    model?.desiredExposure?.label,
    model?.desiredExposure?.evidence,
    model?.conversationStyle?.label,
    model?.temperament?.label,
    list(model?.wants),
    model?.socialIntention,
  ].filter(Boolean).join(" ");
}

function desireText(model: Record<string, any>) {
  return [model?.desiredExposure?.evidence, list(model?.wants), model?.socialIntention].filter(Boolean).join(" ");
}

function notThisText(model: Record<string, any>) {
  return list(model?.notThis);
}

function convivialityStrength(semantic: unknown, model: Record<string, any>) {
  const text = `${JSON.stringify(semantic ?? {})} ${positiveText(model)}`;
  const themes = themeSet(text);
  return themes.has("conviviality") ? 1 : 0;
}

function scorePair(a: Record<string, any>, aSemantic: unknown, b: Record<string, any>, bSemantic: unknown) {
  const aPositive = positiveText(a);
  const bPositive = positiveText(b);
  const sharedRaw = similarity(aPositive, bPositive);
  const sharedCore = Math.round(sharedRaw * 100);

  const aToB = similarity(desireText(a), bPositive);
  const bToA = similarity(desireText(b), aPositive);
  const intentionFit = Math.round(((aToB + bToA) / 2) * 100);
  const reciprocity = Math.round(((0.6 * aToB + 0.4 * sharedRaw + 0.6 * bToA + 0.4 * sharedRaw) / 2) * 100);

  const divergence = Math.round(Math.min(85, 45 + (1 - sharedRaw) * 38));
  const boundaryRaw = Math.max(similarity(notThisText(a), bPositive), similarity(notThisText(b), aPositive));
  const boundaryPenalty = Math.round(boundaryRaw * 100);

  const conviviality = convivialityStrength(aSemantic, a) && convivialityStrength(bSemantic, b)
    ? 82
    : convivialityStrength(aSemantic, a) || convivialityStrength(bSemantic, b)
      ? 58
      : 42;

  const total = Math.max(0, Math.min(100, Math.round(
    0.23 * sharedCore +
    0.17 * divergence +
    0.32 * reciprocity +
    0.18 * intentionFit +
    0.10 * conviviality -
    0.45 * boundaryPenalty
  )));

  const themesA = themeSet(aPositive);
  const themesB = themeSet(bPositive);
  const sharedThemes = [...themesA].filter((theme) => themesB.has(theme));
  const uniqueA = [...themesA].filter((theme) => !themesB.has(theme));
  const uniqueB = [...themesB].filter((theme) => !themesA.has(theme));

  return {
    total,
    sharedCore,
    reciprocity,
    intentionFit,
    boundaryPenalty,
    sharedTheme: sharedThemes[0] ?? null,
    divergenceA: uniqueA[0] ?? null,
    divergenceB: uniqueB[0] ?? null,
  };
}

function humanTheme(theme: string | null) {
  const labels: Record<string, string> = {
    depth: "depth rather than small talk",
    challenge: "ideas that can survive disagreement",
    visual: "a visual way of noticing the world",
    science: "curiosity about how things work",
    city: "the overlooked texture of the city",
    culture: "culture as something lived, not collected",
    making: "making things rather than only discussing them",
    quiet: "a quieter kind of attention",
    play: "playfulness without performance",
    learning: "curiosity and discovery",
    conviviality: "warm, unforced company",
  };
  return theme ? labels[theme] ?? theme : "a similar kind of attention";
}

function hypothesis(score: ReturnType<typeof scorePair>) {
  const shared = humanTheme(score.sharedTheme);
  const difference = score.divergenceA || score.divergenceB
    ? "you seem to arrive there from noticeably different directions"
    : "your similarities do not look identical";
  return `This one is unusual. You seem to share ${shared}, but ${difference}. I think the difference between you may be more interesting than the similarity.`;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = { ...cors(origin), "Content-Type": "application/json" };

  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });

  try {
    const { participantId, secret } = await req.json();
    if (typeof participantId !== "string" || typeof secret !== "string" || secret.length < 32) {
      return new Response(JSON.stringify({ error: "Invalid pilot identity" }), { status: 400, headers });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    const { data: allowed, error: authError } = await admin.rpc("bond_pilot_secret_ok", {
      p_participant_id: participantId,
      p_secret: secret,
    });
    if (authError || allowed !== true) {
      return new Response(JSON.stringify({ error: "Pilot identity not recognized" }), { status: 401, headers });
    }

    const { data: requester, error: requesterError } = await admin
      .from("pilot_participants")
      .select("id, city, active, pilot_models(model_json, semantic_json)")
      .eq("id", participantId)
      .single();

    if (requesterError || !requester?.pilot_models) {
      return new Response(JSON.stringify({ matched: false, reason: "Complete your Bond signal first." }), { headers });
    }

    const requesterModel = Array.isArray(requester.pilot_models) ? requester.pilot_models[0] : requester.pilot_models;

    const { data: existing } = await admin
      .from("pilot_introductions")
      .select("participant_a, participant_b")
      .or(`participant_a.eq.${participantId},participant_b.eq.${participantId}`);

    const seen = new Set<string>();
    (existing ?? []).forEach((row: any) => {
      seen.add(row.participant_a === participantId ? row.participant_b : row.participant_a);
    });

    const { data: candidates, error: candidatesError } = await admin
      .from("pilot_participants")
      .select("id, city, active, pilot_models(model_json, semantic_json)")
      .eq("city", requester.city)
      .eq("active", true)
      .neq("id", participantId)
      .limit(100);

    if (candidatesError) throw candidatesError;

    let best: { id: string; score: ReturnType<typeof scorePair> } | null = null;
    for (const candidate of candidates ?? []) {
      if (seen.has(candidate.id) || !candidate.pilot_models) continue;
      const candidateModel = Array.isArray(candidate.pilot_models) ? candidate.pilot_models[0] : candidate.pilot_models;
      if (!candidateModel?.model_json) continue;
      const scored = scorePair(
        requesterModel.model_json,
        requesterModel.semantic_json,
        candidateModel.model_json,
        candidateModel.semantic_json,
      );
      const clears = scored.total >= 46 &&
        (scored.sharedCore >= 12 || scored.intentionFit >= 20) &&
        scored.reciprocity >= 16 &&
        scored.boundaryPenalty < 40;
      if (clears && (!best || scored.total > best.score.total)) best = { id: candidate.id, score: scored };
    }

    if (!best) {
      return new Response(JSON.stringify({ matched: false, reason: "Nothing worth interrupting you for yet." }), { headers });
    }

    const { error: insertError } = await admin.from("pilot_introductions").insert({
      participant_a: participantId,
      participant_b: best.id,
      hypothesis: hypothesis(best.score),
      score: best.score.total,
    });

    if (insertError && insertError.code !== "23505") throw insertError;

    return new Response(JSON.stringify({ matched: true }), { headers });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Bond could not check the signal right now." }), { status: 500, headers });
  }
});
