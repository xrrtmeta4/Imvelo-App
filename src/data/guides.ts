export interface Guide {
  slug: string;
  title: string;
  description: string;
  intro: string;
  sections: { heading: string; points: string[] }[];
}

export const guides: Guide[] = [
  {
    slug: "fall-armyworm-maize",
    title: "How to Identify and Control Fall Armyworm on Maize",
    description: "Spot fall armyworm damage on maize early and control it with scouting, natural enemies and correctly timed sprays. A practical guide for African farmers.",
    intro: "Fall armyworm is one of the most damaging maize pests in Africa. Catching it early, while larvae are small, makes control far easier and cheaper.",
    sections: [
      { heading: "Signs to look for", points: [
        "Small 'windowpane' patches on young leaves where larvae scrape the surface.",
        "Ragged holes in leaves and wet, sawdust-like droppings (frass) inside the funnel (whorl).",
        "Caterpillars with an upside-down 'Y' mark on the head and four dark dots in a square near the tail.",
      ]},
      { heading: "Scout every week", points: [
        "Walk a W-shape through the field and check about 50 plants.",
        "Look inside the whorl, where larvae hide during the day.",
        "Act early when many young plants show fresh damage, before larvae grow large.",
      ]},
      { heading: "Control options", points: [
        "Crush egg masses and small larvae by hand on small plots.",
        "Encourage natural enemies such as ants, earwigs and parasitic wasps by avoiding unnecessary broad sprays.",
        "Plant early and at the same time as neighbours so the crop passes its weakest stage together.",
        "If spraying, use a product registered for fall armyworm in your country, aim into the whorl, and spray early morning or late afternoon. Always follow the label and wear protective clothing.",
      ]},
      { heading: "Use your phone", points: [
        "Take a photo with the Imvelo Chloe AI Scanner to confirm the pest and get treatment advice.",
      ]},
    ],
  },
  {
    slug: "when-to-plant-maize-eswatini",
    title: "When to Plant Maize in Eswatini",
    description: "Best maize planting times for Eswatini's Highveld, Middleveld and Lowveld, and how to use rainfall and soil moisture to plant at the right moment.",
    intro: "In Eswatini, maize is mostly planted with the start of the summer rains. The right week depends on your region and on when reliable rain actually arrives.",
    sections: [
      { heading: "General planting window", points: [
        "Most farmers plant between October and December, once the summer rains have started.",
        "Higher, cooler areas (Highveld) usually plant earlier in the season; hotter, drier areas (Lowveld) depend heavily on when good rain arrives.",
        "Check with your local extension officer for recommended varieties and dates for your area.",
      ]},
      { heading: "Plant on moisture, not the calendar", points: [
        "Wait until the soil is moist to at least a hand's depth after good rain.",
        "Avoid planting into dry soil after a single light shower — seeds may sprout and then die.",
        "Very late planting raises the risk of drought stress at flowering and of pest damage.",
      ]},
      { heading: "Before you plant", points: [
        "Prepare land and buy certified seed and fertilizer early.",
        "Choose a variety that suits your season length; short-season varieties suit drier areas.",
      ]},
      { heading: "Use your phone", points: [
        "The Imvelo weather page shows the 7-day rainfall forecast so you can time planting.",
      ]},
    ],
  },
  {
    slug: "tomato-early-late-blight",
    title: "Tomato Blight: How to Tell Early Blight from Late Blight",
    description: "Learn the difference between early and late blight on tomatoes, how they spread, and simple steps to prevent and manage them.",
    intro: "Blight can wipe out a tomato crop quickly, especially in warm, wet weather. Knowing which type you have helps you respond correctly.",
    sections: [
      { heading: "Early blight", points: [
        "Brown spots with rings like a target, usually starting on older, lower leaves.",
        "Leaves turn yellow around the spots and drop off.",
      ]},
      { heading: "Late blight", points: [
        "Large, dark, water-soaked patches on leaves and stems that spread fast in cool, wet conditions.",
        "White fuzzy growth may appear under leaves in damp weather; fruit get greasy brown patches.",
      ]},
      { heading: "Prevention", points: [
        "Rotate crops — avoid planting tomatoes, potatoes or peppers in the same spot each year.",
        "Space and stake plants so leaves dry quickly; water at the base, not over the leaves.",
        "Remove and destroy infected leaves; do not compost them.",
        "Where needed, use a fungicide registered for tomatoes, following the label carefully.",
      ]},
      { heading: "Use your phone", points: [
        "Scan a leaf with the Imvelo Chloe AI Scanner to identify the disease.",
      ]},
    ],
  },
  {
    slug: "drought-farming-tips",
    title: "Farming Through Drought: Water-Saving Tips for Small Farms",
    description: "Practical ways to protect crops and soil during drought: mulching, water harvesting, drought-tolerant crops and smart watering times.",
    intro: "Droughts are becoming more frequent across southern Africa. Small changes in how you manage soil and water can protect your harvest.",
    sections: [
      { heading: "Keep water in the soil", points: [
        "Cover the soil with mulch (dry grass, crop residue) to cut evaporation.",
        "Reduce ploughing; disturbed soil dries out faster.",
        "Add compost or manure to help soil hold more water.",
      ]},
      { heading: "Catch and store rain", points: [
        "Dig planting basins or ridges across slopes to hold rainwater.",
        "Collect roof water in tanks or drums for garden crops and animals.",
      ]},
      { heading: "Water smarter", points: [
        "Water early in the morning or late afternoon to reduce loss.",
        "Water at the roots; drip lines or bottles save a lot of water.",
      ]},
      { heading: "Choose tough crops", points: [
        "Consider drought-tolerant crops such as sorghum, millet, cowpeas and sweet potato.",
      ]},
      { heading: "Use your phone", points: [
        "Imvelo Smart Irrigation looks at the week's rain forecast to suggest when to water.",
      ]},
    ],
  },
  {
    slug: "soil-health-small-farms",
    title: "How to Improve Soil Health on a Small Farm",
    description: "Simple, low-cost ways to build healthy, fertile soil: compost, crop rotation, cover crops and knowing when to test your soil.",
    intro: "Healthy soil grows healthy crops. Most improvements cost little and pay back over several seasons.",
    sections: [
      { heading: "Feed the soil", points: [
        "Add compost and well-rotted manure every season.",
        "Leave crop residues on the field instead of burning them.",
      ]},
      { heading: "Rotate and cover", points: [
        "Rotate maize with legumes such as beans or groundnuts, which add nitrogen.",
        "Grow cover crops between seasons so the soil is never bare.",
      ]},
      { heading: "Know your soil", points: [
        "A soil test shows pH and nutrients so you buy only the fertilizer you need.",
        "Very acidic soils may need lime — ask your extension office for testing.",
      ]},
      { heading: "Use your phone", points: [
        "The Imvelo soil scanner gives a quick photo-based soil check and advice.",
      ]},
    ],
  },
];
