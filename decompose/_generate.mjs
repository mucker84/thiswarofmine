// Generátor podstránek /decompose/<slug>/index.html
// Spuštění:  node _generate.mjs
// Data = jediný zdroj pravdy. Uprav ITEMS/šablonu → přegeneruj vše.
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const GA = 'G-QQTD6TPJ7R';

// ── DATA: 20 předmětů. article = 2 unikátní odstavce (proč). faqs = 2 unikátní.
//    alt = eko alternativa (affiliate). related = 4 slugy pro prolinkování.
const ITEMS = [
  {
    slug:'paper-tissue', emoji:'🤧', name:'paper tissue', display:'Paper tissue',
    answer:'2–4 weeks', years:0.06, unit:'but bleached paper leaves chemicals behind',
    article:[
      'A <strong>paper tissue decomposes in about 2 to 4 weeks</strong> — one of the fastest of all everyday waste. Made from short cellulose fibres, it soaks up moisture and microorganisms break it apart quickly.',
      'The catch is what it carries: most tissues are <strong>bleached and treated</strong>, so as they break down they release small amounts of chlorine compounds and dyes into the soil. And a tissue tossed on a trail still looks like litter for those few weeks.'
    ],
    faqs:[
      ['Can I compost paper tissues?','Clean, unbleached tissues compost well. Avoid composting tissues used with cleaning chemicals, oils, or that are heavily dyed.'],
      ['Do paper tissues break down in landfill?','More slowly than in open nature — landfills lack the oxygen and moisture needed, so even a tissue can persist far longer than a few weeks.']
    ],
    alt:{title:'Switch to a cotton handkerchief',text:'A single reusable handkerchief replaces thousands of tissues over its life — no bleaching chemicals, no waste.',cta:'See cotton handkerchiefs →'},
    related:['apple-core','cotton-sock','bamboo-toothpick','plastic-bag']
  },
  {
    slug:'apple-core', emoji:'🍎', name:'apple core', display:'Apple core',
    answer:'2 months', years:0.17, unit:'fast — but roadside litter still harms wildlife',
    article:[
      'An <strong>apple core decomposes in around 2 months</strong>. As biodegradable food waste, nature reclaims it easily — insects, microbes, and fungi all feed on it and return its nutrients to the soil.',
      'That doesn\'t make it harmless to toss on the roadside. A rotting core <strong>attracts birds and small mammals toward traffic</strong>, and in dry or cold conditions it can linger much longer than two months, looking like litter the whole time.'
    ],
    faqs:[
      ['Is it OK to throw an apple core in nature?','It biodegrades, but it\'s still best avoided near roads and trails — it draws wildlife into danger and isn\'t native to every ecosystem.'],
      ['How fast does an apple core compost?','In an active compost heap, a matter of weeks. On cold bare ground it can take several months.']
    ],
    alt:{title:'Compost your food scraps',text:'A small kitchen composter turns cores and peels into soil instead of roadside litter — a simple countertop bin does the job.',cta:'See kitchen composters →'},
    related:['paper-tissue','bamboo-toothpick','cotton-sock','chewing-gum']
  },
  {
    slug:'cotton-sock', emoji:'🧦', name:'cotton sock', display:'Cotton sock',
    answer:'1–5 years', years:3, unit:'natural fibre, but dyes and elastane slow it',
    article:[
      'A <strong>cotton sock takes 1 to 5 years to decompose</strong>. Pure cotton is a natural fibre that microbes can break down, but a sock is never pure cotton.',
      'The <strong>elastane in the cuff, synthetic reinforcement in the heel and toe, and the dyes</strong> all resist decomposition. In a wet environment the process slows further, and the stretchy parts can outlast the cotton by years.'
    ],
    faqs:[
      ['Do cotton socks biodegrade?','The cotton portion does, but the elastic and synthetic reinforcements do not fully break down and leave microplastics behind.'],
      ['Can old socks be recycled?','Yes — textile recycling programs accept worn socks. It\'s far better than sending them to landfill or nature.']
    ],
    alt:{title:'Choose organic, undyed socks',text:'Socks made from organic cotton without synthetic blends break down cleanly and skip the microplastic problem.',cta:'See organic cotton socks →'},
    related:['denim-jacket','sneakers','leather-handbag','paper-tissue']
  },
  {
    slug:'cigarette-butt', emoji:'🚬', name:'cigarette butt', display:'Cigarette butt',
    answer:'15 years', years:15, unit:'the filter is plastic, not cotton',
    article:[
      'A <strong>cigarette butt takes about 15 years to decompose</strong>, and it is the single most littered item on Earth — trillions are dropped every year.',
      'Most people assume the filter is cotton. It isn\'t. It\'s <strong>cellulose acetate, a form of plastic</strong>, packed with thousands of toxic chemicals trapped from the smoke. A single butt can contaminate litres of water, poisoning fish and soil as it slowly breaks into microplastics.'
    ],
    faqs:[
      ['Are cigarette filters biodegradable?','No. Cellulose acetate is a plastic. It fragments into microplastics rather than truly biodegrading.'],
      ['Why are cigarette butts so harmful?','They leach nicotine, heavy metals, and other toxins into water and soil — one butt can foul many litres of water.']
    ],
    alt:{title:'Carry a pocket ashtray',text:'A pocket ashtray keeps butts out of streets, drains, and beaches until you can bin them properly.',cta:'See pocket ashtrays →'},
    related:['chewing-gum','plastic-straw','plastic-bag','condom']
  },
  {
    slug:'plastic-bag', emoji:'🛍️', name:'plastic bag', display:'Plastic bag',
    answer:'20 years', years:20, unit:'breaks into microplastics long before it decomposes',
    article:[
      'A <strong>plastic bag takes roughly 20 years to decompose</strong> — but long before that it has already broken into <strong>microplastics</strong> that scatter across land and water.',
      'Lightweight and easily blown by wind, plastic bags travel far from where they\'re dropped. In the ocean, animals mistake them for jellyfish and eat them. A bag used for minutes can harm wildlife for two decades.'
    ],
    faqs:[
      ['Are plastic bags biodegradable?','Standard polyethylene bags are not. "Biodegradable" bags usually need industrial conditions and rarely break down in open nature.'],
      ['How can I reduce plastic bag waste?','Carry a reusable bag. A single sturdy tote replaces hundreds of single-use bags each year.']
    ],
    alt:{title:'Switch to reusable tote bags',text:'One durable tote replaces hundreds of single-use plastic bags a year — and never becomes 20-year litter.',cta:'See reusable tote bags →'},
    related:['plastic-bottle','plastic-straw','ziplock-bag','cigarette-butt']
  },
  {
    slug:'paper-coffee-cup', emoji:'☕', name:'paper coffee cup', display:'Paper coffee cup',
    answer:'30 years', years:30, unit:'it\'s lined with plastic film inside',
    article:[
      'A <strong>paper coffee cup takes around 30 years to decompose</strong> — far longer than "paper" suggests, because it isn\'t really just paper.',
      'To hold liquid, the inside is <strong>lined with a thin polyethylene film</strong>. That plastic layer stops the cup from composting and makes it hard to recycle in standard paper streams. Billions of these cups are thrown away every year.'
    ],
    faqs:[
      ['Are paper coffee cups recyclable?','Only at special facilities that can separate the plastic lining. Most curbside programs reject them.'],
      ['Why don\'t paper cups compost?','The polyethylene lining blocks water and microbes, so the cup can\'t break down like plain paper.']
    ],
    alt:{title:'Bring a reusable coffee cup',text:'A reusable travel mug skips the plastic lining entirely — many cafés even give a discount for bringing your own.',cta:'See reusable coffee cups →'},
    related:['plastic-straw','plastic-bottle','plastic-bag','chewing-gum']
  },
  {
    slug:'condom', emoji:'🩺', name:'condom', display:'Condom (latex)',
    answer:'30 years', years:30, unit:'latex, but additives slow it dramatically',
    article:[
      'A <strong>latex condom takes about 30 years to decompose</strong>. Natural rubber latex sounds biodegradable, but a finished condom is far from natural.',
      'It\'s treated with <strong>stabilisers, lubricants, and sometimes spermicides</strong> that dramatically slow decomposition. Many condoms also contain synthetic materials. They should never be flushed — they clog systems and end up in waterways.'
    ],
    faqs:[
      ['Are condoms biodegradable?','Natural latex condoms slowly break down, but additives extend this to decades. Polyurethane condoms don\'t biodegrade at all.'],
      ['Can you flush a condom?','Never. Condoms don\'t break down in water and cause blockages and marine pollution. Always bin them.']
    ],
    alt:{title:'Dispose of them properly',text:'The greenest step is simply binning condoms rather than flushing — reusable menstrual and protection products help elsewhere too.',cta:'See eco personal-care →'},
    related:['chewing-gum','cigarette-butt','plastic-straw','cotton-sock']
  },
  {
    slug:'chewing-gum', emoji:'🍬', name:'chewing gum', display:'Chewing gum',
    answer:'50 years', years:50, unit:'modern gum is essentially plastic',
    article:[
      'A piece of <strong>chewing gum takes up to 50 years to decompose</strong> — a fact that surprises most people, because gum feels soft and harmless.',
      'Modern gum base is made from <strong>synthetic polymers — effectively plastic and petroleum derivatives</strong>. That\'s why gum stuck to pavements is so stubborn: it doesn\'t rot, it just hardens and stays. Gum is one of the most common street pollutants after cigarette butts.'
    ],
    faqs:[
      ['Is chewing gum biodegradable?','Conventional gum is not — its base is synthetic rubber. Some brands now sell plastic-free, biodegradable gum.'],
      ['Why is gum so hard to remove from streets?','Because it\'s plastic-based, it bonds to surfaces and resists weathering, needing special equipment to clean.']
    ],
    alt:{title:'Try plastic-free chewing gum',text:'Natural chicle-based gums biodegrade in a fraction of the time and don\'t leave plastic on the pavement.',cta:'See plastic-free gum →'},
    related:['cigarette-butt','condom','plastic-straw','paper-coffee-cup']
  },
  {
    slug:'aluminum-can', emoji:'🥫', name:'aluminum can', display:'Aluminum can',
    answer:'200 years', years:200, unit:'infinitely recyclable — a waste to litter',
    article:[
      'An <strong>aluminum can takes around 200 years to break down</strong> in nature. But that number tells only half the story — because aluminum is one material that never needs to be wasted.',
      'Aluminum can be <strong>recycled endlessly with no loss of quality</strong>, using a fraction of the energy of making it new. A littered can is therefore a double loss: 200 years of pollution, and a valuable resource thrown away. A recycled can is often back on a shelf within weeks.'
    ],
    faqs:[
      ['Is aluminum recyclable forever?','Yes. Unlike plastic, aluminum can be melted and reused indefinitely without degrading.'],
      ['How much energy does recycling a can save?','Recycling aluminum uses about 95% less energy than producing it from raw ore.']
    ],
    alt:{title:'Recycle every can',text:'The best "alternative" is simple: never let a can reach nature. A dedicated recycling bin makes it effortless.',cta:'See recycling bins →'},
    related:['glass-bottle','plastic-bottle','car-tire','plastic-straw']
  },
  {
    slug:'plastic-straw', emoji:'🥤', name:'plastic straw', display:'Plastic straw',
    answer:'200 years', years:200, unit:'too small to recycle, deadly to sea life',
    article:[
      'A <strong>plastic straw takes about 200 years to decompose</strong>. Used for minutes, it pollutes for two centuries.',
      'Straws are <strong>too small and light to be captured by most recycling systems</strong>, so they slip through and end up in waterways. They\'re among the most common items found in the stomachs and airways of marine animals. Their tiny size makes them one of the hardest plastics to clean up.'
    ],
    faqs:[
      ['Are plastic straws recyclable?','Rarely. They\'re too small for sorting machines and usually end up as litter or landfill.'],
      ['What can I use instead of plastic straws?','Reusable stainless steel, glass, or silicone straws — or simply skip the straw entirely.']
    ],
    alt:{title:'Switch to reusable straws',text:'A set of steel or silicone straws lasts for years and never becomes 200-year ocean waste.',cta:'See reusable straws →'},
    related:['plastic-bottle','plastic-bag','paper-coffee-cup','fishing-line']
  },
  {
    slug:'plastic-bottle', emoji:'🧴', name:'plastic bottle', display:'Plastic bottle',
    answer:'450 years', years:450, unit:'and never fully disappears',
    article:[
      'A single-use <strong>plastic (PET) bottle takes roughly 450 years to decompose</strong> when left in nature. But that number hides the real problem: a plastic bottle never truly returns to the earth. Instead of biodegrading, it slowly <strong>fragments into microplastics</strong> that stay in the water, soil, and food chain effectively forever.',
      'Plastic bottles are made from <strong>polyethylene terephthalate (PET)</strong> — a synthetic polymer engineered to be durable. Those same properties make it almost impossible for microorganisms to break down, so instead of biodegrading it photodegrades: sunlight makes it brittle and it cracks into ever-smaller pieces. The plastic doesn\'t disappear — it just becomes invisible.'
    ],
    faqs:[
      ['Do plastic bottles ever fully decompose?','Not on any human timescale. A PET bottle breaks into microplastics that remain in the environment indefinitely.'],
      ['Is a plastic bottle biodegradable?','No. Standard PET is not biodegradable. Most "bioplastic" bottles only break down in industrial composting, not in nature.']
    ],
    alt:{title:'Switch to a reusable bottle',text:'A single stainless-steel or glass bottle replaces hundreds of PET bottles a year — and never becomes 450-year waste.',cta:'See reusable bottles →'},
    related:['plastic-bag','glass-bottle','aluminum-can','plastic-straw']
  },
  {
    slug:'fishing-line', emoji:'🎣', name:'nylon fishing line', display:'Nylon fishing line',
    answer:'600 years', years:600, unit:'an invisible trap for fish and birds',
    article:[
      'Discarded <strong>nylon fishing line takes around 600 years to decompose</strong>. Thin, transparent, and incredibly strong, it becomes an invisible hazard the moment it\'s left behind.',
      'Birds, fish, and marine mammals get <strong>entangled and cannot free themselves</strong>. Because it\'s nearly invisible in water, lost line keeps trapping wildlife for centuries — a phenomenon known as "ghost fishing." Anglers who leave line on banks and in water create traps that outlast their great-great-grandchildren.'
    ],
    faqs:[
      ['Is fishing line recyclable?','Specialised monofilament recycling programs exist at many marinas and tackle shops — never leave line in nature.'],
      ['Why is lost fishing line so dangerous?','It entangles animals invisibly and persists for centuries, continuing to trap wildlife long after it\'s discarded.']
    ],
    alt:{title:'Use a line recycling bin',text:'Many fishing spots have monofilament recycling tubes. Biodegradable line options are also emerging for anglers.',cta:'See eco fishing gear →'},
    related:['plastic-straw','plastic-bottle','ziplock-bag','wireless-earbud']
  },
  {
    slug:'ziplock-bag', emoji:'🔒', name:'ziplock bag', display:'Ziplock bag',
    answer:'1,000 years', years:1000, unit:'multilayer plastic that barely breaks down',
    article:[
      'A <strong>ziplock bag takes about 1,000 years to decompose</strong>. Its convenience hides a stubborn environmental cost.',
      'Made from <strong>LDPE plastic with a multilayer, sealable structure</strong>, it resists breaking down and instead crumbles slowly into microplastics. The seal and thicker walls make it even more durable than a regular plastic bag — meaning it lasts, and pollutes, far longer.'
    ],
    faqs:[
      ['Can ziplock bags be recycled?','Some store drop-off programs accept clean LDPE bags, but they\'re not accepted in most curbside recycling.'],
      ['Can I reuse ziplock bags?','Yes — washing and reusing them many times is the simplest way to cut their impact.']
    ],
    alt:{title:'Switch to reusable silicone bags',text:'Reusable silicone food bags replace thousands of single-use ziplocks and last for years of washing.',cta:'See reusable food bags →'},
    related:['plastic-bag','plastic-bottle','plastic-straw','fishing-line']
  },
  {
    slug:'wireless-earbud', emoji:'🎧', name:'wireless earbud', display:'Wireless earbud',
    answer:'1,000+ years', years:1000, unit:'e-waste that never breaks down',
    article:[
      'A <strong>wireless earbud takes 1,000 years or more to decompose</strong> — if it ever really does. It represents the e-waste problem of our generation.',
      'Each bud is a <strong>composite of plastics, metals, and a sealed lithium battery</strong>. No single part breaks down naturally, and the battery makes it hazardous waste. Designed to be nearly impossible to repair or recycle, hundreds of millions are discarded as they wear out.'
    ],
    faqs:[
      ['Can wireless earbuds be recycled?','Only through specialised e-waste programs — never in household recycling, because of the lithium battery.'],
      ['Why are earbuds bad for the environment?','They combine plastics, metals, and batteries into a tiny sealed unit that can\'t be separated or repaired.']
    ],
    alt:{title:'Choose repairable audio',text:'Wired or repairable headphones last far longer and avoid the throwaway battery problem entirely.',cta:'See durable headphones →'},
    related:['car-tire','glass-bottle','fishing-line','ziplock-bag']
  },
  {
    slug:'glass-bottle', emoji:'🍾', name:'glass bottle', display:'Glass bottle',
    answer:'4,000+ years', years:4000, unit:'essentially indestructible — but endlessly recyclable',
    article:[
      'A <strong>glass bottle takes 4,000 years or more to break down</strong> in nature — effectively, it is indestructible on any human timescale. Some estimates put it at a million years.',
      'The good news: glass is <strong>one of the most recyclable materials that exists</strong>. It can be melted and reformed endlessly without losing quality. So while a littered bottle is nearly eternal, a recycled one becomes a new bottle again and again with almost no waste.'
    ],
    faqs:[
      ['Does glass ever decompose?','Not meaningfully. Glass persists for thousands of years, but it is inert — it doesn\'t leach toxins like plastic.'],
      ['Is recycling glass worth it?','Absolutely. Glass recycles infinitely without quality loss, saving raw materials and energy each cycle.']
    ],
    alt:{title:'Recycle and reuse glass',text:'Glass jars and bottles are endlessly reusable at home and infinitely recyclable — keep them out of nature.',cta:'See reusable glass storage →'},
    related:['plastic-bottle','aluminum-can','car-tire','wireless-earbud']
  },
  {
    slug:'car-tire', emoji:'🚗', name:'car tire', display:'Car tire',
    answer:'2,000 years', years:2000, unit:'vulcanized rubber that barely decomposes',
    article:[
      'A <strong>car tire takes around 2,000 years to decompose</strong>. Every year, over a billion tires reach the end of their life, creating one of the world\'s largest waste streams.',
      'Tires are made from <strong>vulcanized rubber</strong> — chemically cross-linked so it won\'t break down. As they wear during driving, they also shed <strong>microplastic particles</strong> that are now a major source of ocean pollution. Piled tires trap water, breed mosquitoes, and pose serious fire risks.'
    ],
    faqs:[
      ['Can tires be recycled?','Yes — into playground surfaces, road material, and fuel. But collection rates still lag behind the billion discarded yearly.'],
      ['Are tires a source of microplastics?','Yes. Tire wear is one of the largest single contributors of microplastics entering rivers and oceans.']
    ],
    alt:{title:'Recycle worn tires',text:'Tire retailers and recycling centres accept old tires for reuse as surfaces and fuel — never dump or burn them.',cta:'See tire-recycled products →'},
    related:['aluminum-can','glass-bottle','wireless-earbud','sneakers']
  },
  {
    slug:'bamboo-toothpick', emoji:'🌿', name:'bamboo toothpick', display:'Bamboo toothpick',
    answer:'3–6 months', years:0.37, unit:'a genuinely compostable choice',
    article:[
      'A <strong>bamboo toothpick decomposes in just 3 to 6 months</strong> — a rare example of a single-use item that returns cleanly to nature.',
      'Bamboo is <strong>one of the fastest-growing plants on Earth</strong> and composts easily without additives or coatings. That makes bamboo cutlery, toothpicks, and skewers a genuinely good alternative to their plastic equivalents, which last for centuries.'
    ],
    faqs:[
      ['Is bamboo compostable?','Yes. Untreated bamboo breaks down in home compost within months, returning nutrients to the soil.'],
      ['Is bamboo really eco-friendly?','Grown responsibly, yes — it regrows fast, needs no replanting, and composts cleanly at the end of life.']
    ],
    alt:{title:'Choose bamboo over plastic',text:'From toothpicks to cutlery, swapping plastic for bamboo means your single-use items compost in months, not centuries.',cta:'See bamboo everyday items →'},
    related:['apple-core','paper-tissue','cotton-sock','plastic-straw']
  },
  {
    slug:'sneakers', emoji:'👟', name:'sneakers', display:'Sneakers',
    answer:'50–80 years', years:65, unit:'a composite that decomposes in layers',
    article:[
      'A pair of <strong>sneakers takes 50 to 80 years to decompose</strong>. Their comfort comes from combining many materials — and that\'s exactly what makes them so hard to break down.',
      'A typical shoe blends a <strong>rubber sole, synthetic fabric, EVA foam cushioning, glue, and metal eyelets</strong>. Each element decomposes at a different rate, and the synthetic foam and rubber can persist for decades. Over 20 billion pairs are made each year, most ending in landfill.'
    ],
    faqs:[
      ['Can sneakers be recycled?','Some brands run take-back programs that grind old shoes into sports surfaces and new products.'],
      ['Why do sneakers take so long to break down?','They\'re a composite of rubber, foam, and synthetic textiles — none of which biodegrade quickly.']
    ],
    alt:{title:'Choose durable or recyclable shoes',text:'Longer-lasting shoes and brands with recycling schemes keep pairs out of landfill for far longer.',cta:'See sustainable footwear →'},
    related:['leather-handbag','denim-jacket','car-tire','cotton-sock']
  },
  {
    slug:'leather-handbag', emoji:'👜', name:'leather handbag', display:'Leather handbag',
    answer:'25–40 years', years:32, unit:'chemical tanning slows natural decay',
    article:[
      'A <strong>leather handbag takes 25 to 40 years to decompose</strong>. Leather is an animal product, so you might expect it to break down quickly — but industrial leather is heavily processed.',
      'Most leather is <strong>chrome-tanned</strong>, treated with chemicals that stop it from rotting (that\'s the whole point of tanning). Those same chemicals <strong>slow decomposition and can contaminate soil</strong> with heavy metals as the bag finally breaks down.'
    ],
    faqs:[
      ['Does leather biodegrade?','Vegetable-tanned leather breaks down reasonably well; chrome-tanned leather resists decay and can pollute soil.'],
      ['Is leather eco-friendly?','It depends on tanning. Traditional veg-tanned leather is far greener than conventional chrome-tanned leather.']
    ],
    alt:{title:'Choose veg-tanned or repair old bags',text:'Vegetable-tanned leather ages and decomposes more naturally — and repairing a good bag beats replacing it.',cta:'See veg-tanned leather goods →'},
    related:['sneakers','denim-jacket','cotton-sock','glass-bottle']
  },
  {
    slug:'denim-jacket', emoji:'🧥', name:'denim jacket', display:'Denim jacket',
    answer:'10–12 months', years:1, unit:'cotton is quick — the rivets and dye aren\'t',
    article:[
      'A <strong>denim jacket takes about 10 to 12 months to decompose</strong> — surprisingly fast, because denim is mostly cotton.',
      'But the cotton is the only quick part. The <strong>synthetic thread, metal rivets and buttons, and indigo dyes</strong> remain in the soil long after the fabric is gone. Modern stretch denim also contains elastane, which leaves microplastics behind. Fast fashion means billions of garments are discarded yearly.'
    ],
    faqs:[
      ['Is denim biodegradable?','The cotton is, within about a year. Rivets, synthetic thread, and dyes persist much longer.'],
      ['How can I dispose of old denim responsibly?','Donate, upcycle, or use textile recycling — denim is often turned into insulation and new fabric.']
    ],
    alt:{title:'Buy less, choose pure cotton',text:'Durable, pure-cotton denim without stretch blends lasts longer and breaks down more cleanly at the end.',cta:'See sustainable denim →'},
    related:['cotton-sock','sneakers','leather-handbag','paper-tissue']
  },
];

const byslug = Object.fromEntries(ITEMS.map(i=>[i.slug,i]));
// Title Case pro nadpisy (Glass Bottle), zachovává zkratky jako PET
const titleCase = s => s.split(' ').map(w => /^[A-Z]{2,}$/.test(w) ? w : w.charAt(0).toUpperCase()+w.slice(1)).join(' ');
// a/an podle první hlásky (PET se čte "pí-i-tí" → an)
const article = s => (/^[aeiou]/i.test(s) || /^(pet|xl|hr)/i.test(s)) ? 'an' : 'a';

// mini-timeline: vezmi 3 referenční body kolem daného předmětu (rychlý, tento, pomalý extrém)
function miniTimeline(item){
  const refs = [
    {emoji:'🍎',name:'Apple core',label:'2 months',years:0.17,color:'#4a9b7a'},
    {emoji:'🛍️',name:'Plastic bag',label:'20 years',years:20,color:'#6b8fcf'},
    {emoji:item.emoji,name:item.display,label:item.answer,years:item.years,color:'#dc5000',me:true},
    {emoji:'🍾',name:'Glass bottle',label:'4,000+ years',years:4000,color:'#b05090'},
  ];
  // odstraň duplicity roku (kdyby předmět byl sám jablko/lahev)
  const seen=new Set(); const rows=[];
  for(const r of refs){ if(seen.has(r.name)&&!r.me) continue; seen.add(r.name); rows.push(r); }
  const max=4000;
  return rows.map(r=>{
    const w = Math.max(2, Math.round((Math.log10(r.years+1)/Math.log10(max+1))*100));
    return `<div class="mini-row">
          <span class="mini-label">${r.label}</span>
          <div class="mini-bar-wrap"><div class="mini-bar" style="width:${w}%; background:${r.color};"></div></div>
          <span class="mini-name${r.me?' mini-this':''}">${r.emoji} ${r.name}</span>
        </div>`;
  }).join('\n        ');
}

function faqJson(item){
  const art = article(item.name);
  const q = [
    { q:`How long does ${art} ${item.name} take to decompose?`, a:`${titleCase(art)} ${item.name} takes approximately ${item.answer} to decompose in nature.` },
    ...item.faqs.map(([q,a])=>({q,a}))
  ];
  return JSON.stringify({
    '@context':'https://schema.org','@type':'FAQPage',
    mainEntity:q.map(x=>({'@type':'Question',name:x.q,acceptedAnswer:{'@type':'Answer',text:x.a}}))
  },null,2);
}

function breadcrumbJson(item){
  return JSON.stringify({
    '@context':'https://schema.org','@type':'BreadcrumbList',
    itemListElement:[
      {'@type':'ListItem',position:1,name:'Decomposition Time',item:'https://7ax.fun/decompose/'},
      {'@type':'ListItem',position:2,name:item.display,item:`https://7ax.fun/decompose/${item.slug}/`}
    ]
  },null,2);
}

function relatedLinks(item){
  return item.related.map(s=>{
    const r=byslug[s]; if(!r) return '';
    return `<a class="related-link" href="/decompose/${r.slug}/">
            <span class="related-emoji">${r.emoji}</span>
            <span><span class="related-name">${r.display}</span><br><span class="related-time">${r.answer}</span></span>
          </a>`;
  }).join('\n          ');
}

function page(item){
  const art = article(item.name);
  const titleQ = `How Long Does ${art} ${titleCase(item.name)} Take to Decompose?`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <title>${titleQ} (${item.answer}) | 7ax.fun</title>
  <meta name="description" content="${titleCase(art)} ${item.name} takes about ${item.answer} to decompose in nature. Here's why, what it means for the environment, and greener alternatives.">
  <meta name="keywords" content="how long does ${art} ${item.name} take to decompose, ${item.name} decomposition time, ${item.name} decompose, decomposition time chart">
  <meta name="author" content="7ax.fun">
  <link rel="canonical" href="https://7ax.fun/decompose/${item.slug}/">

  <meta property="og:title" content="${titleQ} (${item.answer})">
  <meta property="og:description" content="${titleCase(art)} ${item.name} takes about ${item.answer} to decompose — ${item.unit}.">
  <meta property="og:type" content="article">
  <meta property="og:url" content="https://7ax.fun/decompose/${item.slug}/">
  <meta property="og:locale" content="en_US">

  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${titleQ}">
  <meta name="twitter:description" content="About ${item.answer} — ${item.unit}.">

  <script type="application/ld+json">
${faqJson(item)}
  </script>
  <script type="application/ld+json">
${breadcrumbJson(item)}
  </script>

  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${GA}');
  </script>

  <link rel="stylesheet" href="/decompose/detail.css">
</head>
<body>

  <nav>
    <a href="https://7ax.fun" class="nav-wordmark">7AX.FUN</a>
    <div class="nav-right">
      <span class="nav-label">Ecology &amp; Nature</span>
      <button class="theme-toggle" id="themeToggle" aria-label="Toggle light / dark mode">
        <span class="theme-toggle-icon" id="themeIcon">☀️</span>
        <span id="themeLabel">Light</span>
      </button>
    </div>
  </nav>

  <main>

    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="/decompose/">Decomposition Time</a>
      <span class="breadcrumb-sep">/</span>
      ${item.display}
    </nav>

    <div class="answer-hero">
      <div class="answer-emoji">${item.emoji}</div>
      <h1 class="answer-question">${titleQ}</h1>
      <div class="answer-big">${item.answer}</div>
      <div class="answer-unit">${item.unit}</div>
    </div>

    <article class="prose">
      <p>${item.article[0]}</p>

      <h2>Why does it take this long?</h2>
      <p>${item.article[1]}</p>

      <h3>Where it sits on the timeline</h3>
      <div class="mini-timeline">
        ${miniTimeline(item)}
      </div>

      <div class="aff-box">
        <div class="aff-label">Greener alternative</div>
        <div class="aff-title">${item.alt.title}</div>
        <div class="aff-text">${item.alt.text}</div>
        <a class="aff-btn" href="#" rel="sponsored nofollow" target="_blank">${item.alt.cta}</a>
        <div class="aff-disclosure">This is an affiliate link — we may earn a small commission at no extra cost to you.</div>
      </div>

      <a class="back-to-tool" href="/decompose/">← Compare it with other items on the interactive chart</a>

      <div class="ad-slot" aria-hidden="true">Ad</div>

      <h2>Frequently asked questions</h2>
      <div class="faq-item">
        <div class="faq-q">How long does ${art} ${item.name} take to decompose?</div>
        <div class="faq-a">${titleCase(art)} ${item.name} takes approximately ${item.answer} to decompose in nature.</div>
      </div>
      <div class="faq-item">
        <div class="faq-q">${item.faqs[0][0]}</div>
        <div class="faq-a">${item.faqs[0][1]}</div>
      </div>
      <div class="faq-item">
        <div class="faq-q">${item.faqs[1][0]}</div>
        <div class="faq-a">${item.faqs[1][1]}</div>
      </div>

      <div class="related-section">
        <div class="related-title">Compare with other items</div>
        <div class="related-grid">
          ${relatedLinks(item)}
        </div>
      </div>
    </article>

  </main>

  <footer>
    <div class="footer-inner">
      <a href="https://7ax.fun" class="footer-link">7ax.fun</a>
      <span class="footer-sep">·</span>
      <a href="/decompose/" class="footer-link">Decomposition Time</a>
      <p class="footer-note">Data are approximate — actual decomposition time depends on environmental conditions.</p>
      <p class="footer-note" style="margin-top:14px;font-size:12px;color:var(--muted);">built with <a href="https://mucker.cz/love.html" target="_blank" class="footer-heart">♥</a> and claude code · 2026 · <a href="https://7ax.fun" target="_blank" rel="noopener" style="color:inherit; text-decoration:underline; text-underline-offset:2px;">7ax.fun</a></p>
    </div>
  </footer>

  <script src="/decompose/detail.js"></script>

</body>
</html>
`;
}

// generuj podstránky
let count=0;
for(const item of ITEMS){
  const dir = `${__dirname}/${item.slug}`;
  mkdirSync(dir,{recursive:true});
  writeFileSync(`${dir}/index.html`, page(item), 'utf8');
  count++;
}

// sitemap.xml (hub + 20 podstránek)
const today = new Date().toISOString().slice(0,10);
const urls = [
  { loc:'https://7ax.fun/decompose/', pri:'1.0' },
  ...ITEMS.map(i=>({ loc:`https://7ax.fun/decompose/${i.slug}/`, pri:'0.8' }))
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u=>`  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${u.pri}</priority>
  </url>`).join('\n')}
</urlset>
`;
writeFileSync(`${__dirname}/sitemap.xml`, sitemap, 'utf8');

console.log(`Vygenerováno ${count} podstránek + sitemap.xml (${urls.length} URL).`);
